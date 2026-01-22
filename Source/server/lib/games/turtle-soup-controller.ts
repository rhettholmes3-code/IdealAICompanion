import { GameEngine } from './game-engine';
import { GameSessionManager } from './session-manager';
import { BailianService } from '../bailian';
import { sendZegoRequest } from '../zego';
import { ConfigManager } from '../config';
import path from 'path';
import fs from 'fs';

interface JudgeResult {
    thinking: string;
    progress_score: number;
    kips_hit: number[];
    needs_hint: boolean;
    hint_urgency?: 'high' | 'low';
    hint_content?: string;
}

export class TurtleSoupController {
    private engine: GameEngine;
    private sessionManager: GameSessionManager;
    // private bailian: BailianService; // Created per request now

    constructor() {
        this.engine = new GameEngine();
        this.sessionManager = GameSessionManager.getInstance();
    }

    /**
     * 分析用户输入 (被 API 调用)
     * NOTE: Async
     */
    async analyzeUserInput(roomId: string, instanceId: string, userInput: string, history: any[], agentId: string = 'xiaoye') {
        const session = await this.sessionManager.getSession(roomId);
        if (!session || session.status !== 'playing' || session.gameType !== 'turtle_soup') {
            console.warn('[TurtleSoupController] No active game for analysis');
            return { success: false, message: 'No active turtle soup game' };
        }

        const puzzle = session.currentPuzzle as any;
        if (!puzzle) return { success: false, error: 'Puzzle data missing' };

        console.log(`[TurtleSoupController] Analyzing input: "${userInput}" for room ${roomId}`);

        // 1. 获取 Agent 配置
        const config = ConfigManager.getInstance().getAgentConfig(agentId);
        if (!config || !config.bailian || !config.agent_info.llm) {
            console.error(`[TurtleSoupController] Agent ${agentId} missing config`);
            return { success: false, error: 'Service configuration missing' };
        }

        // 关键修复：直接调用 LLM (Qwen-Plus) 而不是调用 Bailian App (Memory Agent)
        // 使用 bailian.apiKey (有效Key) + llm.Url (兼容接口)
        const apiKey = config.bailian.apiKey;
        const llmUrl = config.agent_info.llm.Url || "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions";
        const model = config.agent_info.llm.Model || "qwen-plus";

        // 2. 构造 Judge Prompt
        const promptSystem = this.generateJudgePrompt(puzzle, history, session.kipsHit || []);

        // 3. 调用 LLM (OpenAI Compatible)
        let outputText = "";
        try {
            console.log(`[TurtleSoupController] Calling LLM (${model})...`);
            const llmRes = await fetch(llmUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: model,
                    messages: [
                        { role: 'system', content: promptSystem },
                        { role: 'user', content: '请根据上述规则和上下文，对用户的最新输入进行判定，并输出 JSON。' }
                    ],
                    temperature: 0.1 // Logic task needs low temperature
                })
            });

            if (!llmRes.ok) {
                const errText = await llmRes.text();
                throw new Error(`LLM API Error: ${llmRes.status} ${errText}`);
            }

            const llmData = await llmRes.json();
            outputText = llmData.choices?.[0]?.message?.content || "";

        } catch (e: any) {
            console.error('[TurtleSoupController] LLM Request Failed:', e.message);
            return { success: false, error: e.message };
        }

        console.log('================================================================');
        console.log('[TurtleSoupController] RAW Judge LLM Output:');
        console.log(outputText);
        console.log('================================================================');

        // 3. 解析结果
        const result = this.parseJudgeOutput(outputText);
        if (!result) {
            console.error('[TurtleSoupController] Failed to parse Judge output');
            return { success: false, error: 'Invalid JSON from Judge' };
        }

        console.log('[TurtleSoupController] Judge result:', result);

        // 4. 更新游戏状态
        let stateChanged = false;

        // Prepare DB Update Payload
        const dbUpdates: any = {};

        // 更新进度
        if (result.progress_score !== undefined && result.progress_score !== session.progressScore) {
            dbUpdates.progressScore = result.progress_score;
            stateChanged = true;
        }

        // 更新 KIPs
        if (result.kips_hit && Array.isArray(result.kips_hit)) {
            const oldHits = session.kipsHit || [];
            // Merge unique hits and ensure they are numbers
            const newHits = Array.from(new Set([...oldHits, ...result.kips_hit.map(n => Number(n))])).sort((a, b) => a - b);

            if (newHits.length !== oldHits.length) {
                dbUpdates.kipsHit = newHits;
                stateChanged = true;
                // 检测是否刚刚解锁了新线索
                // TODO: calculate newlyUnlockedIndices if needed for animation push
            }
        }

        // Cache last analysis for Silence Detector
        // Always update this so silence detector sees latest state
        dbUpdates.lastAnalysis = result;

        // Persist updates to DB
        if (Object.keys(dbUpdates).length > 0) {
            await this.sessionManager.updateSession(roomId, dbUpdates);
        }

        // 5. 推送 UI 更新 (仅当状态变化时)
        if (stateChanged) {
            await this.pushGameState(roomId);
        }

        // 6. [Deleted] 播放裁判回复 (已废弃，由 Fast Agent 负责)

        // 7. 处理额外提示 (跑偏严重时追加提示)
        if (result.needs_hint && result.hint_urgency === 'high' && result.hint_content) {
            console.log('[TurtleSoupController] Injecting urgent hint:', result.hint_content);
            await this.injectHint(instanceId, result.hint_content);

            // 清除缓存，避免沉默检测再次重复播放
            // We need to update DB again to clear needs_hint in lastAnalysis
            await this.sessionManager.updateSession(roomId, {
                lastAnalysis: { ...result, needs_hint: false, hint_content: undefined }
            });
        }

        return { success: true, result };
    }

    /**
     * 注入提示 (TTS 直读)
     */
    async injectHint(instanceId: string, hintContent: string) {
        try {
            await sendZegoRequest('SendAgentInstanceTTS', {
                AgentInstanceId: instanceId,
                Text: hintContent,
                Priority: 'Medium',
                SamePriorityOption: 'Enqueue'
            });
        } catch (e) {
            console.error('[TurtleSoupController] Failed to inject hint:', e);
        }
    }

    /**
     * 推送游戏状态到前端
     * NOTE: Async
     */
    async pushGameState(roomId: string) {
        // Fetch FRESH state because we might have just updated it
        const session = await this.sessionManager.getSession(roomId);
        if (!session || !session.currentPuzzle) return;

        const puzzle = session.currentPuzzle as any;

        // 格式化 KIPs (name, content, unlocked)
        const kips = (puzzle.key_points || []).map((content: string, idx: number) => {
            const isHit = (session.kipsHit || []).includes(idx);
            return {
                name: `线索 ${idx + 1}`,
                content: content,
                unlocked: isHit
            };
        });

        const payload = {
            cmd: 1002,
            data: {
                type: 'game_state_update',
                gameType: 'turtle_soup',
                payload: {
                    // Optimized: Only send dynamic data to avoid 1024 byte limit of SendCustomCommand
                    // Static data (title, story, kips content) is already loaded on GAME_START
                    progress: session.progressScore || 0,
                    kips_hit: session.kipsHit || []
                }
            }
        };

        try {
            await sendZegoRequest('SendBroadcastMessage', {
                RoomId: roomId,
                UserId: 'server_judge',
                UserName: 'Server Judge',
                MessageCategory: 2, // 1: System, 2: Chat
                MessageContent: JSON.stringify(payload)
            }, 'https://rtc-api.zego.im', 'GET');
            console.log('[TurtleSoupController] Pushed game state via SendBroadcastMessage');
        } catch (e) {
            console.error('[TurtleSoupController] Failed to push state:', e);
        }
    }

    private generateJudgePrompt(puzzle: any, history: any[], kipsHit: number[]): string {
        const templatePath = path.join(process.cwd(), 'config/prompts/games/turtle_soup_judge.xml');
        let template = fs.readFileSync(templatePath, 'utf-8');

        // Construct Context data
        const puzzleJson = JSON.stringify(puzzle);
        const historyStr = history.map(h => `${h.role}: ${h.content}`).join('\n');
        const kipsHitStr = JSON.stringify(kipsHit);

        return template
            .replace('{{PUZZLE_JSON}}', puzzleJson)
            .replace('{{CONVERSATION_HISTORY}}', historyStr)
            .replace('{{KIPS_HIT}}', kipsHitStr);
    }

    private parseJudgeOutput(text: string): JudgeResult | null {
        try {
            // Extract JSON
            const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/```\s*([\s\S]*?)\s*```/) || text.match(/\{[\s\S]*\}/);
            const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : text;
            return JSON.parse(jsonStr);
        } catch (e) {
            console.error('JSON Parse Error:', e);
            return null;
        }
    }
}

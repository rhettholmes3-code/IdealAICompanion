import { sendZegoRequest } from './zego';
import { GameEngine } from './games/game-engine';
import { PromptManager } from './prompt-manager'; // 需要用于 Prompt 刷新
import { ConfigManager } from './config';
// import { TaskAgent } from './tasks'; // Removed unused


export interface DispatchParams {
    action: string;
    params?: any;
    instanceId: string;
    roomId: string;
}

export interface DispatchResult {
    success: boolean;
    message?: string;
    data?: any;
}

export class ActionDispatcher {
    private gameEngine: GameEngine;

    constructor() {
        this.gameEngine = new GameEngine();
    }

    /**
     * 分发处理 Action 请求
     */
    async dispatch(payload: DispatchParams): Promise<DispatchResult> {
        console.log(`[Dispatcher] Received action: ${payload.action}`, payload);

        let resultMessage = '';
        let resultData: any = null;

        try {
            switch (payload.action) {
                case 'NEWS':
                    resultMessage = await this.handleNews(payload.params?.type);
                    break;

                // Game Actions Wrappers -> Enforce Prompt Update
                case 'GAME':
                    let gameTypeParam = typeof payload.params?.gameType === 'string' ? payload.params.gameType.trim() : payload.params?.gameType;
                    // Alias mapping
                    const GAME_ALIASES: Record<string, string> = {
                        '海龟汤': 'turtle_soup',
                        '猜谜': 'riddle',
                        '成语接龙': 'idiom_chain'
                    };
                    if (gameTypeParam && GAME_ALIASES[gameTypeParam]) {
                        gameTypeParam = GAME_ALIASES[gameTypeParam];
                    }

                    await this.executeGameAction(payload, async () => {
                        // 1. Start Game Engine
                        const gameResult = await this.handleGameStart(gameTypeParam, payload.roomId);
                        resultData = gameResult.data; // Frontend needs this for UI

                        // 2. Force AI Broadcast (High Priority) using TTS
                        // 直接朗读 Intro 文本，避开 Fast Agent 的 Prompt 限制
                        // 添加容错：即使 TTS 失败，也不应阻断游戏启动数据的返回
                        try {
                            await sendZegoRequest('SendAgentInstanceTTS', {
                                AgentInstanceId: payload.instanceId,
                                Text: gameResult.data.intro,
                                Priority: "Medium",
                                SamePriorityOption: "Enqueue"
                            });
                        } catch (ttsError) {
                            console.error('[ActionDispatcher] TTS Broadcast failed:', ttsError);
                            // Optional: Fallback to LLM or just ignore
                        }
                        return ""; // Broadcast handles the response
                    });
                    break;

                case 'GAME_PAUSE':
                    await this.executeGameAction(payload, () => this.handleGamePause(payload.roomId));
                    break;
                case 'GAME_RESUME':
                    await this.executeGameAction(payload, () => this.handleGameResume(payload.roomId));
                    break;
                case 'GAME_END':
                    await this.executeGameAction(payload, () => this.handleGameEnd(payload.roomId), {
                        Priority: 'High',
                        SamePriorityOption: 'Interrupt' // Critical: Stop all queued hints/chat
                    });
                    break;

                // 任务类型 (v2.2.0)
                case 'TASK':
                    const taskType = payload.params?.taskType || payload.params?.type;
                    const taskResult = await this.handleTask(taskType, payload);
                    resultData = taskResult;
                    break;

                default:
                    console.warn(`[Dispatcher] Unknown action: ${payload.action}`);
                    return { success: false, message: 'Unknown action' };
            }

            // Generic result sending (if executeGameAction didn't already send it via wrapper logic, 
            // but here we might have duplicate sends if we are not careful. 
            // The wrapper below sends the resultResult TO the agent.
            // So we don't need to do it here for Game actions.

            if (resultMessage && !payload.action.startsWith('GAME')) {
                await this.sendResultToAgent(payload.instanceId, resultMessage);
            }

            return { success: true, message: resultMessage, data: resultData };

        } catch (error) {
            console.error('[Dispatcher] Error:', error);
            const errorMsg = error instanceof Error ? error.message : '未知错误';
            const humanizedError = `[系统指令] 后台任务执行遇到问题（原因：${errorMsg}）。请用委婉、抱歉的语气告知用户刚才的请求没能完成，并建议换个话题。`;
            await this.sendResultToAgent(payload.instanceId, humanizedError);
            return { success: false, message: errorMsg };
        }
    }

    /**
     * Higher-Order Function: Enforce Prompt Update for Game Actions
     */
    private async executeGameAction(payload: DispatchParams, actionLogic: () => Promise<string>, ttsOptions?: any) {
        // 1. Execute Core Logic
        const message = await actionLogic();

        // 2. Send Result to Agent (if not empty)
        if (message) {
            await this.sendResultToAgent(payload.instanceId, message, ttsOptions);
        }

        // 3. MANDATORY: Update Agent Prompt State
        // This ensures the LLM always knows the current game state (rules, phase)
        await this.updateAgentPromptState(payload.instanceId, payload.roomId);
    }

    private async handleNews(type: string = '综合'): Promise<string> {
        // TODO: Phase 3 实现 NewsService
        return `[系统消息 - 新闻查询完成]\n已为你整理今日[${type}]热点：\n1. AI 技术持续突破，多智能体架构成趋势。\n2. 科技巨头发布新一代芯片。\n3. ...\n\n请用自然语言向用户播报以上内容。`;
    }

    private async handleGameStart(gameType: string, roomId: string): Promise<{ message: string; data: any }> {
        const result = await this.gameEngine.startGame(roomId, gameType as any);
        if (!result.success) {
            throw new Error(result.message);
        }

        console.log(`[Dispatcher] Game Started. Puzzle: ${result.data.puzzle.substring(0, 20)}...`);

        return {
            message: "", // Message handled by dispatch layer with High Priority
            data: result.data
        };
    }

    private async handleGamePause(roomId: string): Promise<string> {
        return `[系统消息]\n${await this.gameEngine.pauseGame(roomId)} `;
    }

    private async handleGameResume(roomId: string): Promise<string> {
        return `[系统消息]\n${await this.gameEngine.resumeGame(roomId)} `;
    }

    private async handleGameEnd(roomId: string): Promise<string> {
        return `[系统消息]\n${await this.gameEngine.endGame(roomId)} `;
    }

    /**
     * 处理任务类型 Action (v2.2.0)
     */
    private async handleTask(taskType: string, payload: DispatchParams): Promise<any> {
        console.log(`[Dispatcher] Handling task: ${taskType}`);

        // 根据任务类型执行
        let result;
        switch (taskType) {
            case 'weather':
                // v2.2.0: 使用新的 WeatherExecutor (WebSearch MCP)
                const { WeatherExecutor } = await import('./tasks/executors/weather-executor');
                const weatherExecutor = new WeatherExecutor();
                const location = payload.params?.location || '北京';
                result = await weatherExecutor.execute(location);
                break;
            default:
                throw new Error(`Unknown task type: ${taskType}`);
        }

        // 生成人设化播报文本并注入到 LLM
        if (result.success && result.data) {
            const { BroadcastManager } = await import('./tasks/broadcast-manager');
            const broadcastManager = BroadcastManager.getInstance();
            await broadcastManager.broadcastResult(payload.instanceId, result);
        }

        return result;
    }

    // --- Core: SendAgentInstanceLLM ---

    private async sendResultToAgent(instanceId: string, content: string, options?: any) {
        console.log(`[Dispatcher] Sending result to agent ${instanceId}: `, content.substring(0, 50) + '...');

        await sendZegoRequest('SendAgentInstanceLLM', {
            AgentInstanceId: instanceId,
            Text: content,
            Priority: options?.Priority || 'Medium',
            SamePriorityOption: options?.SamePriorityOption || 'Enqueue',
            AddAnswerToHistory: true
        });
    }

    // --- Core: UpdateAgentInstance (用于同步 Prompt 状态) ---
    private async updateAgentPromptState(instanceId: string, roomId: string, userId?: string, agentId: string = 'xiaoye') {
        const promptManager = PromptManager.getInstance();

        // 获取当前活跃的游戏类型 (Split-Brain 模式)
        // NOTE: Async
        const gameType = await this.gameEngine.getCurrentGameType(roomId);

        // 确定场景类型：如果有活跃游戏，则为 game，否则为 chat
        const sceneType: 'chat' | 'game' | 'task' = gameType ? 'game' : 'chat';

        const overrides: any = {};

        if (gameType) {
            overrides.GAME_TYPE = gameType;
            // 注入游戏专用变量 (TITLE, CONTENT 等)
            // NOTE: Async
            const gameVars = await this.gameEngine.getGamePromptVariables(roomId);
            Object.assign(overrides, gameVars);
        } else {
            // 非 Split-Brain 模式或 Chat 模式，尝试获取通用游戏状态
            // NOTE: Async
            const gameStatePrompt = await this.gameEngine.getGameStatePrompt(roomId);
            overrides.GAME_STATE = gameStatePrompt || '';
        }

        // 注入用户记忆（确保场景切换不丢失）
        if (userId) {
            // Fix import and async usage
            const { MemoryManager } = await import('./memory-manager');
            const memoryManager = MemoryManager.getInstance();
            // NOTE: Async
            const userMemory = await memoryManager.getUserMemory(userId, agentId);
            if (userMemory) {
                overrides.TARGET_USER = userMemory.targetUser;
                overrides.RELATIONSHIP_EVOLUTION = userMemory.relationshipEvolution;
            }
        }

        // 使用新 API 生成 Prompt
        const systemPrompt = promptManager.generateFinalPrompt(agentId, sceneType, overrides);

        console.log(`[Dispatcher] Updating agent prompt state for ${instanceId} (Scene: ${sceneType})`);

        // 获取 Agent 配置以填充必填字段
        const configManager = ConfigManager.getInstance();
        const config = configManager.getAgentConfig(agentId || 'xiaoye');

        if (!config) {
            console.error(`[Dispatcher] Failed to load config for agent ${agentId}`);
            return;
        }

        // 确保 LLM 配置完整，并处理潜在的字段缺失或大小写问题
        const llmConfig = config.agent_info?.llm || (config as any).llm;

        if (!llmConfig) {
            console.error(`[Dispatcher] LLM config not found in agent config for: ${agentId}`);
            return;
        }

        const vendor = llmConfig.Vendor || (llmConfig as any).vendor;
        const model = llmConfig.Model || (llmConfig as any).model;
        const url = llmConfig.Url || (llmConfig as any).url;
        const apiKey = llmConfig.ApiKey || (llmConfig as any).apiKey;

        if (!vendor || !model) {
            console.error(`[Dispatcher] LLM config missing Vendor/Model:`, llmConfig);
            return;
        }

        console.log(`[Dispatcher] Updating agent with LLM config: Vendor=${vendor}, Model=${model}`);

        await sendZegoRequest('UpdateAgentInstance', {
            AgentInstanceId: instanceId,
            LLM: {
                Vendor: vendor,
                Url: url,
                ApiKey: apiKey,
                Model: model,
                SystemPrompt: systemPrompt
            }
        });
    }
}

import { GameSessionManager, GameState } from './session-manager';
import fs from 'fs';
import path from 'path';

export class GameEngine {
    private sessionManager: GameSessionManager;

    constructor() {
        this.sessionManager = GameSessionManager.getInstance();
    }

    /**
     * Helper to get session (for debugging)
     */
    async getSession(roomId: string) {
        return await this.sessionManager.getSession(roomId);
    }

    /**
     * 获取当前活跃的游戏类型 (状态为 playing 时)
     * NOTE: Now Async
     */
    async getCurrentGameType(roomId: string): Promise<string | undefined> {
        const session = await this.sessionManager.getSession(roomId);
        if (session && session.status === 'playing') {
            return session.gameType;
        }
        return undefined;
    }

    /**
     * 获取游戏 Prompt 变量
     * NOTE: Now Async
     */
    async getGamePromptVariables(roomId: string): Promise<Record<string, string>> {
        const session = await this.sessionManager.getSession(roomId);
        if (!session || !session.currentPuzzle) return {};

        if (session.gameType === 'turtle_soup') {
            const puzzle = session.currentPuzzle as any;
            return {
                TITLE: puzzle.title,
                CONTENT: puzzle.content,
                ANSWER: puzzle.answer
            };
        }
        return {};
    }

    /**
     * 开始游戏
     * NOTE: Now Async
     */
    async startGame(roomId: string, gameType: 'turtle_soup' | 'riddle' | 'idiom_chain'): Promise<{ success: boolean; message: string; data?: any }> {
        // 1. 加载题库
        const bankPath = path.join(process.cwd(), 'config/games', `${gameType}.json`);
        if (!fs.existsSync(bankPath)) {
            return { success: false, message: `Game type ${gameType} not supported` };
        }

        const questions = JSON.parse(fs.readFileSync(bankPath, 'utf-8'));

        // 1.1 避免重复 (简易策略：读取当前 Session 看看上次是啥，或者随机直到不同)
        const currentSession = await this.sessionManager.getSession(roomId);

        // 🛡️ 防御逻辑：如果当前正在游戏中且未结束，禁止直接开始新游戏 (防止 AI 幻觉触发 Action)
        if (currentSession && currentSession.status === 'playing') {
            return {
                success: false,
                message: "当前游戏尚未结束，请先说完“不玩了”结束当前游戏。"
            };
        }

        let currentId = currentSession?.gameId;

        // 过滤掉当前的 ID (如果有多个题目)
        let availableQuestions = questions;
        if (currentId && questions.length > 1) {
            availableQuestions = questions.filter((q: any) => q.id !== currentId);
        }

        // 随机选一题
        const question = availableQuestions[Math.floor(Math.random() * availableQuestions.length)];

        // 2. 创建 Session
        // GameSessionManager.createSession sets status=idle by default, we update it immediately or let manager handle it?
        // Let's create then update.
        // Actually createSession logic in manager was: create with idle.

        let session = await this.sessionManager.createSession(roomId, gameType);
        if (!session) return { success: false, message: "Failed to create game session" };

        // Need to update local object AND DB
        const updates: Partial<GameState> = {
            status: 'playing',
            gameId: question.id
        };

        if (gameType === 'turtle_soup') {
            updates.currentPuzzle = {
                title: question.title,
                content: question.content,
                answer: question.answer,
                hints: question.hints
            };

            await this.sessionManager.updateSession(roomId, updates);

            return {
                success: true,
                message: "游戏已启动",
                data: {
                    id: question.id,
                    title: question.title, // Add title
                    story: question.content, // Map content to story for frontend
                    intro: `游戏开始！汤底是：${question.content}\n请开始提问吧！`,
                    puzzle: question.content, // Keep puzzle for backward compatibility if any
                    progress: 0,
                    hints: [],
                    kips: (question.key_points || []).map((kp: string, idx: number) => ({
                        name: `线索 ${idx + 1}`,
                        content: kp,
                        unlocked: false
                    }))
                }
            };
        } else if (gameType === 'riddle') {
            updates.currentRiddle = {
                question: question.question,
                answer: question.answer
            };

            await this.sessionManager.updateSession(roomId, updates);

            return {
                success: true,
                message: "游戏已启动",
                data: {
                    id: question.id,
                    intro: `猜谜开始！谜面是：${question.question}`,
                    puzzle: question.question
                }
            };
        } else if (gameType === 'idiom_chain') {
            updates.currentIdiom = {
                word: question.content,
                pinyin: question.pinyin
            };

            await this.sessionManager.updateSession(roomId, updates);

            return {
                success: true,
                message: "游戏已启动",
                data: {
                    id: question.id,
                    intro: `成语接龙开始！我先出：${question.content}。请接龙~`,
                    puzzle: question.content // Use 'puzzle' field to display start idiom in card
                }
            };
        }
        return { success: false, message: "Unknown game type" };
    }

    /**
     * 暂停游戏
     * NOTE: Now Async
     */
    async pauseGame(roomId: string): Promise<string> {
        const session = await this.sessionManager.getSession(roomId);
        if (!session || session.status !== 'playing') {
            return "当前没有正在进行的游戏，无法暂停。";
        }
        await this.sessionManager.updateSession(roomId, { status: 'paused' });
        return "游戏已暂停。随时告诉我“继续游戏”即可恢复。";
    }

    /**
     * 恢复游戏
     * NOTE: Now Async
     */
    async resumeGame(roomId: string): Promise<string> {
        const session = await this.sessionManager.getSession(roomId);
        if (!session) {
            return "没有找到可以恢复的游戏记录。";
        }
        if (session.status === 'playing') {
            return "游戏正在进行中，无需恢复。";
        }

        await this.sessionManager.updateSession(roomId, { status: 'playing' });

        // 构建回溯 Prompt
        let recap = "";
        if (session.gameType === 'turtle_soup') {
            recap = `刚才我们在玩海龟汤《${session.currentPuzzle?.title}》。汤底是：${session.currentPuzzle?.content}`;
        } else if (session.gameType === 'riddle') {
            recap = `刚才我们在猜谜。谜面是：${session.currentRiddle?.question}`;
        } else if (session.gameType === 'idiom_chain') {
            recap = `刚才我们在玩成语接龙，当前成语是：${session.currentIdiom?.word}`;
        }

        return `游戏已恢复！${recap}\n请继续。`;
    }

    /**
     * 结束游戏
     * NOTE: Now Async
     */
    async endGame(roomId: string): Promise<string> {
        const session = await this.sessionManager.getSession(roomId);
        if (!session) {
            return "当前没有游戏。";
        }

        let answerReveal = "";
        if (session.gameType === 'turtle_soup') {
            answerReveal = `汤底真相是：${session.currentPuzzle?.answer}`;
        } else if (session.gameType === 'riddle') {
            answerReveal = `谜底是：${session.currentRiddle?.answer}`;
        }
        // Idiom chain usually doesn't have a single "answer", just ends.

        await this.sessionManager.clearSession(roomId);
        return `游戏结束啦！${answerReveal}\n稍微休息一下吧~`;
    }

    /**
     * 获取当前游戏状态 Prompt (用于注入 L2/System Prompt)
     * NOTE: Now Async
     */
    async getGameStatePrompt(roomId: string): Promise<string> {
        const session = await this.sessionManager.getSession(roomId);
        if (!session || session.status !== 'playing') {
            return '';
        }

        const gameType = session.gameType;
        const configPath = path.join(process.cwd(), 'config/prompts/games', `${gameType}.xml`);

        if (!fs.existsSync(configPath)) {
            console.error(`Game prompt config not found: ${configPath}`);
            return '';
        }

        let template = fs.readFileSync(configPath, 'utf-8');

        // Dynamic Loading & Replacement
        if (gameType === 'turtle_soup') {
            const hints = (session.currentPuzzle as any)?.hints || [];
            const keyPoints = (session.currentPuzzle as any)?.key_points || [];
            template = template
                .replace('{{TITLE}}', session.currentPuzzle?.title || '')
                .replace('{{CONTENT}}', session.currentPuzzle?.content || '')
                .replace('{{ANSWER}}', session.currentPuzzle?.answer || '')
                .replace('{{KEY_POINTS}}', keyPoints.join('; '))
                .replace('{{HINTS}}', hints.join('; '));
        } else if (gameType === 'riddle') {
            template = template
                .replace('{{QUESTION}}', session.currentRiddle?.question || '')
                .replace('{{ANSWER}}', session.currentRiddle?.answer || '');
        } else if (gameType === 'idiom_chain') {
            template = template
                .replace('{{CURRENT_IDIOM}}', session.currentIdiom?.word || '');
        }

        return `<game_state>\n${template}\n</game_state>`;
    }

    /**
     * 获取沉默提示策略
     * NOTE: Now Async
     */
    async getHintStrategy(roomId: string, silenceLevel: 'medium' | 'long'): Promise<string> {
        const session = await this.sessionManager.getSession(roomId);
        if (!session || session.status !== 'playing') {
            return '';
        }

        // 增加提示计数
        // Must update to DB
        const newCount = (session.hintCount || 0) + 1;
        await this.sessionManager.updateSession(roomId, { hintCount: newCount });

        const count = newCount;

        if (session.gameType === 'turtle_soup') {
            const lastAnalysis = session.lastAnalysis;
            // 策略：如果 Judge 认为需要提示 (needs_hint=true)，则使用 Judge 生成的提示
            if (lastAnalysis && lastAnalysis.needs_hint && lastAnalysis.hint_content) {
                const hintContent = lastAnalysis.hint_content;
                // 清除缓存，避免重复播放
                await this.sessionManager.updateSession(roomId, {
                    lastAnalysis: { ...lastAnalysis, needs_hint: false, hint_content: undefined }
                });
                return `[TTS]${hintContent}`;
            }

            // 如果 Judge 没说要提示，给点鼓励
            if (silenceLevel === 'medium') {
                return "[TTS]你还在思考吗？不着急哦～细心一点，有没有漏掉什么细节？";
            } else {
                return "[TTS]是不是卡住了？要不试着换个角度想想？或者你可以直接问我。";
            }
        } else if (session.gameType === 'riddle') {
            // 猜谜
            if (silenceLevel === 'medium') {
                return "用户在思考。你可以轻声重复一遍谜面，或者用幽默的方式给一个关于谜底类型的模糊暗示。";
            } else {
                return "用户似乎难住了。请给出一个比较明显的提示，但尽量不要直接说出谜底，让他享受猜出的成就感。";
            }
        } else if (session.gameType === 'idiom_chain') {
            // 成语接龙
            return `用户暂时没有接上。请友善地鼓励他，或者提示当前成语"${session.currentIdiom?.word}"的最后一个字可以组什么词。如果他不想玩了，可以询问是否换个话题。`;
        }
        return '';
    }
}

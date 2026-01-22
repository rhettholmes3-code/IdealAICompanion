import dbConnect from '../db/client';
import { GameSession, IGameSession } from '../db/models';

export interface GameState {
    roomId: string; // 关联的 ZEGO 房间 ID
    gameType: 'turtle_soup' | 'riddle' | 'idiom_chain';
    // Game State
    startTimer?: any; // NOTE: runtime only, not persisted in DB
    gameId?: string; // 题目ID
    status: 'idle' | 'playing' | 'paused' | 'finished';

    // Split-Brain State
    kipsHit?: number[];        // Hit KIP indices
    progressScore?: number;    // Progress 0-100
    lastAnalysis?: any;        // Last Judge Result { needs_hint, hint_content, ... }

    // 海龟汤专用状态
    currentPuzzle?: {
        title: string;
        content: string;
        answer: string;
        hints?: string[];
    };

    // 猜谜专用状态
    currentRiddle?: {
        question: string;
        answer: string;
    };

    // 成语接龙专用状态
    currentIdiom?: {
        word: string;
        pinyin?: string;
    };

    history: GameHistoryItem[];
    hintCount?: number;
    createdAt: number;
    updatedAt: number;
}

export interface GameHistoryItem {
    role: 'user' | 'agent' | 'system';
    content: string;
    timestamp: number;
}

export class GameSessionManager {
    private static instance: GameSessionManager;
    // Removed: private sessions: Map<string, GameState>;

    private constructor() {
        // Removed: this.sessions = new Map();
    }

    static getInstance(): GameSessionManager {
        const globalKey = Symbol.for('GameSessionManager');
        if (!(globalThis as any)[globalKey]) {
            (globalThis as any)[globalKey] = new GameSessionManager();
        }
        return (globalThis as any)[globalKey];
    }

    /**
     * Get session from MongoDB
     * NOTE: Now Async
     */
    async getSession(roomId: string): Promise<GameState | null> {
        await dbConnect();
        try {
            const doc = await GameSession.findOne({ roomId }).lean();
            if (doc) {
                // Convert DB doc to GameState interface
                // We map fields manually or cast if structure matches
                return {
                    roomId: doc.roomId,
                    gameType: doc.gameType,
                    status: doc.status,
                    gameId: doc.gameId,
                    kipsHit: doc.kipsHit,
                    progressScore: doc.progressScore,
                    lastAnalysis: doc.lastAnalysis,
                    currentPuzzle: doc.currentPuzzle,
                    currentRiddle: doc.currentRiddle,
                    currentIdiom: doc.currentIdiom,
                    history: doc.history,
                    hintCount: doc.hintCount,
                    createdAt: doc.createdAt,
                    updatedAt: doc.updatedAt
                } as GameState;
            }
        } catch (e) {
            console.error(`[GameSessionManager] Failed to get session ${roomId}:`, e);
        }
        return null;
    }

    /**
     * Create new session in MongoDB
     * NOTE: Now Async
     */
    async createSession(roomId: string, gameType: 'turtle_soup' | 'riddle' | 'idiom_chain'): Promise<GameState | null> {
        await dbConnect();
        try {
            // Check if exists first? Or upsert?
            // Usually create implies a fresh start.
            // Let's delete existing if any to ensure clean slate
            await GameSession.deleteOne({ roomId });

            const sessionData = {
                roomId,
                gameType,
                status: 'idle',
                history: [],
                createdAt: Date.now(),
                updatedAt: Date.now()
            };

            const doc = await GameSession.create(sessionData);
            return {
                ...sessionData,
                // Add default optional fields for strict typing if needed
            } as GameState;
        } catch (e) {
            console.error(`[GameSessionManager] Failed to create session ${roomId}:`, e);
            return null;
        }
    }

    /**
     * Update session in MongoDB
     * NOTE: Now Async
     */
    async updateSession(roomId: string, updates: Partial<GameState>) {
        await dbConnect();
        try {
            // Separate fields that are NOT in DB schema (like startTimer)
            const { startTimer, ...dbUpdates } = updates;

            // WARN: startTimer will be lost in stateless env.
            // If logic relies on it, we need to handle it differently (or ignore for now as decided).

            await GameSession.findOneAndUpdate(
                { roomId },
                {
                    $set: {
                        ...dbUpdates,
                        updatedAt: Date.now()
                    }
                }
            );
        } catch (e) {
            console.error(`[GameSessionManager] Failed to update session ${roomId}:`, e);
        }
    }

    /**
     * Clear session
     * NOTE: Now Async
     */
    async clearSession(roomId: string) {
        await dbConnect();
        try {
            await GameSession.deleteOne({ roomId });
        } catch (e) {
            console.error(`[GameSessionManager] Failed to clear session ${roomId}:`, e);
        }
    }
}

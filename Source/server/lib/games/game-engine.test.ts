import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GameEngine } from './game-engine';
import { GameSessionManager } from './session-manager';
import fs from 'fs';
import path from 'path';

// Mock fs to avoid reading real config files during test if needed, 
// but integration test with real json is also fine and better. 
// Let's use real files since we just created them.

describe('GameEngine', () => {
    let engine: GameEngine;
    const roomId = 'test_room_123';

    beforeEach(() => {
        // Clear sessions
        (GameSessionManager.getInstance() as any).sessions.clear();
        engine = new GameEngine();
    });

    it('should start a turtle soup game', () => {
        const result = engine.startGame(roomId, 'turtle_soup');

        expect(result.success).toBe(true);
        expect(result.data.intro).toContain('汤底是');

        const session = GameSessionManager.getInstance().getSession(roomId);
        expect(session).toBeDefined();
        expect(session?.gameType).toBe('turtle_soup');
        expect(session?.status).toBe('playing');
        expect(session?.currentPuzzle).toBeDefined();
    });

    it('should generate correct game state prompt', () => {
        engine.startGame(roomId, 'turtle_soup');
        const prompt = engine.getGameStatePrompt(roomId);

        expect(prompt).toContain('<game_state>');
        expect(prompt).toContain('游戏类型: 海龟汤');
        expect(prompt).toContain('真相:'); // 确保注入了真相供 LLM 判断
    });

    it('should pause and resume game', () => {
        engine.startGame(roomId, 'turtle_soup');

        // Pause
        const pauseMsg = engine.pauseGame(roomId);
        expect(pauseMsg).toContain('已暂停');

        let session = GameSessionManager.getInstance().getSession(roomId);
        expect(session?.status).toBe('paused');

        // Checking prompt when paused - should be empty or indicate pause?
        // Current logic: getGameStatePrompt returns empty if not playing.
        expect(engine.getGameStatePrompt(roomId)).toBe('');

        // Resume
        const resumeMsg = engine.resumeGame(roomId);
        expect(resumeMsg).toContain('已恢复');

        session = GameSessionManager.getInstance().getSession(roomId);
        expect(session?.status).toBe('playing');

        // Prompt should be back
        expect(engine.getGameStatePrompt(roomId)).toContain('<game_state>');
    });

    it('should end game and clear session', () => {
        engine.startGame(roomId, 'turtle_soup');

        const endMsg = engine.endGame(roomId);
        expect(endMsg).toContain('游戏结束');
        expect(endMsg).toContain('真相是'); // Ensure answer is revealed

        const session = GameSessionManager.getInstance().getSession(roomId);
        expect(session).toBeUndefined();
    });
});

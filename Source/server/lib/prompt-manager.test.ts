import { describe, it, expect, beforeAll } from 'vitest';
import { PromptManager, getSystemPrompt } from './prompt-manager';
import path from 'path';

describe('PromptManager', () => {
    // 确保 config/prompts/xiaoye.xml 存在且可读
    // 实际运行路径可能是 Source/server，所以 process.cwd() 应该是正确的

    it('should render default prompt with time and location', () => {
        const prompt = getSystemPrompt('xiaoye.xml');

        // 验证核心标签存在
        expect(prompt).toContain('<character_profile>');
        expect(prompt).toContain('<scene_context>');

        // 验证默认变量被替换
        expect(prompt).not.toContain('{{CURRENT_TIME}}');
        expect(prompt).not.toContain('{{LOCATION}}');
        expect(prompt).not.toContain('{{SCENE_TYPE}}');

        // 验证默认值
        expect(prompt).toContain('模式: 闲聊');
        expect(prompt).not.toContain('{{GAME_STATE}}'); // 应该被替换为空
    });

    it('should inject dynamic scene type', () => {
        const prompt = getSystemPrompt('xiaoye.xml', {
            SCENE_TYPE: '游戏(海龟汤)'
        });

        expect(prompt).toContain('模式: 游戏(海龟汤)');
    });

    it('should inject game state when provided', () => {
        const gameStateMock = `
<game_state>
  当前游戏: 海龟汤
  题目: 雪山遇难
</game_state>
    `.trim();

        const prompt = getSystemPrompt('xiaoye.xml', {
            SCENE_TYPE: '游戏',
            GAME_STATE: gameStateMock
        });

        expect(prompt).toContain('模式: 游戏');
        expect(prompt).toContain('<game_state>');
        expect(prompt).toContain('题目: 雪山遇难');
    });

    it('should replace undefined variables with empty string', () => {
        const prompt = getSystemPrompt('xiaoye.xml', {
            GAME_STATE: undefined
        });

        // 确保 {{GAME_STATE}} 消失了且没有变成 "undefined" 字符串
        expect(prompt).not.toContain('{{GAME_STATE}}');
        expect(prompt).not.toContain('undefined');
    });
});

import { renderHook } from '@testing-library/react';
import { useActionDetector } from './useActionDetector';
import { vi, describe, it, expect } from 'vitest';

describe('useActionDetector', () => {
    it('should detect action when fully formed', () => {
        const onAction = vi.fn();
        const { rerender } = renderHook(
            ({ text, msgId }) => useActionDetector(text, msgId, onAction),
            { initialProps: { text: '', msgId: 'msg1' } }
        );

        // 模拟流式输入：部分内容
        rerender({ text: '好的，正在帮', msgId: 'msg1' });
        expect(onAction).not.toHaveBeenCalled();

        // 模拟流式输入：Action 未闭合
        rerender({ text: '好的，正在帮你查询 [ACTION:NEWS', msgId: 'msg1' });
        expect(onAction).not.toHaveBeenCalled();

        // 模拟流式输入：Action 闭合
        rerender({ text: '好的，正在帮你查询 [ACTION:NEWS:TECH]', msgId: 'msg1' });

        expect(onAction).toHaveBeenCalledTimes(1);
        expect(onAction).toHaveBeenCalledWith({
            type: 'NEWS',
            param: 'TECH',
            fullMatch: '[ACTION:NEWS:TECH]'
        });

        // 模拟流式输入：后续内容增加，不应重复触发
        rerender({ text: '好的，正在帮你查询 [ACTION:NEWS:TECH] 请稍等', msgId: 'msg1' });
        expect(onAction).toHaveBeenCalledTimes(1);
    });

    it('should handle new messageId correctly', () => {
        const onAction = vi.fn();
        const { rerender } = renderHook(
            ({ text, msgId }) => useActionDetector(text, msgId, onAction),
            { initialProps: { text: '[ACTION:TEST]', msgId: 'msg1' } }
        );

        expect(onAction).toHaveBeenCalledTimes(1);

        // 切换到新消息，内容也是 [ACTION:TEST]
        rerender({ text: '[ACTION:TEST]', msgId: 'msg2' });

        // 应该再次触发，因为是不同的 messageId
        expect(onAction).toHaveBeenCalledTimes(2);
    });

    it('should detect multiple actions in one stream', () => {
        const onAction = vi.fn();
        const { rerender } = renderHook(
            ({ text, msgId }) => useActionDetector(text, msgId, onAction),
            { initialProps: { text: '', msgId: 'msg1' } }
        );

        rerender({ text: 'Start [ACTION:A]', msgId: 'msg1' });
        expect(onAction).toHaveBeenCalledTimes(1);
        expect(onAction).toHaveBeenLastCalledWith(expect.objectContaining({ type: 'A' }));

        rerender({ text: 'Start [ACTION:A] Middle [ACTION:B:123]', msgId: 'msg1' });
        expect(onAction).toHaveBeenCalledTimes(2);
        expect(onAction).toHaveBeenLastCalledWith(expect.objectContaining({ type: 'B', param: '123' }));
    });
});

import { useEffect, useRef } from 'react';

export interface ParsedAction {
    type: string;
    param?: string;
    fullMatch: string;
}

// 超级宽松匹配：支持空格、中文冒号、大小写混合
// Example matches: 
// [ACTION:GAME:turtle_soup]
// [ GAME : turtle_soup ]
// [游戏：海龟汤] (如果 type 允许中文) -> 目前 type 限制为 [a-z_]+，如果需要支持中文 type，需要改 [a-z_\u4e00-\u9fa5]+
const ACTION_REGEX = /\[\s*(?:ACTION\s*[:：]\s*)?([a-z_]+)(?:\s*[:：]\s*([^\]]+))?\s*\]/gi;

/**
 * 意图检测 Hook
 * 监听文本变化，实时解析并触发 Action
 * 
 * @param text 当前正在生成的文本 (AI 回复)
 * @param onAction 检测到新 Action 时的回调
 */
/**
 * 意图检测 Hook
 * 监听文本变化，实时解析并触发 Action
 * 
 * @param text 当前正在生成的文本
 * @param messageId 当前消息ID (用于区分多路消息流)
 * @param onAction 检测到新 Action 时的回调
 */
export function useActionDetector(
    text: string,
    messageId: string,
    onAction: (action: ParsedAction) => void
) {
    // Map<MessageId, Set<Index>>
    const processedMap = useRef<Map<string, Set<number>>>(new Map());

    useEffect(() => {
        if (!text || !messageId) return;

        // Debug: Log the latest text chunk receiving
        // 使用 CSS 样式使日志更显眼
        console.log(`%c[ActionDetector] Input [${messageId.substring(0, 6)}...]:`, 'background: #222; color: #bada55', text);

        // 获取当前消息的已处理集合
        if (!processedMap.current.has(messageId)) {
            processedMap.current.set(messageId, new Set());
        }
        const processedIndices = processedMap.current.get(messageId)!;

        // 注意：这里不再根据 length 变短来清空，因为我们有 messageId 隔离。
        // 如果同一个 messageId 的文本真的变短了（例如撤回？），一般也不会重新触发 action。
        // 只有当完全新的 messageId 出现，我们才开新的 Set。

        // 为了防止 Map 无限增长，可以清理太老的 MessageId (可选，暂不加复杂逻辑)

        let match;
        // 重置正则索引
        ACTION_REGEX.lastIndex = 0;

        while ((match = ACTION_REGEX.exec(text)) !== null) {
            const index = match.index;
            console.log(`%c[ActionDetector] Regex Match found at index ${index}:`, 'background: #222; color: #ff00ff', match[0]);

            if (!processedIndices.has(index)) {
                processedIndices.add(index);

                // Log raw text for debugging
                console.log('[ActionDetector] Raw text segment:', text.substring(Math.max(0, text.length - 50)));

                try {
                    const type = match[1].toUpperCase(); // Normalize type
                    const param = match[2]?.trim();
                    console.log(`[ActionDetector] Match found: Type=${type}, Param=${param}`);

                    onAction({
                        type: type,
                        param: param,
                        fullMatch: match[0]
                    });
                } catch (e) {
                    console.error('[ActionDetector] Callback error:', e);
                }
            }
        }
    }, [text, messageId, onAction]);
}

/**
 * ZEGO 消息解析相关工具函数
 */

/**
 * 从 LLM 输出文本中提取游戏元数据（进度和提示）
 */
export function extractGameMetadata(text: string): { progress?: number; hint?: string } {
    // 策略1：标准格式 [PROGRESS: 50] 或 [PROGRESS:50%]
    let progressMatch = text.match(/\[PROGRESS:\s*(\d+)\s*%?\s*\]/i);

    // 策略2：中文冒号 [PROGRESS：50]
    if (!progressMatch) {
        progressMatch = text.match(/\[PROGRESS：\s*(\d+)\s*%?\s*\]/i);
    }

    // 策略3：中文标签 [进度: 50]
    if (!progressMatch) {
        progressMatch = text.match(/\[进度[:：]\s*(\d+)\s*%?\s*\]/);
    }

    const hintMatch = text.match(/\[HINT:\s*(.*?)\]/i);

    return {
        progress: progressMatch ? parseInt(progressMatch[1], 10) : undefined,
        hint: hintMatch ? hintMatch[1].trim() : undefined
    };
}

/**
 * 从 LLM 输出文本中提取情绪标签
 * ZEGO 会过滤 [[{"emotion":"..."}]] 但保留 (happy) 格式
 */
export function extractEmotion(text: string): string | null {
    const emotionMatch = text.match(/\(([a-z]+)\)/);
    return emotionMatch ? emotionMatch[1] : null;
}

/**
 * 清理字幕文本，移除所有控制标签
 */
export function cleanSubtitleText(text: string): string {
    return text
        .replace(/\[\[[\s\S]*?\]\]/g, '')  // Remove TTS control [[...]]
        .replace(/\[\[.*?/g, '')           // Remove partial start
        .replace(/.*?\]\]/g, '')           // Remove partial end
        .replace(/\[.*?\]/g, '')           // Remove single brackets [action]
        .replace(/\(.*?\)/g, '')           // Remove parentheses (emotion)
        .replace(/（.*?）/g, '')           // Remove Chinese parentheses
        .replace(/【.*?】/g, '')           // Remove Chinese brackets
        .trim();
}

/**
 * 重新组装增量文本片段
 */
export function assembleTextFragments(segments: Map<number, string>): string {
    const sortedKeys = Array.from(segments.keys()).sort((a, b) => a - b);
    return sortedKeys.map(k => segments.get(k)).join('');
}

import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { SubtitleItem } from '../lib/zego-subtitle';

interface SubtitleDisplayProps {
    subtitles: SubtitleItem[];
}

/**
 * 解析展示用的情绪标签 (emotion)
 */
function parseDisplayEmotion(text: string): { emotion: string | null, cleanText: string } {
    // 1. 清理可能的 JSON 前缀 (例如 [{"emotion":"xx"}])
    const cleanJson = text.replace(/^\[.*?\]\s*/, '');

    // 2. 解析 (emotion) 格式
    const emotionRegex = /^\(([^)]+)\)\s*/;
    const match = cleanJson.match(emotionRegex);

    if (match) {
        return {
            emotion: match[1],
            cleanText: cleanJson.replace(emotionRegex, '')
        };
    }

    return { emotion: null, cleanText: cleanJson };

    return { emotion: null, cleanText: text };
}

export const SubtitleDisplay: React.FC<SubtitleDisplayProps> = ({ subtitles }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [autoScroll, setAutoScroll] = useState(true);
    const [hasNewMessage, setHasNewMessage] = useState(false);

    // 滚动到底部
    const scrollToBottom = useCallback(() => {
        const container = containerRef.current;
        if (!container) return;

        container.scrollTo({
            top: container.scrollHeight,
            behavior: 'smooth'
        });
        setAutoScroll(true);
        setHasNewMessage(false);
    }, []);

    // 处理新消息到达时的逻辑
    useEffect(() => {
        if (autoScroll) {
            // Need a slight delay to allow rendering
            setTimeout(scrollToBottom, 50);
        } else {
            setHasNewMessage(true);
        }
    }, [subtitles, autoScroll, scrollToBottom]);

    // 监听滚动事件
    const handleScroll = () => {
        const container = containerRef.current;
        if (!container) return;

        const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 20;

        if (isAtBottom) {
            setAutoScroll(true);
            setHasNewMessage(false);
        } else {
            if (autoScroll) setAutoScroll(false);
        }
    };

    return (
        <div className="relative flex-1 flex flex-col min-h-0 w-full h-full">
            <div
                ref={containerRef}
                className="flex-1 overflow-y-scroll px-4 space-y-3 pt-6 pb-2 no-scrollbar"
                onScroll={handleScroll}
                style={{
                    maskImage: 'linear-gradient(to bottom, transparent, black 15%, black 100%)',
                    WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 15%, black 100%)',
                    // Hiding scrollbar
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none'
                }}
            >
                <div className="flex flex-col justify-end min-h-full pb-4">
                    {subtitles.map((msg, index) => {
                        const { cleanText } = parseDisplayEmotion(msg.text);
                        const isAgent = msg.type === 'agent';

                        return (
                            <div
                                key={`${msg.timestamp}-${index}`}
                                className={`flex w-full mb-2.5 animate-message-in ${isAgent ? 'justify-start pr-10' : 'justify-end pl-10'}`}
                            >
                                <div
                                    className={`px-3.5 py-2.5 text-[13px] leading-relaxed max-w-[85%]
                    ${isAgent
                                            ? 'bg-bg-mid/85 backdrop-blur-md text-white/90 border border-white/10 rounded-[14px_14px_14px_4px]'
                                            : 'bg-gradient-to-br from-blue-500 to-blue-400 text-white rounded-[14px_14px_4px_14px]'
                                        }`}
                                >
                                    {cleanText}
                                    {/* Typing cursor for latest AI message could go here if implemented */}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* 滚动到底部按钮 */}
            {!autoScroll && hasNewMessage && (
                <button
                    onClick={scrollToBottom}
                    className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-blue-500/90 rounded-full text-[10px] text-white backdrop-blur-md flex items-center gap-1 shadow-lg z-30"
                >
                    <span className="material-symbols-outlined text-[12px]">arrow_downward</span>
                    新消息
                </button>
            )}
        </div>
    );
};

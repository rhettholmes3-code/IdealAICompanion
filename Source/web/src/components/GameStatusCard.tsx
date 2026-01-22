import React, { useEffect, useState } from 'react';

interface GameStatusCardProps {
    gameType: string | null;
    content?: any; // String (legacy) or Object (new)
}

const GAME_NAMES: Record<string, string> = {
    'turtle_soup': '🐢 海龟汤',
    'riddle': '🧩 猜谜',
    'idiom_chain': '⛓️ 成语接龙'
};

export const GameStatusCard: React.FC<GameStatusCardProps> = ({ gameType, content }) => {

    // Normalize content
    const puzzleText = typeof content === 'string' ? content : content?.puzzle || '';
    const progress = typeof content === 'object' ? content?.progress : undefined;
    const hints = typeof content === 'object' ? content?.hints : undefined;

    // Debug: Log props to verify updates (Safe logging)
    useEffect(() => {
        if (gameType || content) {
            console.log(`[GameStatusCard] Render: Type=${gameType}, Progress=${progress}, Hints=${hints?.length}`);
        }
    }, [gameType, content, puzzleText, progress, hints]);

    const [visible, setVisible] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);

    useEffect(() => {
        if (gameType) {
            setVisible(true);
        } else {
            // 延时隐藏，平滑过渡
            const timer = setTimeout(() => {
                setVisible(false);
                setIsExpanded(false); // Reset expansion on hide
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [gameType]);

    if (!visible) return null;

    const gameName = gameType ? (GAME_NAMES[gameType] || '未知游戏') : '';

    return (
        <div className={`
            absolute top-24 left-1/2 -translate-x-1/2 transform pointer-events-auto
            flex flex-col items-center
            transition-all duration-500 ease-spring
            ${gameType ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}
        `}>
            {/* Status Bar */}
            <button
                onClick={() => puzzleText && setIsExpanded(!isExpanded)}
                className={`
                    bg-white/10 backdrop-blur-md border border-white/20
                    px-6 py-3 rounded-full flex items-center gap-3
                    hover:bg-white/15 active:scale-95 transition-all
                    ${isExpanded ? 'bg-white/20 border-white/30' : ''}
                `}
            >
                <div className="relative w-2 h-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </div>
                <span className="text-white font-medium text-sm tracking-wide">
                    正在进行：<span className="text-green-300 font-bold ml-1">{gameName}</span>
                </span>

                {/* Progress Indicator (Mini) */}
                {progress !== undefined && (
                    <span className="text-xs text-white/60 ml-2 border-l border-white/10 pl-3">
                        {progress}%
                    </span>
                )}

                {puzzleText && (
                    <span className={`material-symbols-outlined text-white/50 text-sm transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                        expand_more
                    </span>
                )}
            </button>

            {/* Expanded Content (Puzzle + Hints) */}
            <div className={`
                mt-2 w-[85vw] max-w-[340px]
                bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl
                overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]
                flex flex-col
                ${isExpanded ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0 border-0'}
            `}>

                {/* Progress Bar (Visual) */}
                {progress !== undefined && (
                    <div className="w-full h-1 bg-white/10">
                        <div
                            className="h-full bg-gradient-to-r from-green-500 to-emerald-400 transition-all duration-1000 ease-out"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                )}

                <div className="p-5 text-white/90 text-sm leading-relaxed whitespace-pre-wrap">
                    <div className="text-xs text-green-400/80 mb-2 font-bold uppercase tracking-wider flex justify-between items-center">
                        <span>题目内容</span>
                    </div>
                    {puzzleText || '暂无内容'}

                    {/* Hints Wall */}
                    {Array.isArray(hints) && hints.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-white/10">
                            <div className="text-xs text-amber-400/80 mb-2 font-bold uppercase tracking-wider flex items-center gap-1">
                                <span className="material-symbols-outlined text-[10px]">lightbulb</span>
                                已获线索
                            </div>
                            <ul className="space-y-2">
                                {hints.map((hint: string, idx: number) => (
                                    <li key={idx} className="text-xs text-white/70 bg-white/5 p-2 rounded-lg border border-white/5">
                                        {hint}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

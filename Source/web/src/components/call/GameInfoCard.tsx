/**
 * GameInfoCard - 海龟汤游戏信息卡片
 * 
 * 可折叠卡片，展示游戏状态（汤面、线索、进度）
 * - 展示条件：gameState !== null
 * - 默认状态：折叠
 */
import { useState, useEffect, useRef } from 'react';

// ============ 类型定义 ============

/** 线索项 */
export interface Clue {
    name: string;       // 线索名称
    content: string;    // 线索内容
    unlocked: boolean;  // 是否已解锁
}

/** 海龟汤游戏状态 */
export interface TurtleSoupGameState {
    title: string;           // 游戏标题
    story: string;           // 汤面内容
    progressPercent: number; // 进度 0-100
    clues: Clue[];           // 线索列表
}

/** 组件 Props */
export interface GameInfoCardProps {
    gameState: TurtleSoupGameState | null;
    newlyUnlockedIndices?: number[];
}

// ============ 样式常量 ============

const STYLES = {
    // 卡片容器 - 翡翠绿边框 + 毛玻璃 + 发光效果
    card: `
    relative overflow-hidden rounded-2xl
    bg-gradient-to-br from-emerald-500/15 to-cyan-500/10
    backdrop-blur-lg
    border border-emerald-500/40
    shadow-[0_0_20px_rgba(16,185,129,0.15),0_4px_20px_rgba(0,0,0,0.3)]
  `,
    // 发光伪元素效果（通过 before 实现）
    cardGlow: `
    before:absolute before:inset-[-2px] before:rounded-[18px]
    before:bg-gradient-to-br before:from-emerald-500/30 before:to-cyan-500/20
    before:blur-[8px] before:opacity-60 before:-z-10
  `,
    // 卡片头部
    header: `
    px-3 py-2 flex items-center justify-between cursor-pointer select-none
    transition-colors hover:bg-white/5
  `,
    // 标题区域
    titleArea: 'flex items-center gap-2',
    titleText: 'text-sm font-semibold text-emerald-300',
    subtitle: 'text-[10px] text-white/50',
    // 进度区域
    progressText: 'text-sm font-semibold text-emerald-400',
    expandIcon: 'text-emerald-400/60 text-xs transition-transform duration-300',
    // 可折叠内容
    collapsible: `
    overflow-hidden transition-all duration-400 ease-out
  `,
    divider: 'h-px bg-white/10 mx-3',
    // 汤面区域
    section: 'px-3 py-2',
    sectionLabel: 'text-[11px] font-medium text-white/50',
    story: 'text-[13px] text-white/85 leading-relaxed',
    // 线索墙
    clueLabel: 'text-[10px] text-white/30',
    clueList: 'space-y-1.5',
    // 已解锁线索
    clueUnlocked: `
    flex items-center gap-2 py-1.5 px-2 rounded-lg
    bg-emerald-500/10 border border-emerald-500/30
  `,
    clueUnlockedText: 'text-[13px] font-medium text-emerald-400',
    // 未解锁线索
    clueLocked: `
    flex items-center gap-2 py-1.5 px-2 rounded-lg
    bg-white/5 border border-white/10
  `,
    clueLockedText: 'text-[13px] text-white/60',
    // 模糊效果
    cipher: 'blur-[4px] select-none',
    // 解锁动画
    unlocking: 'animate-unlock',
} as const;

// ============ 组件实现 ============

export function GameInfoCard({ gameState, newlyUnlockedIndices = [] }: GameInfoCardProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [animatingIndices, setAnimatingIndices] = useState<Set<number>>(new Set());
    const prevUnlockedRef = useRef<number[]>([]);

    // 检测新解锁的线索并触发动画
    useEffect(() => {
        if (newlyUnlockedIndices.length > 0) {
            const newIndices = newlyUnlockedIndices.filter(
                i => !prevUnlockedRef.current.includes(i)
            );
            if (newIndices.length > 0) {
                setAnimatingIndices(new Set(newIndices));
                // 动画结束后清除状态
                const timer = setTimeout(() => {
                    setAnimatingIndices(new Set());
                }, 800);
                return () => clearTimeout(timer);
            }
        }
        prevUnlockedRef.current = newlyUnlockedIndices;
    }, [newlyUnlockedIndices]);

    // 自动展开 & 调试日志
    useEffect(() => {
        if (gameState) {
            console.log('[GameInfoCard] GameState Update:', gameState);
            // 当检测到新游戏标题时，自动展开卡片
            if (gameState.title) {
                setIsExpanded(true);
            }
        }
    }, [gameState?.title]);

    // 不渲染条件
    if (!gameState) return null;

    const { title, story, progressPercent, clues } = gameState;
    const unlockedCount = clues.filter(c => c.unlocked).length;
    const totalClues = clues.length;

    // Debug logging removed to prevent console spam

    const toggleExpanded = () => setIsExpanded(!isExpanded);

    return (
        <div className="mx-4 mb-2 relative z-20">
            <div className={`${STYLES.card} ${STYLES.cardGlow}`}>
                {/* 卡片头部（始终可见） */}
                <div className={STYLES.header} onClick={toggleExpanded}>
                    <div className={STYLES.titleArea}>
                        <span className="text-lg">🐢</span>
                        <div>
                            <h3 className={STYLES.titleText}>海龟汤：{title}</h3>
                            <p className={STYLES.subtitle}>推理游戏进行中</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className={STYLES.progressText}>{progressPercent}%</span>
                        <i
                            className={`fa-solid fa-chevron-down ${STYLES.expandIcon}`}
                            style={{ transform: isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)' }}
                        />
                    </div>
                </div>

                {/* 可折叠内容 */}
                <div
                    className={STYLES.collapsible}
                    style={{
                        maxHeight: isExpanded ? '600px' : '0',
                        opacity: isExpanded ? 1 : 0,
                    }}
                >
                    {/* 分割线 */}
                    <div className={STYLES.divider} />

                    {/* 汤面区域 */}
                    <div className={STYLES.section}>
                        <div className="flex items-center gap-1.5 mb-1">
                            <span className={STYLES.sectionLabel}>📜 汤面</span>
                        </div>
                        <p className={STYLES.story}>{story}</p>
                    </div>

                    {/* 线索墙区域 */}
                    <div className={STYLES.section}>
                        <div className="flex items-center gap-1.5 mb-1.5">
                            <span className={STYLES.sectionLabel}>🔍 线索墙</span>
                            <span className={STYLES.clueLabel}>{unlockedCount}/{totalClues} 已解锁</span>
                        </div>

                        {/* 线索列表 */}
                        <div className={STYLES.clueList}>
                            {clues.map((clue, index) => {
                                const isAnimating = animatingIndices.has(index);
                                const isUnlocked = clue.unlocked;

                                return (
                                    <div
                                        key={index}
                                        className={isUnlocked ? STYLES.clueUnlocked : STYLES.clueLocked}
                                    >
                                        <span className="text-sm">{isUnlocked ? '✅' : '🔒'}</span>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[10px] text-white/50 leading-tight">
                                                线索 {index + 1}：{clue.name}
                                            </p>
                                            <p
                                                className={`
                          ${isUnlocked ? STYLES.clueUnlockedText : STYLES.clueLockedText}
                          ${!isUnlocked ? STYLES.cipher : ''}
                          ${isAnimating ? STYLES.unlocking : ''}
                        `}
                                            >
                                                {clue.content}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* 解锁动画 keyframes - 通过 style 标签注入 */}
            <style>{`
        @keyframes unlock-flash {
          0% {
            filter: blur(4px);
            opacity: 0.5;
          }
          30% {
            filter: blur(0);
            opacity: 1;
            text-shadow: 0 0 20px rgba(34, 197, 94, 0.8);
          }
          100% {
            filter: blur(0);
            opacity: 1;
            text-shadow: none;
          }
        }
        .animate-unlock {
          animation: unlock-flash 0.8s ease forwards;
        }
      `}</style>
        </div>
    );
}

export default GameInfoCard;

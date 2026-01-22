/**
 * 通话页头部组件 - 显示状态、情绪和操作菜单
 */
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { EMOTION_MAP } from './constants';

interface CallHeaderProps {
    currentEmotion: string;
    onShowDebugPrompt: () => void;
    onClearContext: () => void;
}

export const CallHeader: React.FC<CallHeaderProps> = ({
    currentEmotion,
    onShowDebugPrompt,
    onClearContext
}) => {
    const [showMoreMenu, setShowMoreMenu] = useState(false);

    return (
        <div className="flex justify-between items-center px-4 pt-12 pb-3">
            {/* Left Side - Status Badges */}
            <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-bg-dark/60 backdrop-blur-md border border-white/10 text-[11px] font-medium">
                    <span>🌿</span>
                    <span>Lv.2 熟悉</span>
                </div>
                <div className="flex items-center gap-1 px-3 py-1.5 rounded-2xl bg-bg-dark/60 backdrop-blur-md border border-white/10 text-[11px] font-medium">
                    <span>{EMOTION_MAP[currentEmotion] || EMOTION_MAP.neutral}</span>
                </div>
            </div>

            {/* Right Side - Action Buttons */}
            <div className="flex items-center gap-3">
                {/* Debug Button */}
                <button
                    onClick={onShowDebugPrompt}
                    className="w-[44px] h-[44px] rounded-full bg-bg-dark/50 backdrop-blur-md border border-white/10 flex items-center justify-center hover:scale-95 transition-transform"
                    title="查看系统提示词"
                >
                    <span className="material-symbols-outlined text-white/80">integration_instructions</span>
                </button>

                {/* More Menu */}
                <div className="relative z-50">
                    <button
                        onClick={() => setShowMoreMenu(!showMoreMenu)}
                        className="w-[44px] h-[44px] rounded-full bg-bg-dark/50 backdrop-blur-md border border-white/10 flex items-center justify-center hover:scale-95 transition-transform"
                        title="更多选项"
                    >
                        <span className="material-symbols-outlined text-white/80">more_horiz</span>
                    </button>

                    {/* Dropdown Menu */}
                    <AnimatePresence>
                        {showMoreMenu && (
                            <motion.div
                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                className="absolute right-0 top-full mt-2 w-48 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl overflow-hidden backdrop-blur-xl"
                            >
                                <button
                                    onClick={() => {
                                        onClearContext();
                                        setShowMoreMenu(false);
                                    }}
                                    className="w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-white/5 active:bg-white/10 flex items-center gap-2 transition-colors"
                                >
                                    <span className="material-symbols-outlined text-[18px]">delete_history</span>
                                    <span>清除上下文</span>
                                </button>
                                {/* Future options can go here */}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
};

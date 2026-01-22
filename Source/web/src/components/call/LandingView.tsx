/**
 * 落地页视图 - 通话前的初始界面
 */
import React from 'react';
import { motion } from 'framer-motion';
import type { AgentInfo } from './constants';

interface LandingViewProps {
    currentAgent: AgentInfo | null;
    onStart: () => void;
    onOpenSettings: () => void;
}

export const LandingView: React.FC<LandingViewProps> = ({
    currentAgent,
    onStart,
    onOpenSettings
}) => {
    return (
        <motion.div
            key="landing-view"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 flex flex-col z-10"
        >
            {/* Settings Button */}
            <div className="flex justify-end p-12 pr-4 pt-12">
                <motion.button
                    onClick={onOpenSettings}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="w-[44px] h-[44px] rounded-full bg-bg-dark/50 backdrop-blur-md border border-white/10 flex items-center justify-center hover:scale-95 transition-transform"
                >
                    <span className="material-symbols-outlined text-white/80">settings</span>
                </motion.button>
            </div>

            {/* Start Call Area */}
            <div className="flex-1 flex flex-col justify-end items-center pb-[72px]">
                {/* Start Call Button */}
                <motion.button
                    layoutId="main-action-button"
                    onClick={onStart}
                    className="relative w-[88px] h-[88px] rounded-full bg-gradient-to-br from-gradient-start to-gradient-end flex items-center justify-center transition-transform active:scale-95 group border-[3px] border-white/30 shadow-2xl z-20"
                >
                    <div className="absolute inset-[-12px] rounded-full bg-gradient-to-br from-gradient-start to-gradient-end opacity-50 blur-2xl animate-pulse-glow" />
                    <motion.span
                        layoutId="main-action-icon"
                        className="material-symbols-outlined text-[40px] text-white relative z-10 drop-shadow-lg"
                    >
                        call
                    </motion.span>
                </motion.button>

                {/* Hint Text */}
                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    className="mt-5 text-[15px] text-white font-semibold tracking-wider drop-shadow-lg bg-black/20 px-4 py-1.5 rounded-full backdrop-blur-sm border border-white/10"
                >
                    {currentAgent ? `与 ${currentAgent.name} 通话` : '点击开始通话'}
                </motion.p>
            </div>
        </motion.div>
    );
};

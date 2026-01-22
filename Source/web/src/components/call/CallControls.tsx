/**
 * 通话控制按钮组件
 */
import React from 'react';
import { motion } from 'framer-motion';

interface CallControlsProps {
    isMicOn: boolean;
    onToggleMic: () => void;
    onEndCall: () => void;
}

export const CallControls: React.FC<CallControlsProps> = ({
    isMicOn,
    onToggleMic,
    onEndCall
}) => {
    return (
        <div className="flex justify-center items-center gap-10 px-4 pb-10 pt-5 z-20">
            {/* Mic Toggle Button */}
            <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1 }}
                transition={{ delay: 0.2 }}
                className="flex flex-col items-center gap-1.5"
            >
                <button
                    onClick={onToggleMic}
                    className={`w-[52px] h-[52px] rounded-full border flex items-center justify-center backdrop-blur-md transition-all active:scale-95
                        ${isMicOn
                            ? 'bg-bg-dark/60 border-white/10 text-white'
                            : 'bg-red-500/20 border-red-500/50 text-white'}`}
                >
                    <span className="material-symbols-outlined text-[22px]">{isMicOn ? 'mic' : 'mic_off'}</span>
                </button>
                <span className="text-[9px] text-white/50 uppercase tracking-wider">麦克风</span>
            </motion.div>

            {/* End Call Button */}
            <div className="flex flex-col items-center gap-1.5">
                <motion.button
                    layoutId="main-action-button"
                    onClick={onEndCall}
                    className="w-[60px] h-[60px] rounded-full bg-gradient-to-br from-red-500 to-red-600 relative flex items-center justify-center active:scale-95 shadow-[0_0_20px_rgba(239,68,68,0.4)] z-20"
                >
                    <div className="absolute inset-[-4px] rounded-full bg-red-500 opacity-30 blur-md pointer-events-none" />
                    <motion.span
                        layoutId="main-action-icon"
                        className="material-symbols-outlined text-[26px] text-white relative z-10"
                    >
                        call_end
                    </motion.span>
                </motion.button>
                <span className="text-[9px] text-white/50 uppercase tracking-wider opacity-0">挂断</span>
            </div>
        </div>
    );
};

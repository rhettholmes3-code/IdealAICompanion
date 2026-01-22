/**
 * ErrorCard - 错误卡片组件
 * 
 * v2.2.0 MVP
 */

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface ErrorData {
    type: 'location_unknown' | 'timeout' | 'unavailable';
    message: string;
}

interface ErrorCardProps {
    data: ErrorData;
    onClose: () => void;
    autoCloseDelay?: number; // 默认 5s
}

const ERROR_CONFIG: Record<ErrorData['type'], { reason: string; suggestions: string[] }> = {
    location_unknown: {
        reason: '地点无法识别',
        suggestions: ['说出具体城市名', '如「北京天气」']
    },
    timeout: {
        reason: '网络响应超时',
        suggestions: ['稍后再试一下']
    },
    unavailable: {
        reason: '天气服务暂时不可用',
        suggestions: ['稍后再试一下']
    }
};

export const ErrorCard: React.FC<ErrorCardProps> = ({
    data,
    onClose,
    autoCloseDelay = 5000
}) => {
    // 自动关闭
    useEffect(() => {
        const timer = setTimeout(onClose, autoCloseDelay);
        return () => clearTimeout(timer);
    }, [onClose, autoCloseDelay]);

    const config = ERROR_CONFIG[data.type] || ERROR_CONFIG.unavailable;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: 100 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 100 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="absolute left-4 right-4 bottom-32 z-30"
            >
                <div
                    className="rounded-3xl overflow-hidden shadow-lg border border-orange-500/40 backdrop-blur-xl"
                    style={{
                        background: `linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(26, 26, 36, 0.95) 100%)`
                    }}
                >
                    {/* 卡片头部 */}
                    <div className="px-5 pt-4 pb-3 flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-2xl shadow-lg shadow-orange-500/30">
                            ⚠️
                        </div>
                        <div>
                            <h3 className="text-white font-semibold text-lg">天气查询失败</h3>
                        </div>
                    </div>

                    {/* 分割线 */}
                    <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent mx-5" />

                    {/* 错误详情 */}
                    <div className="px-5 py-4 space-y-3">
                        {/* 原因 */}
                        <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <span className="text-red-400 text-sm">❌</span>
                            </div>
                            <div>
                                <p className="text-white/50 text-xs mb-1">原因</p>
                                <p className="text-white font-medium text-sm">{config.reason}</p>
                            </div>
                        </div>

                        {/* 建议 */}
                        <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <span className="text-blue-400 text-sm">💡</span>
                            </div>
                            <div>
                                <p className="text-white/50 text-xs mb-1">建议</p>
                                <ul className="text-white/80 text-sm space-y-1">
                                    {config.suggestions.map((suggestion, idx) => (
                                        <li key={idx} className="flex items-center gap-2">
                                            <span className="w-1 h-1 rounded-full bg-white/40" />
                                            {suggestion}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>

                    {/* 底部提示 */}
                    <div className="px-5 pb-4">
                        <p className="text-white/30 text-xs text-center">5秒后自动关闭</p>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
};

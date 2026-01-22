/**
 * WeatherCard - 天气卡片组件
 * 
 * v2.2.0 MVP
 * 参考原型: _prototype/weather-card-v2.2.0.html
 */

import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface WeatherData {
    location: string;
    temperature: string;
    weather: string;
    suggestion: string;
    iconCode: 'sunny' | 'cloudy' | 'rainy' | 'snowy' | 'default';
}

interface WeatherCardProps {
    data: WeatherData;
    onClose: () => void;
    autoCloseDelay?: number; // 默认 30s
}

const WEATHER_ICONS: Record<string, string> = {
    sunny: '☀️',
    cloudy: '☁️',
    rainy: '🌧️',
    snowy: '❄️',
    default: '🌤️'
};

const WEATHER_GRADIENTS: Record<string, string> = {
    sunny: 'from-yellow-500/20 to-orange-500/10',
    cloudy: 'from-gray-400/20 to-blue-400/10',
    rainy: 'from-blue-500/20 to-indigo-500/10',
    snowy: 'from-cyan-400/20 to-blue-300/10',
    default: 'from-emerald-500/20 to-teal-500/10'
};

export const WeatherCard: React.FC<WeatherCardProps> = ({
    data,
    onClose,
    autoCloseDelay = 30000
}) => {
    const [countdown, setCountdown] = useState(autoCloseDelay / 1000);

    // 倒计时自动关闭
    useEffect(() => {
        const timer = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    onClose();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [onClose, autoCloseDelay]);

    const icon = WEATHER_ICONS[data.iconCode] || WEATHER_ICONS.default;
    const gradient = WEATHER_GRADIENTS[data.iconCode] || WEATHER_GRADIENTS.default;

    // 获取当前日期
    const today = new Date();
    const dateStr = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日`;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: 100 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 100 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="mx-4 mt-4 relative z-40"
            >
                <div
                    className={`rounded-3xl overflow-hidden shadow-lg border border-emerald-500/30 backdrop-blur-xl`}
                    style={{
                        background: `linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(26, 26, 36, 0.95) 100%)`
                    }}
                >
                    {/* 倒计时进度条 */}
                    <div className="h-1 bg-white/10">
                        <motion.div
                            className="h-full bg-gradient-to-r from-emerald-400 to-teal-400"
                            initial={{ width: '100%' }}
                            animate={{ width: '0%' }}
                            transition={{ duration: autoCloseDelay / 1000, ease: 'linear' }}
                        />
                    </div>

                    {/* 卡片头部 */}
                    <div className="px-5 pt-4 pb-3 flex items-start justify-between">
                        <div className="flex items-center gap-3">
                            <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center text-2xl shadow-lg`}>
                                {icon}
                            </div>
                            <div>
                                <h3 className="text-white font-semibold text-lg">{data.location}</h3>
                                <p className="text-white/50 text-sm">{dateStr}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            {data.temperature.includes('～') || data.temperature.includes('~') ? (
                                <>
                                    <span className="text-3xl font-bold text-white">
                                        {data.temperature.split(/[～~]/)[0].replace('°C', '').trim()}°
                                    </span>
                                    <span className="text-white/60 text-lg ml-1">
                                        / {data.temperature.split(/[～~]/)[1]?.trim() || ''}
                                    </span>
                                </>
                            ) : (
                                <span className="text-3xl font-bold text-white">
                                    {data.temperature}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* 天气状态 */}
                    <div className="px-5 pb-3">
                        <span className="inline-block px-3 py-1 rounded-full bg-white/10 text-white/80 text-sm">
                            {data.weather}
                        </span>
                    </div>

                    {/* 分割线 */}
                    <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent mx-5" />

                    {/* 详细信息 */}
                    <div className="px-5 py-4 grid grid-cols-2 gap-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                                <span className="text-blue-400">👔</span>
                            </div>
                            <div>
                                <p className="text-white/50 text-xs">穿衣建议</p>
                                <p className="text-white font-medium text-sm">{data.suggestion}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                                <span className="text-emerald-400">💨</span>
                            </div>
                            <div>
                                <p className="text-white/50 text-xs">空气质量</p>
                                <p className="text-white font-medium text-sm">良好</p>
                            </div>
                        </div>
                    </div>

                    {/* 底部提示 */}
                    <div className="px-5 pb-4 flex items-center justify-between">
                        <p className="text-white/30 text-xs">
                            说「好的」关闭卡片
                        </p>
                        <p className="text-white/30 text-xs">
                            {countdown}s
                        </p>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
};

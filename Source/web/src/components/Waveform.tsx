import React, { useMemo } from 'react';

interface WaveformProps {
    isAnimating: boolean;
    soundLevel: number;
}

export const Waveform: React.FC<WaveformProps> = ({ isAnimating, soundLevel }) => {
    // 基础条形数量
    const barCount = 10;

    // 生成条形的基础高度
    const bars = useMemo(() => {
        return Array.from({ length: barCount }, () => {
            // 中心对称分布的基础高度 (Hardcoded visual pattern from prototype: rough approximation)
            // Prototype indices: 0..9
            // Heights roughly: tiny, small, medium, large, medium ...
            // Let's use a fixed pattern for consistency with the design spec
            return 4; // Base height is small
        });
    }, [barCount]);

    // 只要有声音或者状态是正在说话/思考，就显示动画
    const active = isAnimating || soundLevel > 5;

    return (
        <div className="flex items-center justify-center gap-[3px] h-full">
            {bars.map((_, i) => {
                // soundLevel 0-100
                const volumeGain = (soundLevel / 100) * 36;

                // Random sine wave simulation for "activity"
                const time = Date.now() / 150;
                // Add phase shift per bar
                const waveOffset = Math.sin(time + i * 0.8) * 10;

                let dynamicHeight = 4;
                if (active) {
                    // Base height modulation + volume impact
                    dynamicHeight = 12 + waveOffset + volumeGain;
                }

                return (
                    <div
                        key={i}
                        className="w-[3px] rounded-full transition-all duration-100 ease-out bg-gradient-to-b from-gradient-start to-gradient-end"
                        style={{
                            height: `${Math.max(4, Math.min(dynamicHeight, 48))}px`,
                            opacity: active ? 1 : 0.6
                        }}
                    />
                );
            })}
        </div>
    );
};

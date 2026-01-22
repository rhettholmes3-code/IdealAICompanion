import { ZegoExpressEngine } from 'zego-express-engine-webrtc';

export interface SubtitleItem {
    text: string;
    type: 'user' | 'agent';
    timestamp: number;
    segmentId?: number;
    messageId?: string;
}

/**
 * ZEGO 字幕管理类 (模拟官方实现)
 * 用于解析从 SEI 或 IM 接收到的字幕数据
 */
export class ZegoSubtitleManager {
    private listeners: ((subtitle: SubtitleItem) => void)[] = [];

    constructor(_options: { appID: number, roomID: string, engine?: ZegoExpressEngine }) {
        // 实际实现会在这里订阅 SDK 事件
    }

    on(event: 'subtitleUpdate', callback: (subtitle: SubtitleItem) => void) {
        if (event === 'subtitleUpdate') {
            this.listeners.push(callback);
        }
    }

    destroy() {
        this.listeners = [];
    }

    /**
     * 模拟接收字幕 (开发用)
     */
    mockReceive(text: string, type: 'user' | 'agent') {
        const subtitle: SubtitleItem = {
            text,
            type,
            timestamp: Date.now()
        };
        this.listeners.forEach(cb => cb(subtitle));
    }
}

/**
 * CallPage 相关常量和类型定义
 */

// 应用配置
export const CONFIG = {
    appID: 453368898,
    server: '',
    // Support separate deployment: if VITE_API_BASE_URL is set, use it; otherwise use relative path (proxy)
    tokenUrl: `${import.meta.env.VITE_API_BASE_URL || ''}/api/auth/token`,
    roomID: 'room_xiaoye_001',
    userID: (() => {
        if (typeof window !== 'undefined') {
            const stored = localStorage.getItem('zego_user_id');
            if (stored) return stored;
            const newId = 'user_' + Math.floor(Math.random() * 10000);
            localStorage.setItem('zego_user_id', newId);
            return newId;
        }
        return 'user_default';
    })(),
    userName: 'User'
};

// Agent 信息接口
export interface AgentInfo {
    id: string;
    name: string;
    backgroundImage: string;
}

// 情绪映射
export const EMOTION_MAP: Record<string, string> = {
    happy: '😊 开心',
    sad: '😢 难过',
    angry: '😠 生气',
    fearful: '😨 害怕',
    surprised: '😲 惊讶',
    neutral: '😌 平静'
};

// Agent 状态文本映射
export const getStatusText = (status: string): string => {
    switch (status) {
        case 'speaking': return '说话中';
        case 'thinking': return '思考中';
        case 'listening':
        default: return '倾听中...';
    }
};

// 工具函数
export function findLastIndex<T>(arr: T[], predicate: (item: T) => boolean): number {
    for (let i = arr.length - 1; i >= 0; i--) {
        if (predicate(arr[i])) return i;
    }
    return -1;
}

/**
 * ZEGO RTC 相关类型定义和常量
 */

// Agent 状态类型
export type AgentStatus = 'idle' | 'listening' | 'thinking' | 'speaking';

// Agent 状态映射表
export const AGENT_STATUS_MAP: Record<number, AgentStatus> = {
    0: 'idle',
    1: 'listening',
    2: 'thinking',
    3: 'speaking'
};

// 字幕消息类型
export interface SubtitleMessage {
    type: 'user' | 'agent';
    text: string;
    messageId: string;
    endFlag: boolean;
    timestamp: number;
}

// useZegoRTC Hook 配置
export interface UseZegoRTCProps {
    appID: number;
    server: string;
    tokenUrl: string;
    userID: string;
    userName: string;
    roomID: string;
    onError?: (message: string, code?: number) => void;
    onAgentReady?: (instanceId: string) => void;
    onRawMessage?: (cmd: number, data: any) => void;
}

// 游戏类型别名映射
export const GAME_ALIASES: Record<string, string> = {
    '海龟汤': 'turtle_soup',
    '猜谜': 'riddle',
    '成语接龙': 'idiom_chain',
    'Unknown Game': 'unknown'
};

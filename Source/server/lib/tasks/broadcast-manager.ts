/**
 * BroadcastManager - 播报管理器
 * 
 * 统一管理 AI 语音播报逻辑，支持：
 * - 任务结果播报（人设化）
 * - 纠正话术播报（精确控制）
 * - 优先级控制
 * 
 * v2.2.0 MVP
 */

import { sendZegoRequest } from '../zego';
import { TaskResult, WeatherResult } from './types';

/** 播报优先级 */
export type BroadcastPriority = 'High' | 'Medium' | 'Low';

/** 纠正类型 */
export type CorrectionType = 'downgrade' | 'upgrade';

/** 纠正话术模板 */
const CORRECTION_TEMPLATES: Record<CorrectionType, string[]> = {
    // MainLLM 认为是任务，TaskAgent 认为是闲聊
    downgrade: [
        '看了一下，这个好像挺简单的，直接回答就行~',
        '嗯，这个不用特别查，我来回答你~'
    ],
    // MainLLM 认为是闲聊，TaskAgent 认为是任务
    upgrade: [
        '我又仔细看了一下，这个好像有点复杂，我帮你查查~',
        '等等，好像需要帮你查一下才能回答~'
    ]
};

/** 错误播报模板 */
const ERROR_MESSAGES: Record<string, string> = {
    'location_unknown': '抱歉没听清地点，你说的是哪个城市呀？',
    'timeout': '网络不太好，晚点再帮你查～',
    'unavailable': '天气服务出了点问题，晚点再试试～'
};

export class BroadcastManager {
    private static instance: BroadcastManager;

    static getInstance(): BroadcastManager {
        if (!this.instance) {
            this.instance = new BroadcastManager();
        }
        return this.instance;
    }

    /**
     * 播报任务结果（人设化）
     * 使用 SendAgentInstanceLLM，让 AI 用人设语气播报
     */
    async broadcastResult(
        instanceId: string,
        result: TaskResult,
        priority: BroadcastPriority = 'Medium'
    ): Promise<void> {
        const broadcastText = this.formatResultText(result);

        console.log(`[BroadcastManager] Broadcasting result (${priority}):`, broadcastText.substring(0, 50));

        await sendZegoRequest('SendAgentInstanceLLM', {
            AgentInstanceId: instanceId,
            Text: `[系统消息 - 任务完成]\n${broadcastText}\n\n请用以上内容回复用户，使用自然的口语化表达。`,
            Priority: priority,
            AddAnswerToHistory: true
        });
    }

    /**
     * 播报纠正话术（精确控制）
     * 使用 SendAgentInstanceTTS，直接播报固定文本
     */
    async broadcastCorrection(
        instanceId: string,
        type: CorrectionType,
        priority: BroadcastPriority = 'High'
    ): Promise<void> {
        const templates = CORRECTION_TEMPLATES[type];
        const text = templates[Math.floor(Math.random() * templates.length)];

        console.log(`[BroadcastManager] Broadcasting correction (${type}):`, text);

        await sendZegoRequest('SendAgentInstanceTTS', {
            AgentInstanceId: instanceId,
            Text: text,
            Priority: priority,
            SamePriorityOption: 'Enqueue'
        });
    }

    /**
     * 播报错误信息
     */
    async broadcastError(
        instanceId: string,
        errorType: string,
        priority: BroadcastPriority = 'Medium'
    ): Promise<void> {
        const text = ERROR_MESSAGES[errorType] || ERROR_MESSAGES['unavailable'];

        console.log(`[BroadcastManager] Broadcasting error:`, text);

        await sendZegoRequest('SendAgentInstanceTTS', {
            AgentInstanceId: instanceId,
            Text: text,
            Priority: priority,
            SamePriorityOption: 'Enqueue'
        });
    }

    /**
     * 格式化任务结果为播报文本
     */
    private formatResultText(result: TaskResult): string {
        if (!result.success || !result.data) {
            return ERROR_MESSAGES[result.error?.type || 'unavailable'];
        }

        switch (result.taskType) {
            case 'weather':
                return this.formatWeatherResult(result.data as WeatherResult);
            default:
                return JSON.stringify(result.data);
        }
    }

    /**
     * 格式化天气结果
     */
    private formatWeatherResult(data: WeatherResult): string {
        const { location, temperature, weather, suggestion } = data;

        const personalizedSuggestion = this.personalizeSuggestion(suggestion);

        const templates = [
            `${location}今天${weather}，气温${temperature}，${personalizedSuggestion}`,
            `${location}今天是${weather}的天气，${temperature}，${personalizedSuggestion}`
        ];

        return templates[Math.floor(Math.random() * templates.length)];
    }

    /**
     * 人设化穿衣建议
     */
    private personalizeSuggestion(suggestion: string): string {
        if (suggestion.includes('厚') || suggestion.includes('保暖')) {
            return '有点凉哦，记得穿厚一点～';
        }
        if (suggestion.includes('雨') || suggestion.includes('带伞')) {
            return '记得带把伞，别淋湿了～';
        }
        if (suggestion.includes('热') || suggestion.includes('短袖')) {
            return '天气挺热的，别中暑了～';
        }
        return '今天是个好天气，出去走走吧～';
    }
}

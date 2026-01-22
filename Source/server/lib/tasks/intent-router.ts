/**
 * IntentRouter - 意图路由器 (理性脑)
 * 
 * 职责：分析 Raw ASR 文本，判断意图并提取参数
 * 
 * v2.2.0 MVP
 */

import axios from 'axios';
import { ConfigManager } from '../config';

/** 意图类型 */
export type IntentType = 'weather' | 'news' | 'chat';

/** 意图分析结果 */
export interface IntentResult {
    intent: IntentType;
    confidence: number;
    entities: Record<string, any>;
    reasoning?: string;
}

/** 意图路由配置 */
interface IntentRouterConfig {
    model: string;
    apiKey: string;
    modelServer: string;
}

export class IntentRouter {
    private static instance: IntentRouter;
    private config: IntentRouterConfig;

    static getInstance(): IntentRouter {
        if (!this.instance) {
            this.instance = new IntentRouter();
        }
        return this.instance;
    }

    constructor() {
        const configManager = ConfigManager.getInstance();
        const agentConfig = configManager.getAgentConfig('xiaoye');

        this.config = {
            model: 'qwen-max',  // 使用高精度模型进行意图识别
            apiKey: agentConfig?.bailian?.apiKey || '',
            modelServer: 'https://dashscope.aliyuncs.com/compatible-mode/v1'
        };
    }

    /**
     * 分析用户输入的意图
     */
    async analyzeIntent(rawText: string): Promise<IntentResult> {
        console.log(`[IntentRouter] Analyzing intent for: "${rawText}"`);

        try {
            const prompt = this.buildIntentPrompt(rawText);
            const response = await this.callLLM(prompt);
            const result = this.parseIntentResponse(response);

            console.log(`[IntentRouter] Intent result:`, result);
            return result;

        } catch (error: any) {
            console.error('[IntentRouter] Intent analysis failed:', error);
            // 降级为 chat 意图
            return {
                intent: 'chat',
                confidence: 0.5,
                entities: {},
                reasoning: 'Intent analysis failed, fallback to chat'
            };
        }
    }

    /**
     * 快速关键词预检测（用于提前判断是否可能是任务）
     */
    quickMatch(rawText: string): { isLikelyTask: boolean; possibleIntent: IntentType } {
        const weatherKeywords = ['天气', '温度', '穿什么', '热不热', '冷不冷', '下雨', '几度'];
        const newsKeywords = ['新闻', '早报', '晚报', '热点', '资讯'];

        const normalized = rawText.toLowerCase();

        if (weatherKeywords.some(kw => normalized.includes(kw))) {
            return { isLikelyTask: true, possibleIntent: 'weather' };
        }
        if (newsKeywords.some(kw => normalized.includes(kw))) {
            return { isLikelyTask: true, possibleIntent: 'news' };
        }

        return { isLikelyTask: false, possibleIntent: 'chat' };
    }

    /**
     * 构建意图识别 Prompt
     */
    private buildIntentPrompt(userInput: string): string {
        return `你是一个意图路由器。你的任务是分析用户的自然语言输入，判断其意图并提取相关参数。

## 支持的意图类型

| 意图 | 触发词示例 | 需提取的参数 |
|------|-----------|-------------|
| weather | 天气、温度、穿什么、下雨 | location (城市名) |
| news | 新闻、早报、晚报、热点 | category (可选) |
| chat | 其他所有情况 | - |

## 输出格式

严格输出 JSON，不要有任何额外文字：

{"intent": "weather" | "news" | "chat", "confidence": 0.0-1.0, "entities": {"location": "城市名 (若有)", "category": "类别 (若有)"}, "reasoning": "简短解释判断依据"}

## 边界情况

- "今天天气真好" → 可能是描述心情，confidence 应较低 (< 0.6)
- "深圳天气怎么样" → 明确任务，confidence 高 (>= 0.8)
- "我想知道北京的温度" → 明确任务，提取 location=北京

## 当前用户输入

${userInput}`;
    }

    /**
     * 调用 LLM 进行意图分析
     */
    private async callLLM(prompt: string): Promise<string> {
        const url = `${this.config.modelServer}/chat/completions`;

        const response = await axios.post(url, {
            model: this.config.model,
            messages: [
                { role: 'system', content: '你是一个精确的意图分类器，只输出 JSON。' },
                { role: 'user', content: prompt }
            ],
            temperature: 0.1,  // 低温度保证一致性
            max_tokens: 200
        }, {
            headers: {
                'Authorization': `Bearer ${this.config.apiKey}`,
                'Content-Type': 'application/json'
            },
            timeout: 5000  // 严格控制超时
        });

        return response.data?.choices?.[0]?.message?.content || '';
    }

    /**
     * 解析意图响应
     */
    private parseIntentResponse(response: string): IntentResult {
        try {
            // 提取 JSON
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                return {
                    intent: this.normalizeIntent(parsed.intent),
                    confidence: Math.min(1, Math.max(0, parsed.confidence || 0.5)),
                    entities: parsed.entities || {},
                    reasoning: parsed.reasoning
                };
            }
        } catch (e) {
            console.warn('[IntentRouter] Failed to parse intent response:', e);
        }

        // 解析失败，降级为 chat
        return {
            intent: 'chat',
            confidence: 0.3,
            entities: {},
            reasoning: 'Parse failed'
        };
    }

    /**
     * 标准化意图类型
     */
    private normalizeIntent(intent: string): IntentType {
        const lower = (intent || '').toLowerCase();
        if (lower === 'weather') return 'weather';
        if (lower === 'news') return 'news';
        return 'chat';
    }
}

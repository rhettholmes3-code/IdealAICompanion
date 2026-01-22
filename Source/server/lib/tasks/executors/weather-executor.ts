/**
 * WeatherExecutor - 天气查询执行器
 * 
 * 使用百炼 WebSearch MCP 服务查询天气
 * 
 * v2.2.0 MVP
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import axios from 'axios';
import { WeatherResult, TaskResult } from '../types';
import { ConfigManager } from '../../config';

export class WeatherExecutor {
    private apiKey: string;
    private model: string = 'qwen-plus';
    private baseUrl: string = 'https://dashscope.aliyuncs.com/compatible-mode/v1';
    private mcpServerUrl: string = 'https://dashscope.aliyuncs.com/api/v1/mcps/WebSearch/sse';

    constructor() {
        const configManager = ConfigManager.getInstance();
        const agentConfig = configManager.getAgentConfig('xiaoye');

        this.apiKey = agentConfig?.bailian?.apiKey || '';

        if (!this.apiKey) {
            console.error('[WeatherExecutor] Missing Bailian API Key');
        }
    }

    /**
     * 执行天气查询
     */
    async execute(location: string): Promise<TaskResult> {
        console.log(`[WeatherExecutor] Executing weather query for: ${location}`);

        try {
            // Step 1: 调用 WebSearch MCP 获取天气信息
            const searchResult = await this.callWebSearchMCP(location);
            console.log('[WeatherExecutor] Search result:', searchResult.substring(0, 300));

            // Step 2: 使用 LLM 解析搜索结果为结构化数据
            const weatherData = await this.parseWithLLM(searchResult, location);
            console.log('[WeatherExecutor] Weather result:', weatherData);

            return {
                success: true,
                taskType: 'weather',
                data: weatherData
            };

        } catch (error: any) {
            console.error('[WeatherExecutor] Weather query failed:', error);

            return {
                success: false,
                taskType: 'weather',
                error: {
                    type: this.categorizeError(error),
                    message: error.message || '天气查询失败'
                }
            };
        }
    }

    /**
     * 调用百炼 WebSearch MCP 服务
     */
    private async callWebSearchMCP(location: string): Promise<string> {
        console.log('[WeatherExecutor] Connecting to WebSearch MCP...');

        const transport = new SSEClientTransport(new URL(this.mcpServerUrl), {
            requestInit: {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`
                }
            }
        });

        const client = new Client({
            name: 'weather-executor',
            version: '1.0.0'
        });

        try {
            await client.connect(transport);
            console.log('[WeatherExecutor] MCP connected');

            // 调用搜索工具
            const result = await client.callTool({
                name: 'bailian_web_search',
                arguments: { query: `${location}今天天气` }
            });

            await client.close();

            // 提取搜索结果文本
            if (result.content && Array.isArray(result.content)) {
                const textContent = result.content.find((c: any) => c.type === 'text');
                if (textContent) {
                    return textContent.text;
                }
            }

            return JSON.stringify(result);

        } catch (error) {
            await client.close().catch(() => { });
            throw error;
        }
    }

    /**
     * 使用 LLM 解析搜索结果为结构化天气数据
     */
    private async parseWithLLM(searchResult: string, location: string): Promise<WeatherResult> {
        const url = `${this.baseUrl}/chat/completions`;

        const systemPrompt = `你是一个天气信息提取助手。请从搜索结果中提取指定城市的天气信息，并以 JSON 格式返回。

返回格式（只返回 JSON，不要其他内容）：
{"location":"城市名","temperature":"最低-最高°C","weather":"天气状况","suggestion":"穿衣建议","iconCode":"sunny/cloudy/rainy/snowy"}

穿衣建议规则：
- 温度 < 10°C：建议穿厚外套、羽绒服
- 温度 10-20°C：建议穿薄外套、长袖
- 温度 > 20°C：建议穿短袖、轻薄衣物
- 如果下雨：记得带伞

iconCode 规则：
- 晴/晴天 → sunny
- 多云/阴 → cloudy  
- 雨/雷雨/阵雨 → rainy
- 雪 → snowy`;

        const userPrompt = `请从以下搜索结果中提取 ${location} 今天的天气信息：

${searchResult}`;

        const response = await axios.post(url, {
            model: this.model,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            temperature: 0.1
        }, {
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json'
            },
            timeout: 15000
        });

        const content = response.data?.choices?.[0]?.message?.content || '';
        console.log('[WeatherExecutor] LLM parse result:', content);

        return this.parseResponse(content, location);
    }

    /**
     * 解析 LLM 响应为 WeatherResult
     */
    private parseResponse(response: string, defaultLocation: string): WeatherResult {
        try {
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                return {
                    location: parsed.location || defaultLocation,
                    temperature: parsed.temperature || '未知',
                    weather: parsed.weather || '未知',
                    suggestion: parsed.suggestion || '适当穿着',
                    iconCode: this.normalizeIconCode(parsed.iconCode || parsed.weather)
                };
            }
        } catch (e) {
            console.warn('[WeatherExecutor] Failed to parse JSON:', e);
        }

        return {
            location: defaultLocation,
            temperature: '未知',
            weather: '未知',
            suggestion: '适当穿着',
            iconCode: 'default'
        };
    }

    /**
     * 标准化天气图标代码
     */
    private normalizeIconCode(weather: string): WeatherResult['iconCode'] {
        const lower = (weather || '').toLowerCase();
        if (lower.includes('晴') || lower.includes('sunny')) return 'sunny';
        if (lower.includes('云') || lower.includes('阴') || lower.includes('cloudy')) return 'cloudy';
        if (lower.includes('雨') || lower.includes('rain')) return 'rainy';
        if (lower.includes('雪') || lower.includes('snow')) return 'snowy';
        return 'default';
    }

    /**
     * 分类错误类型
     */
    private categorizeError(error: any): 'location_unknown' | 'timeout' | 'unavailable' {
        if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
            return 'timeout';
        }
        if (error.message?.includes('location') || error.message?.includes('地点')) {
            return 'location_unknown';
        }
        return 'unavailable';
    }
}

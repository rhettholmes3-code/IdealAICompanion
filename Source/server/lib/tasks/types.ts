/**
 * 任务模块类型定义
 * v2.2.0 MVP
 */

/** 任务复杂度 */
export type TaskComplexity = 'low' | 'medium' | 'high';

/** 任务状态 */
export type TaskStatus = 'running' | 'completed' | 'failed';

/** 天气结果数据 */
export interface WeatherResult {
    location: string;
    temperature: string;
    weather: string;
    suggestion: string;
    iconCode: 'sunny' | 'cloudy' | 'rainy' | 'snowy' | 'default';
}

/** 任务结果 */
export interface TaskResult {
    success: boolean;
    taskType: string;
    data?: WeatherResult;
    error?: {
        type: 'location_unknown' | 'timeout' | 'unavailable';
        message: string;
    };
}

/** 任务调度请求参数 */
export interface TaskDispatchParams {
    taskType: string;
    params?: Record<string, any>;
    instanceId: string;
    roomId: string;
    userId: string;
}

/** MCP 工具配置 */
export interface MCPServerConfig {
    name: string;
    type: 'sse';
    url: string;
}

/** 任务 Agent 配置 */
export interface TaskAgentConfig {
    model: string;
    modelServer: string;
    apiKey: string;
    mcpServers: Record<string, MCPServerConfig>;
}

/** 意图类型 */
export type IntentType = 'weather' | 'news' | 'chat';

/** 意图分析结果 */
export interface IntentResult {
    intent: IntentType;
    confidence: number;
    entities: Record<string, any>;
    reasoning?: string;
}

/** 意图路由响应 */
export interface IntentRouteResponse {
    // MainLLM 是否判断为任务
    mainLLMIsTask: boolean;
    // TaskAgent 的意图分析结果
    intentResult: IntentResult;
    // 是否需要纠正
    needsCorrection: boolean;
    // 纠正类型
    correctionType?: 'downgrade' | 'upgrade';
    // 任务执行结果（如果执行了）
    taskResult?: TaskResult;
}


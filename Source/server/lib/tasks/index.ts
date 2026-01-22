/**
 * Tasks Module - 统一导出
 * 
 * v2.2.0 MVP
 */

// Core exports
export { IntentRouter } from './intent-router';
export { BroadcastManager } from './broadcast-manager';

// Executors
// export * from './task-agent'; // Deprecated in v2.2.0
export * from './executors/weather-executor';

// Types
export type {
    TaskComplexity,
    TaskStatus,
    WeatherResult,
    TaskResult,
    TaskDispatchParams,
    TaskAgentConfig,
    IntentType,
    IntentResult,
    IntentRouteResponse
} from './types';

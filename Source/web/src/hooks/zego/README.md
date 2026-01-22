# zego/ ZEGO RTC 子模块

从 `useZegoRTC.ts` 提取的类型定义和工具函数。

## 文件说明

### types.ts
```typescript
// 类型
export type AgentStatus = 'idle' | 'listening' | 'thinking' | 'speaking';
export interface UseZegoRTCProps { ... }
export interface SubtitleMessage { ... }

// 常量
export const AGENT_STATUS_MAP = { 0: 'idle', 1: 'listening', ... };
export const GAME_ALIASES = { '海龟汤': 'turtle_soup', ... };
```

### message-parser.ts
```typescript
// 从 LLM 输出中提取游戏元数据
extractGameMetadata(text) → { progress?: number; hint?: string }

// 提取情绪标签 (happy) 等
extractEmotion(text) → string | null

// 清理字幕文本（移除控制标签）
cleanSubtitleText(text) → string

// 组装增量文本片段
assembleTextFragments(segments: Map) → string
```

## 设计目的

1. **降低 useZegoRTC.ts 复杂度**: 从 562 行精简到约 380 行
2. **提高可测试性**: 纯函数可独立单元测试
3. **便于复用**: 类型和工具函数可在其他模块使用

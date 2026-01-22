# Hooks 层

本目录包含所有自定义 React Hooks。

## 目录结构

```
hooks/
├── zego/                    # ZEGO SDK 相关模块 (已拆分)
│   ├── types.ts             # 类型定义和常量
│   ├── message-parser.ts    # 消息解析工具函数
│   └── index.ts             # 模块导出
├── useZegoRTC.ts            # ZEGO RTC 核心 Hook
├── useActionDetector.ts     # 意图/动作检测 Hook
├── useSilenceDetector.ts    # 沉默检测 Hook
└── usePersonaEvolution.ts   # 人设演化 Hook
```

## 核心 Hooks 说明

### useZegoRTC (RTC 核心)
- **职责**: ZEGO Express SDK 封装，管理房间、推拉流、消息处理
- **返回值**: `{ startCall, endCall, toggleMic, agentStatus, subtitles, ... }`
- **依赖模块**: `./zego/types`, `./zego/message-parser`

### useSilenceDetector (沉默检测)
- **职责**: 检测用户沉默，触发 AI 主动问候
- **触发条件**: 沉默 10s/30s/60s 分级处理

### useActionDetector (意图检测)
- **职责**: 解析 Agent 输出中的 `[ACTION:TYPE:PARAM]` 标签
- **支持动作**: `GAME`, `GAME_END`, `NEWS` 等

### usePersonaEvolution (人设演化)
- **职责**: 通话结束后触发人设更新 API

## zego/ 子模块

| 文件 | 内容 |
|------|------|
| `types.ts` | `AgentStatus`, `UseZegoRTCProps`, `GAME_ALIASES` 等 |
| `message-parser.ts` | `extractGameMetadata`, `extractEmotion`, `cleanSubtitleText` |

## 使用示例

```tsx
import { useZegoRTC } from './hooks/useZegoRTC';
import type { AgentStatus } from './hooks/zego';
```

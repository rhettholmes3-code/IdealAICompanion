# Components 组件层

本目录包含所有 React UI 组件。

## 目录结构

```
components/
├── call/                    # 通话页面模块 (已拆分)
│   ├── AgentSelector.tsx    # Agent 选择模态框
│   ├── CallControls.tsx     # 通话控制按钮组
│   ├── CallHeader.tsx       # 通话页头部（状态/情绪/菜单）
│   ├── LandingView.tsx      # 落地页（通话前界面）
│   ├── constants.ts         # 常量和类型定义
│   └── index.ts             # 模块导出
├── CallPage.tsx             # 通话主页面（组合上述子组件）
├── GameStatusCard.tsx       # 游戏状态卡片
├── SubtitleDisplay.tsx      # 字幕展示组件
├── SystemPromptModal.tsx    # 系统 Prompt 调试弹窗
├── Toast.tsx                # Toast 通知组件
└── Waveform.tsx             # 音浪可视化组件
```

## 核心组件说明

### CallPage (通话主页面)
- **职责**: 组合子组件、管理全局状态、协调 hooks 交互
- **使用的 hooks**: `useZegoRTC`, `useSilenceDetector`, `usePersonaEvolution`
- **子组件**: `LandingView`, `CallHeader`, `CallControls`, `AgentSelector`

### call/ 子模块
| 组件 | 行数 | 职责 |
|------|------|------|
| `AgentSelector` | ~95 | Agent 选择弹窗，iOS 风格模态框 |
| `CallControls` | ~60 | 麦克风切换、挂断按钮 |
| `CallHeader` | ~85 | 状态徽章、情绪显示、更多菜单 |
| `LandingView` | ~70 | 通话前首页，开始通话按钮 |
| `constants` | ~55 | 共享常量、类型、工具函数 |

## 使用示例

```tsx
// 使用 call 模块
import { AgentSelector, CallControls, CONFIG } from './call';

// 直接使用主页面
import { CallPage } from './CallPage';
```

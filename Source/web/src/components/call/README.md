# call/ 通话页面模块

从 `CallPage.tsx` 拆分出的子组件集合，用于降低单文件复杂度。

## 文件说明

| 文件 | 职责 |
|------|------|
| `AgentSelector.tsx` | Agent 选择模态框，底部弹出式 iOS 风格设计 |
| `CallControls.tsx` | 通话控制区：麦克风切换、挂断按钮 |
| `CallHeader.tsx` | 通话页顶部：亲密度徽章、情绪显示、更多菜单（含清除上下文） |
| `LandingView.tsx` | 通话前落地页：设置按钮、开始通话按钮 |
| `constants.ts` | 共享配置（CONFIG）、类型（AgentInfo）、工具函数（findLastIndex） |
| `index.ts` | 统一导出 |

## 依赖关系

```
CallPage.tsx (父)
├── LandingView        ← 通话前显示
├── CallHeader         ← 通话中头部
├── CallControls       ← 通话中底部
└── AgentSelector      ← 模态框叠加
```

## 导入方式

```tsx
import { 
    AgentSelector, 
    CallControls, 
    CallHeader, 
    LandingView, 
    CONFIG,
    EMOTION_MAP 
} from './call';
import type { AgentInfo } from './call';
```

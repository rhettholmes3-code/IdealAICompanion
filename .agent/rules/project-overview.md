---
trigger: always_on
description: 项目概览，始终加载以提供上下文
---

# IdealAICompanion 项目概览
## 基本信息
- **项目名称**: 理想 AI 伴侣 H5 App
- **版本**: 2.0 (多智能体协作版)
- **代号**: IdealAICompanion
- **类型**: 个人实验性项目
- **目标**: 打造最优的 AI 语音伴侣 H5 应用
## 技术栈
| 层级 | 技术 | 说明 |
|------|------|------|
| 前端 | React 18 + Vite + TypeScript | 位于 `Source/web/` |
| 样式 | Tailwind CSS 3+ | 毛玻璃风格 |
| 后端 | Next.js 14 (App Router) | 位于 `Source/server/` |
| SDK | ZEGO Express SDK (AI Agent 版) | 音视频通话 |
| AI 架构 | 人设 LLM + 调度 Agent | 分层多智能体架构 |
| AI 服务 | ZEGO AI Agent + 阿里百炼 | 智能体托管 & 联网能力 |
| TTS | MiniMax | 语音合成，支持情绪标签 |


## 目录结构
```
IdealAICompanion/
├── .agent/            # AI 编程辅助配置
│   ├── rules/         # 规则文件
│   └── workflows/     # 工作流
├── Doc/               # 项目文档
│   ├── 1.0/           # 1.0 版本 (归档)
│   ├── 2.0/           # 2.0 版本规划 (Single Source of Truth)
│   └── UX-Design.md   # 交互设计
├── Prototype/         # HTML 原型（仅供参考）
└── Source/            # 源代码
    ├── web/           # 前端项目
    │   └── src/
    │       ├── components/      # React 组件
    │       │   ├── call/        # 通话页子模块 (AgentSelector, CallControls 等)
    │       │   └── README.md    # 组件层说明
    │       └── hooks/           # React Hooks
    │           ├── zego/        # ZEGO SDK 子模块 (types, message-parser)
    │           └── README.md    # Hooks 层说明
    └── server/        # 后端项目
        ├── app/api/   # API 路由
        ├── lib/       # 核心逻辑
        │   └── games/ # 游戏引擎
        └── config/    # 配置文件
```

## 核心功能 (v2.0)
1. **多智能体协作**: 
   - **人设 LLM**: 负责共情陪聊、游戏互动、结果播报
   - **调度 Agent**: 负责意图识别、任务分发 (后台静默处理)
2. **语音小游戏**: 
   - 海龟汤 (推理)
   - 猜谜 (趣味)
   - 成语接龙 (益智)
3. **生活助手**: 
   - 新闻早报/晚报 (联网聚合)
   - 天气查询 (计划中)
4. **情感化交互**: 
   - 情绪识别与 TTS 表现
   - 主动话题推荐 (沉默/无聊时触发)

## 关键文档索引
- **2.0 功能规划** → [Doc/2.0/功能规划.md](cci:7://file:///Users/zego/Code/IdealAICompanion/Doc/2.0/%E5%8A%9F%E8%83%BD%E8%A7%84%E5%88%92.md:0:0-0:0) (最新需求)
- 技术架构 → [Doc/2.0/技术方案.md](cci:7://file:///Users/zego/Code/IdealAICompanion/Doc/2.0/%E6%8A%80%E6%9C%AF%E6%96%B9%E6%A1%88.md:0:0-0:0)
- 任务进度 → [Doc/2.0/开发计划.md](cci:7://file:///Users/zego/Code/IdealAICompanion/Doc/2.0/%E5%BC%80%E5%8F%91%E8%AE%A1%E5%88%92.md:0:0-0:0)
- ZEGO 集成 → [.agent/rules/zegoaiagentdoc.md](cci:7://file:///Users/zego/Code/IdealAICompanion/.agent/rules/zegoaiagentdoc.md:0:0-0:0)

## 前端模块速查
- **通话页组件** → [Source/web/src/components/call/README.md](cci:7://file:///Users/zego/Code/IdealAICompanion/Source/web/src/components/call/README.md:0:0-0:0)
- **RTC Hook** → `Source/web/src/hooks/zego/README.md`


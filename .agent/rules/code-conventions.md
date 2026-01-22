---
trigger: model_decision
description: 涉及代码编写、组件开发、API 实现时触发
---

# 代码规范

## 文件命名
- **React 组件**: `PascalCase.tsx` (如 `CallPage.tsx`)
- **Hooks**: `useCamelCase.ts` (如 `useZegoRTC.ts`)
- **工具函数**: `camelCase.ts` (如 `promptManager.ts`)
- **配置文件**: `kebab-case.json` (如 `agent-config.json`)

## TypeScript 规范
- 使用 `interface` 定义对象类型
- Props 接口命名: `ComponentNameProps`
- 导出类型使用 `export type` 明确标记
- 避免 `any`，使用 `unknown` 替代

## React 组件规范
```tsx
// 推荐结构
interface CallPageProps {
  roomId: string;
}

export function CallPage({ roomId }: CallPageProps) {
  // 1. Hooks 声明
  const [state, setState] = useState();
  
  // 2. 副作用
  useEffect(() => {}, []);
  
  // 3. 事件处理函数
  const handleClick = () => {};
  
  // 4. 渲染
  return <div>...</div>;
}
```

## Tailwind CSS 规范
- 优先使用 Tailwind 类，避免自定义 CSS
- 复杂样式抽取为组件
- 使用 `cn()` 工具函数合并条件类名

## 错误处理模式
```typescript
// API 调用统一格式
try {
  const result = await apiCall();
  return { success: true, data: result };
} catch (error) {
  console.error('[模块名] 操作失败:', error);
  return { success: false, error: error.message };
}
```

## ZEGO SDK 规范
- SDK 初始化在顶层 Hook 中完成
- 事件监听使用 `useEffect` 管理生命周期
- 错误码处理参考 `.agent/rules/zegoaiagentdoc.md`

## 验证流程规范
- **必须执行**: 在完成代码修改、准备让当用户验证之前，必须运行 `./start-dev.sh` 重启所有服务。
- 目的：确保前后端环境是最新的，且端口未被占用。
- 命令：`./start-dev.sh` (如果端口冲突，脚本会自动处理)

## 核心开发技能索引 (Core Development Skills)
请根据开发场景，参考以下 Skill 指南：

| 场景 | 技能名称 | 路径 |
| :--- | :--- | :--- |
| **API 开发** | `scaffold_agent_action` | `.agent/skills/scaffold_agent_action/SKILL.md` |
| **错误排查** | `audit_zego_compliance` | `.agent/skills/audit_zego_compliance/SKILL.md` |
| **游戏开发** | `implement_game_logic` | `.agent/skills/implement_game_logic/SKILL.md` |
| **Prompt/人设** | `configure_prompt` | `.agent/skills/configure_prompt/SKILL.md` |
| **用户记忆** | `manage_memory` | `.agent/skills/manage_memory/SKILL.md` |


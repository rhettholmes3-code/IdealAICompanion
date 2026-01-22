---
description: 优化项目文件结构，拆分大文件以提升AI理解效率
---

# 优化项目文件结构 Workflow

此流程用于定期扫描和优化项目中的大文件，降低 AI 因文档过多导致的理解负担。

## 1. 扫描大文件

// turbo
```bash
# 扫描项目中的大文件（排除 node_modules 等）
find /Users/zego/Code/IdealAICompanion -type f \
  \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" -o -name "*.md" -o -name "*.xml" -o -name "*.css" \) \
  ! -path "*/node_modules/*" ! -path "*/.git/*" ! -path "*/dist/*" ! -path "*/.next/*" \
  -exec wc -l {} \; 2>/dev/null | sort -rn | head -30
```

**阈值参考**：
- 代码文件（`.ts`, `.tsx`）：超过 **500 行** 考虑拆分
- 文档文件（`.md`）：超过 **1500 行** 考虑拆分
- Hook 文件：超过 **400 行** 考虑拆分

## 2. 分析目标文件

对于需要拆分的文件：
1. 使用 `view_file_outline` 查看文件结构
2. 识别可独立的功能模块（函数、类、组件）
3. 确定拆分边界

## 3. 执行拆分

### 3.1 组件文件拆分策略

**创建子目录**：
```
components/
├── [原组件名]/          # 新建子目录
│   ├── index.ts         # 统一导出
│   ├── constants.ts     # 常量和类型
│   ├── [子组件1].tsx
│   ├── [子组件2].tsx
│   └── README.md        # 模块说明
└── [原组件名].tsx       # 重构后的主文件（仅组合子组件）
```

**拆分原则**：
- 每个子组件职责单一
- 共享状态通过 props 传递
- 常量和类型提取到 `constants.ts`
- 工具函数提取到独立文件

### 3.2 Hook 文件拆分策略

**创建子目录**：
```
hooks/
├── [hook名]/            # 新建子目录
│   ├── index.ts         # 统一导出
│   ├── types.ts         # 类型定义
│   ├── utils.ts         # 工具函数
│   └── README.md        # 模块说明
└── [hook名].ts          # 重构后的主文件
```

**拆分原则**：
- 类型定义使用 `type-only import`
- 纯函数提取为独立工具模块
- 保持主 hook 的 API 不变

### 3.3 文档文件拆分策略

**创建子目录**：
```
Doc/[版本]/
├── 技术方案.md          # 精简为索引文档
└── arch/                # 新建子目录
    ├── 系统架构.md
    ├── 前端实现.md
    └── 后端实现.md
```

## 4. 添加模块 README

为每个新创建的子目录添加 `README.md`：

```markdown
# [模块名]

## 文件说明
| 文件 | 职责 |
|------|------|
| xxx.ts | xxx |

## 依赖关系
[描述模块间的依赖]

## 使用示例
[代码示例]
```

## 5. 验证

// turbo
```bash
# 前端构建验证
cd /Users/zego/Code/IdealAICompanion/Source/web && npm run build
```

// turbo
```bash
# 后端构建验证（如有修改）
cd /Users/zego/Code/IdealAICompanion/Source/server && npm run build
```

## 6. 更新文档

如有需要，更新以下文件：
- `.agent/rules/project-overview.md` - 目录结构
- 相关模块的 README.md

---

## 历史执行记录

### 2026-01-14
- 拆分 `CallPage.tsx`：605 → 280 行
- 拆分 `useZegoRTC.ts`：562 → 380 行
- 添加 4 个模块 README

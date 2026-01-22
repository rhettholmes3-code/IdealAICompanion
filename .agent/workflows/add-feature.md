---
description: 添加新功能的标准流程
---

# 添加功能流程

## 1. 需求确认
- 确认功能范围和边界
- 确认涉及的页面/组件
- 确认是否需要新的 API 接口

## 2. 设计评审
- 更新技术方案（如需）
- 确认与现有架构的兼容性

## 3. 实现步骤

### 前端功能
// turbo
```bash
cd Source/web && npm run dev
```
- 创建/修改组件
- 添加必要的 Hooks
- 实现样式（Tailwind 优先）

### 后端功能
// turbo
```bash
cd Source/server && npm run dev
```
- 创建 API Route
- 实现业务逻辑
- 添加错误处理

## 4. 验证
// turbo
```bash
# 前端 lint 检查
cd Source/web && npm run lint

# 后端 lint 检查
cd Source/server && npm run lint
```

## 5. 文档更新
- 更新 `Doc/技术方案.md`（如有架构变更）
- 更新 `Doc/开发计划.md` 任务状态

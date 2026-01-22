---
description: 问题调试和修复流程
---

# 调试问题流程


## 0. 自动诊断 (Auto Diagnosis)
**推荐优先尝试**：让系统自动分析最近的错误日志并尝试修复。

### 1) 服务端日志分析
```bash
# 读取服务端错误日志
tail -n 50 Source/server/logs/zego_errors.jsonl
```

### 2) 前端上报日志分析
```bash
# 读取前端上报的错误日志
tail -n 50 Source/server/logs/frontend_errors.jsonl
```

### 3) 诊断策略
- **运行 Skill**: 使用 `diagnose_errors` 技能来匹配已知错误模式（如 ZEGO 错误码、MongoDB 冲突、DNS 问题等）。
- **ActionReporter Error**: 检查前端组件状态或网络连接。

---

## 1. 问题分类
 
### RTC/ZEGO 相关问题
- 参考 `.agent/rules/zegoaiagentdoc.md`
- 使用 ZEGO MCP 工具搜索文档
- 检查错误码含义

### 前端问题
- 检查浏览器控制台
- 确认组件 Props 传递
- 检查 React 状态更新

### 后端问题
- 查看 Next.js 日志
- 检查 API 请求/响应
- 验证环境变量配置

## 2. 排查步骤

1. **复现问题**
   - 确定触发条件
   - 记录错误信息

2. **定位原因**
   - 检查相关代码
   - 分析调用链路

3. **验证修复**
// turbo
```bash
cd Source/web && npm run dev
```

## 3. 经验沉淀
修复后评估是否需要：
- 更新 `code-conventions.md` 添加规范
- 创建新的规则避免类似问题

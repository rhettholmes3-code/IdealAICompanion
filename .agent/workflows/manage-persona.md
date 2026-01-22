---
description: 管理和更新 AI 人设 (Prompt/配置) 的流程
---

# 人设管理流程

## 1. 确定变更范围
- [ ] 是调整语气/性格？ -> 修改 `config/prompts/fragments/character.txt`
- [ ] 是增加新能力？ -> 修改 `xiaoye.xml` 的 `<capability_guide>`
- [ ] 是修改基础配置 (音色/模型)？ -> 修改 `config/agents/xiaoye.json`

## 2. 执行变更
- [ ] **Prompt 修改**:
    - 保持 xml 结构完整
    - 确保动态变量 `{{VAR}}` 占位符正确
    - 使用 `render_prompt` 工具本地验证渲染结果
- [ ] **配置修改**:
    - 确认 JSON 格式合法
    - 确认模型参数 (Temperature/TopP) 适用

## 3. 验证一致性
- [ ] 检查 Dispatcher Agent 是否需要同步感知新能力
- [ ] 检查前端情感标签映射是否需要更新 (如果修改了情感列表)

## 4. 部署与测试
- [ ] 重启 Server (Next.js 热更通常足够，但配置加载可能需要重启)
- [ ] 使用 /api/debug/prompt 查看实际生成的 System Prompt
- [ ] 进行语音对话测试，确认变更生效且无副作用

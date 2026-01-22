---
description: 添加新语音小游戏 (海龟汤/猜谜等) 的标准流程
---

# 添加语音小游戏流程

## 1. 游戏设计
- [ ] 确定游戏类型 (推理/问答/接龙)
- [ ] 设计游戏状态机 (开始/进行中/暂停/结束)
- [ ] 准备题库数据 (JSON 格式)

## 2. 后端实现
- [ ] 在 `Source/server/lib/games/` 创建游戏类 (继承 `GameBase`)
- [ ] 实现核心逻辑:
    - `startGame()`
    - `processInput(userText)` -> 返回 AI 回复 + 游戏状态
    - `getHint()`
- [ ] 在 `GameManager` 中注册新游戏

## 3. Prompt 更新
- [ ] 更新 **Dispatcher Agent**: 添加新游戏意图识别
- [ ] 更新 **Persona LLM**: 在 `<game_state>` 中添加新游戏类型支持

## 4. ASR 热词配置
- [ ] 在 `xiaoye.json` 的 `asr.hotword_list` 中添加游戏专用词汇
    - 示例: "海龟汤|10", "上一题|10", "重来|10"

## 5. 测试验证
- [ ] 单元测试: 测试游戏逻辑类
- [ ] 集成测试: 模拟用户语音输入，验证状态流转
- [ ] 体验测试: 确认延迟和趣味性

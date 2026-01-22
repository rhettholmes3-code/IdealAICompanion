---
description: 添加新 AI 智能体的自动化流程
---

# 添加新智能体工作流

当用户要求添加新智能体时，收集以下信息后自动创建配置文件。

## 必须收集的信息

1. **智能体名称** (中文，如"小枫")
2. **智能体定位/性格描述** (如"知心小姐姐，擅长倾听和解决生活问题")
3. **TTS 音色** (默认使用 `female-shaonv`，可选其他 MiniMax 音色)
4. **LLM 配置** (是否使用自定义 URL/Vendor，默认使用通用配置)

## 自动执行步骤

// turbo-all

### 1. 生成智能体 ID
- 将中文名转为拼音作为 ID (如 "小枫" → "xiaofeng")
- ID 必须全小写，无空格

### 2. 创建配置文件 `Source/server/config/agents/{id}.json`
使用以下模板：
```json
{
    "id": "{id}",
    "zego_agent_id": "xiaoyeV1",
    "name": "{中文名称}",
    "backgroundImage": "/{id}_avatar.png",
    "agent_info": {
        "name": "{中文名称}",
        "description": "{简短描述}",
        "llm": {
            "Vendor": "OpenAIChat",
            "Url": "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
            "ApiKey": "zego_test",
            "Model": "qwen-plus",
            "MaxTokens": 100
        }
    },
    "tts": {
        "Vendor": "MiniMax",
        "Params": {
            "app": { "api_key": "zego_test" },
            "model": "speech-2.6-turbo",
            "voice_setting": { "voice_id": "female-shaonv" }
        },
        "FilterTags": {
            "Enabled": true,
            "Pattern": "\\([^)]+\\)"
        }
    },
    "asr": {
        "Vendor": "Tencent",
        "VADSilenceSegmentation": 500,
        "Params": { "hotword_list": "{中文名称}|10,ZEGO|10" }
    },
    "prompt": { "template": "{id}.xml" },
    "bailian": {
        "appId": "76909134450749d28ace931e340257c1",
        "apiKey": "sk-1aabae3cce604ddb82b78e315363beb2"
    }
}
```

### 3. 创建 Prompt 文件 `Source/server/config/prompts/{id}.xml`
根据用户提供的性格/定位描述，生成符合格式的 XML 文件，包含：
- `<vibe_check>` 3个关键词描述
- `<character_profile>` 详细性格描述
- `<relationship_evolution>` 关系演进模板
- `<target_user>` 目标用户画像
- `<scene_context>` 场景上下文模板
- `<output_rules>` 输出格式规范
- `<examples>` 3-4个示例对话

### 4. 提醒用户
- 需要准备头像图片 `/{id}_avatar.png` 放到 `Source/web/public/`
- 刷新页面后新智能体会自动出现在选择列表

## 可选配置

如果用户提供了自定义 LLM 配置（如百炼应用 URL），则替换默认的 llm 块：
```json
"llm": {
    "Vendor": "OpenAIResponses",
    "Url": "{用户提供的 URL}",
    "ApiKey": "{用户提供的 ApiKey}",
    "MaxTokens": 100
}
```

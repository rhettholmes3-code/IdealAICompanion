import { sendZegoRequest } from '@/lib/zego';
import { PromptManager } from '@/lib/prompt-manager';
import { ConfigManager } from '@/lib/config';
import { MemoryManager } from '@/lib/memory-manager';

export async function POST(req: Request) {
    try {
        const { roomId, userId, userStreamId, agentId } = await req.json();

        // 获取指定 Agent 配置
        const configManager = ConfigManager.getInstance();
        const config = configManager.getAgentConfig(agentId || 'xiaoye');

        if (!config) {
            return Response.json({ error: 'Agent config not found' }, { status: 404 });
        }

        // 构建 RTC 对象 - ZEGO AI Agent 必需的参数
        const RTC = {
            RoomId: roomId,
            AgentStreamId: `agent_${config.id}_${Date.now()}`,
            AgentUserId: `agent_${config.id}`,
            UserStreamId: userStreamId,
        };

        console.log(`[Agent Create] Creating instance for ${config.id} (${config.name})`);

        // 获取用户记忆 (User Profile + Relationship)
        const memoryManager = MemoryManager.getInstance();
        const userMemory = await memoryManager.getUserMemory(userId, config.id);

        // 构造 Prompt 变量覆盖
        const promptOverrides: any = {};
        if (userMemory) {
            console.log(`[Agent Create] Injecting memory for user ${userId}`);
            promptOverrides.TARGET_USER = userMemory.targetUser;
            promptOverrides.RELATIONSHIP_EVOLUTION = userMemory.relationshipEvolution;
        }

        // 使用新版 PromptManager 生成 Prompt
        const promptManager = PromptManager.getInstance();
        const systemPrompt = promptManager.generateFinalPrompt(config.id, 'chat', promptOverrides);

        // 调用 ZEGO 接口创建智能体实例
        const payload = {
            AgentId: config.zego_agent_id,
            UserId: userId,
            RTC: RTC,
            MessageHistory: {
                SyncMode: 1,
                Messages: [],
                WindowSize: 10
            },
            AdvancedConfig: {
                LLMMetaInfo: {
                    BeginCharacters: "[[",
                    EndCharacters: "]]"
                }
            },
            LLM: {
                Vendor: config.agent_info.llm.Vendor,
                Url: config.agent_info.llm.Url,
                ApiKey: config.agent_info.llm.ApiKey,
                Model: config.agent_info.llm.Model,
                SystemPrompt: systemPrompt,
                // 🔥 以下参数严格按照 JSON 配置：有则传，没有则不传
                ...(config.agent_info.llm.MaxTokens !== undefined && { MaxTokens: config.agent_info.llm.MaxTokens }),
                ...(config.agent_info.llm.PresencePenalty !== undefined && { PresencePenalty: config.agent_info.llm.PresencePenalty }),
                ...(config.agent_info.llm.FrequencyPenalty !== undefined && { FrequencyPenalty: config.agent_info.llm.FrequencyPenalty })
            },
            TTS: {
                Vendor: config.tts.Vendor,
                Params: config.tts.Params,
                FilterText: config.tts.FilterTags?.Enabled ? [
                    { BeginCharacters: '(', EndCharacters: ')' },
                    { BeginCharacters: '（', EndCharacters: '）' },
                    // 移除 [] 过滤，因为这会导致 Cmd 4 数据流中的 Action Tag 被过滤掉，前端无法识别
                    // { BeginCharacters: '[', EndCharacters: ']' },
                    { BeginCharacters: '【', EndCharacters: '】' }
                ] : undefined
            },
            ASR: {
                Vendor: config.asr.Vendor, // Ensure Vendor is added to agent json files
                // VADSilenceSegmentation is top level in json? No, it's usually inside ASR object in ZEGO API?
                // Let's check config.ts interface: asr: { Vendor, VADSilenceSegmentation, Params }
                // We should pass these structure correctly.
                VADSilenceSegmentation: config.asr.VADSilenceSegmentation,
                Params: config.asr.Params
            }
        };

        console.log('[Agent Create] Payload:', JSON.stringify(payload, null, 2));

        // Write payload to file for debugging
        const fs = require('fs');
        const path = require('path');
        fs.writeFileSync(path.join(process.cwd(), 'debug_payload.json'), JSON.stringify(payload, null, 2));

        const result = await sendZegoRequest('CreateAgentInstance', payload);

        console.log('[Agent Create] Result:', result);
        return Response.json({
            ...result,
            systemPrompt: payload.LLM.SystemPrompt
        });
    } catch (error) {
        console.error('[Agent Create] Error:', error);
        return Response.json({ error: 'Failed to create agent instance' }, { status: 500 });
    }
}

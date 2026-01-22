import { sendZegoRequest } from '@/lib/zego';
import { getSystemPrompt } from '@/lib/prompt-manager';
import agentConfig from '@/config/agent-config.json';

const AGENT_ID = 'xiaoyeV1';

export async function POST(req: Request) {
    try {
        const body = await req.json().catch(() => ({}));
        const action = body.action || 'RegisterAgent';
        const { agent_info, tts, asr, prompts } = agentConfig;

        // 获取默认模板名
        const templateName = Object.values(prompts.templates)[0] as string;

        // 构造请求 Body - 直接使用 agent-config.json 中的配置
        const registerBody = {
            AgentId: AGENT_ID,
            Name: agent_info.name,
            LLM: {
                Vendor: agent_info.llm.Vendor,
                Url: agent_info.llm.Url,
                ApiKey: agent_info.llm.ApiKey,
                Model: agent_info.llm.Model,
                SystemPrompt: getSystemPrompt(templateName, {}, undefined), // 注册时不需要用户画像
            },
            TTS: {
                Vendor: tts.Vendor,
                Params: tts.Params  // 已包含 api_key
            },
            ASR: {
                ...asr,
                Visibility: asr.Visibility
            }
        };

        console.log(`[Agent ${action}] Body:`, JSON.stringify(registerBody, null, 2));

        // 根据 action 类型执行不同操作
        let result;
        if (action === 'UnregisterAgent') {
            const targetAgentId = body.agentId || AGENT_ID;
            result = await sendZegoRequest('UnregisterAgent', { AgentId: targetAgentId });
        } else if (action === 'UpdateAgent') {
            result = await sendZegoRequest('UpdateAgent', registerBody);
        } else {
            result = await sendZegoRequest('RegisterAgent', registerBody);
        }

        return Response.json(result);
    } catch (error: any) {
        console.error('[Agent Register] Error:', error);
        return Response.json({
            error: 'Failed to register/update agent',
            details: error.response?.data || error.message
        }, { status: 500 });
    }
}

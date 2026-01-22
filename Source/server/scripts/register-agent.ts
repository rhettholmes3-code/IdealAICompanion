import axios from 'axios';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

// 配置信息
const appId = 453368898;
const appSign = '34213329535262582baef196fca834e5';
const agentApiUrl = 'https://aigc-aiagent-api.zegotech.cn';
const agentId = 'xiaoyeV1';

function generateSignature(appId: number, signatureNonce: string, serverSecret: string, timestamp: number) {
    const hash = crypto.createHash('md5');
    const str = appId + signatureNonce + serverSecret + timestamp;
    hash.update(str);
    return hash.digest('hex');
}

async function register() {
    console.log('--- Starting Agent Registration ---');

    // 读取配置
    const configPath = path.join(process.cwd(), 'config/agent-config.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

    // 构建注册数据
    const registerBody = {
        AgentId: agentId,
        Name: config.agent_info.name,
        LLM: {
            Vendor: config.agent_info.llm.Vendor,
            Url: config.agent_info.llm.Url,
            ApiKey: config.agent_info.llm.ApiKey,
            Model: config.agent_info.llm.Model,
            SystemPrompt: "你是一个贴心的 AI 伴侣小叶...", // 简化处理，或从文件读取
            Visibility: config.agent_info.llm.Visibility
        },
        TTS: {
            Vendor: config.tts.Vendor,
            Params: config.tts.Params
        },
        ASR: {
            ...config.asr,
            Visibility: config.asr.Visibility
        }
    };

    const signatureNonce = crypto.randomBytes(8).toString('hex');
    const timestamp = Math.round(Date.now() / 1000);
    const signature = generateSignature(appId, signatureNonce, appSign, timestamp);

    const url = `${agentApiUrl}?Action=UpdateAgent&AppId=${appId}&SignatureNonce=${signatureNonce}&Timestamp=${timestamp}&Signature=${signature}&SignatureVersion=2.0`;

    try {
        const response = await axios.post(url, registerBody);
        console.log('Registration Response:', JSON.stringify(response.data, null, 2));
        if (response.data.Code === 0) {
            console.log('✅ Agent Registered Successfully!');
        } else {
            console.log('❌ Registration Failed:', response.data.Message);
        }
    } catch (error: any) {
        console.error('API Error:', error.response?.data || error.message);
    }
}

register();

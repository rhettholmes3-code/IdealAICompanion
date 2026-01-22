import axios from 'axios';
import crypto from 'crypto';
import { CONFIG } from '../config/env';
import fs from 'fs';
import path from 'path';

/**
 * 生成 ZEGO 服务端 API 签名
 * Signature = md5(AppId + SignatureNonce + ServerSecret + Timestamp)
 */
function generateSignature(appId: number, signatureNonce: string, serverSecret: string, timestamp: number) {
    const hash = crypto.createHash('md5');
    const str = appId + signatureNonce + serverSecret + timestamp;
    hash.update(str);
    return hash.digest('hex');
}

// 封装 ZEGO 服务端 API 请求
export async function sendZegoRequest(action: string, params: Record<string, any>, baseUrl?: string, method: 'POST' | 'GET' = 'POST') {
    const signatureNonce = crypto.randomBytes(8).toString('hex');
    const timestamp = Math.round(Date.now() / 1000);
    const signature = generateSignature(CONFIG.appId, signatureNonce, CONFIG.appSign, timestamp);

    // 默认使用 Agent API，允许覆盖 (例如 RTC 接口 SendBroadcastMessage 需要 rtc-api)
    const apiUrl = baseUrl || CONFIG.agentApiUrl;

    // 公共参数放在 Query 中
    const url = `${apiUrl}?Action=${action}&AppId=${CONFIG.appId}&SignatureNonce=${signatureNonce}&Timestamp=${timestamp}&Signature=${signature}&SignatureVersion=2.0`;

    // 详细日志
    console.log('========== ZEGO API Request ==========');
    console.log('URL:', url);
    console.log('Method:', method);
    console.log('Params:', JSON.stringify(params, null, 2));
    console.log('=======================================');

    try {
        let response;
        if (method.toUpperCase() === 'GET') {
            response = await axios.get(url, { params });
        } else {
            response = await axios.post(url, params, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });
        }
        const data = response.data;
        console.log('ZEGO API Response:', JSON.stringify(data, null, 2));

        // 自动错误诊断与检查
        if (data.Code !== 0) {
            const code = data.Code;
            let advice = '';

            switch (code) {
                case 410000003: // Payload param error
                    advice = '❌ 参数缺失或错误。特别是 LLM 相关接口，请检查 Url, Vendor, Model 是否完整传递。';
                    break;
                case 410000018: // QPS limit
                    advice = '⚠️ 请求过于频繁 (QPS Limit)。请稍后重试或减少并发。';
                    break;
                case 410000001: // Internal error
                    advice = '❌ ZEGO 服务端内部错误。请保留 RequestId 联系技术支持。';
                    break;
                default:
                    advice = `❌ 未知错误码 ${code}。请查阅 ZEGO 官方文档。`;
            }

            console.error(`\n[ZEGO API AUTO-CHECK] Detected Error: ${code}`);
            console.error(`[Diagnosis]: ${advice}`);
            console.error(`[Request Body]:`, JSON.stringify(params, null, 2));
            console.error(`[RequestId]: ${data.RequestId}\n`);

            // 自动写入错误日志文件 (JSONL 格式)
            try {
                const logDir = path.join(process.cwd(), 'logs');
                if (!fs.existsSync(logDir)) {
                    fs.mkdirSync(logDir, { recursive: true });
                }
                const logEntry = {
                    timestamp: new Date().toISOString(),
                    code,
                    message: data.Message,
                    advice,
                    action,
                    params,
                    requestId: data.RequestId
                };
                fs.appendFileSync(
                    path.join(logDir, 'zego_errors.jsonl'),
                    JSON.stringify(logEntry) + '\n'
                );
            } catch (err) {
                console.error('[ZEGO API AUTO-CHECK] Failed to write log file:', err);
            }

            // 对于关键业务，这里可以抛出带有诊断信息的 Error，让上层捕获
            // throw new Error(`ZEGO API Error ${code}: ${data.Message} - ${advice}`);
        }

        return data;
    } catch (error) {
        if (axios.isAxiosError(error) && error.response) {
            console.error(`ZEGO API [${action}] failed with status ${error.response.status}:`, error.response.data);
            return error.response.data;
        } else {
            console.error(`ZEGO API [${action}] unexpected error:`, error);
        }
        throw error;
    }
}

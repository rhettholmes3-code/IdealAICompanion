/**
 * /api/task/analyze - 意图分析 API
 * 
 * 接收 Raw ASR 文本，进行意图分析并执行任务
 * 
 * v2.2.0 MVP
 */

import { NextRequest, NextResponse } from 'next/server';
import { IntentRouter } from '@/lib/tasks/intent-router';
import { WeatherExecutor } from '@/lib/tasks/executors/weather-executor';
import { BroadcastManager } from '@/lib/tasks/broadcast-manager';
import { IntentRouteResponse, TaskResult } from '@/lib/tasks/types';

// 置信度阈值
const CONFIDENCE_THRESHOLD = 0.6;

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const {
            rawText,           // Raw ASR 文本
            instanceId,        // ZEGO Agent Instance ID
            roomId,            // 房间 ID
            userId,            // 用户 ID
            mainLLMIsTask      // MainLLM 是否判断为任务（可选，用于兜底矩阵）
        } = body;

        // 参数校验
        if (!rawText || !instanceId || !roomId) {
            return NextResponse.json(
                { error: 'Missing required parameters: rawText, instanceId, roomId' },
                { status: 400 }
            );
        }

        console.log(`[API /task/analyze] Raw text: "${rawText}", mainLLMIsTask: ${mainLLMIsTask}`);

        const intentRouter = IntentRouter.getInstance();
        const broadcastManager = BroadcastManager.getInstance();

        // Step 1: 分析意图
        const intentResult = await intentRouter.analyzeIntent(rawText);
        const taskAgentIsTask = intentResult.intent !== 'chat' && intentResult.confidence >= CONFIDENCE_THRESHOLD;

        // Step 2: 构建响应
        const response: IntentRouteResponse = {
            mainLLMIsTask: mainLLMIsTask ?? false,
            intentResult,
            needsCorrection: false,
            correctionType: undefined,
            taskResult: undefined
        };

        // Step 3: 检查是否需要纠正（兜底矩阵）
        if (mainLLMIsTask !== undefined) {
            if (mainLLMIsTask && !taskAgentIsTask) {
                // MainLLM 认为是任务，TaskAgent 认为不是 → 降级纠正
                response.needsCorrection = true;
                response.correctionType = 'downgrade';

                console.log('[API /task/analyze] Correction needed: downgrade');
                await broadcastManager.broadcastCorrection(instanceId, 'downgrade');

            } else if (!mainLLMIsTask && taskAgentIsTask) {
                // MainLLM 认为不是任务，TaskAgent 认为是 → 升级纠正
                response.needsCorrection = true;
                response.correctionType = 'upgrade';

                console.log('[API /task/analyze] Correction needed: upgrade');
                await broadcastManager.broadcastCorrection(instanceId, 'upgrade');
            }
        }

        // Step 4: 执行任务（如果是任务）
        if (taskAgentIsTask) {
            let taskResult: TaskResult | undefined;

            switch (intentResult.intent) {
                case 'weather':
                    const location = intentResult.entities.location || '北京';
                    const weatherExecutor = new WeatherExecutor();
                    taskResult = await weatherExecutor.execute(location);
                    break;

                case 'news':
                    // TODO: v2.2.1 实现
                    console.log('[API /task/analyze] News task not implemented yet');
                    break;
            }

            if (taskResult) {
                response.taskResult = taskResult;

                // 播报结果
                await broadcastManager.broadcastResult(instanceId, taskResult);
            }
        }

        console.log('[API /task/analyze] Response:', {
            intent: response.intentResult.intent,
            confidence: response.intentResult.confidence,
            needsCorrection: response.needsCorrection,
            hasTaskResult: !!response.taskResult
        });

        return NextResponse.json(response);

    } catch (error: any) {
        console.error('[API /task/analyze] Error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}

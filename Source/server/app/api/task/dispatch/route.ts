/**
 * 任务调度 API 入口
 * POST /api/task/dispatch
 * 
 * v2.2.0 MVP: 天气查询
 */

import { NextRequest, NextResponse } from 'next/server';
import { TaskAgent } from '@/lib/tasks';
import { TaskDispatchParams } from '@/lib/tasks/types';
import { sendZegoRequest } from '@/lib/zego';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { taskType, params, instanceId, roomId, userId } = body as TaskDispatchParams;

        // 参数校验
        if (!taskType || !instanceId || !roomId || !userId) {
            return NextResponse.json(
                { error: 'Missing required parameters: taskType, instanceId, roomId, userId' },
                { status: 400 }
            );
        }

        console.log(`[Task Dispatch] Received task: ${taskType}`, { params, roomId });

        // 获取 TaskAgent 实例
        const taskAgent = TaskAgent.getInstance();

        // 根据任务类型执行
        let result;
        switch (taskType) {
            case 'weather':
                result = await taskAgent.executeWeatherTask({ taskType, params, instanceId, roomId, userId });
                break;
            default:
                return NextResponse.json(
                    { error: `Unknown task type: ${taskType}` },
                    { status: 400 }
                );
        }

        // 生成人设化播报文本并注入到 LLM
        const broadcastText = taskAgent.formatBroadcastText(result);

        console.log(`[Task Dispatch] Broadcasting: ${broadcastText.substring(0, 50)}...`);

        await sendZegoRequest('SendAgentInstanceLLM', {
            AgentInstanceId: instanceId,
            Text: `[系统消息 - 天气查询完成]\n${broadcastText}\n\n请用以上内容回复用户，使用自然的口语化表达。`,
            Priority: 'Medium',
            AddAnswerToHistory: true
        });

        // 返回结果给前端（用于显示卡片）
        return NextResponse.json({
            taskId: `task_${Date.now()}`,
            taskType,
            status: result.success ? 'completed' : 'failed',
            result: result
        });

    } catch (error: any) {
        console.error('[Task Dispatch Error]', error);
        return NextResponse.json(
            { error: error.message || 'Task dispatch failed' },
            { status: 500 }
        );
    }
}

import { NextResponse } from 'next/server';
import { sendZegoRequest } from '@/lib/zego';

import { GameSessionManager } from '@/lib/games/session-manager';

export async function POST(req: Request) {
    try {
        const { agentInstanceId, roomId } = await req.json();

        if (!agentInstanceId) {
            return NextResponse.json({ error: 'agentInstanceId is required' }, { status: 400 });
        }

        console.log('[Agent Destroy] Destroying instance:', agentInstanceId, 'Room:', roomId);

        // 1. 调用 ZEGO 接口销毁智能体实例
        const result = await sendZegoRequest('DeleteAgentInstance', {
            AgentInstanceId: agentInstanceId
        });

        // 2. 清理游戏会话 (防止刷新后 Session 卡死在 playing 状态)
        if (roomId) {
            try {
                const sessionManager = GameSessionManager.getInstance();
                console.log('[Agent Destroy] Clearing game session for room:', roomId);
                sessionManager.clearSession(roomId);
            } catch (e) {
                console.error('[Agent Destroy] Failed to clear game session:', e);
            }
        }

        console.log('[Agent Destroy] Result:', result);
        return NextResponse.json(result);
    } catch (error) {
        console.error('[Agent Destroy] Error:', error);
        return NextResponse.json({ error: 'Failed to destroy agent instance' }, { status: 500 });
    }
}

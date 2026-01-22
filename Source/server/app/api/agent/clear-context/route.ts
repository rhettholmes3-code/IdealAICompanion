import { sendZegoRequest } from '@/lib/zego';

export async function POST(req: Request) {
    try {
        const { agentInstanceId } = await req.json();

        if (!agentInstanceId) {
            return Response.json({ error: 'AgentInstanceId is required' }, { status: 400 });
        }

        console.log(`[Clear Context] Request for instance: ${agentInstanceId}`);

        // Call ZEGO API: ResetAgentInstanceMsgList
        const result = await sendZegoRequest('ResetAgentInstanceMsgList', {
            AgentInstanceId: agentInstanceId
        });

        console.log('[Clear Context] ZEGO Result:', result);

        if (result.Code === 0) {
            return Response.json({ success: true, message: 'Context cleared successfully' });
        } else {
            return Response.json({ success: false, error: result.Message || 'Failed to clear context' }, { status: 500 });
        }

    } catch (error) {
        console.error('[Clear Context] Error:', error);
        return Response.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

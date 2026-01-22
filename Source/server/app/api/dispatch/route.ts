import { ActionDispatcher } from '@/lib/action-dispatcher';

const dispatcher = new ActionDispatcher();

export async function POST(req: Request) {
    try {
        const body = await req.json();

        const { action, params, instanceId, roomId } = body;

        if (!action || !instanceId) {
            return Response.json({ error: 'Missing required fields: action, instanceId' }, { status: 400 });
        }

        // 触发分发逻辑
        // 注意：根据技术方案，这里是双流响应的一部分，前端已经开始播放安抚语
        // 后端可以立即返回 success，或者等待 dispatch 完成
        // 考虑到 Node.js Event Loop，await dispatch 也是非阻塞的（如果内部有 IO），
        // 但为了请求快速结束，建议如果 dispatch 很慢则不要 await，但目前 dispatch 内部也是异步 IO，await 是安全的。
        const result = await dispatcher.dispatch({ action, params, instanceId, roomId });

        return Response.json(result);
    } catch (error) {
        console.error('[API] /api/dispatch error:', error);
        return Response.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

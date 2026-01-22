import { PersonaManager } from '@/lib/persona-manager';
import fs from 'fs';
import path from 'path';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { roomId, agentId, agentInstanceId, userId, transcript, sessionId, isFinal } = body;

        if (!roomId || !agentId || !transcript) {
            return Response.json({ error: 'Missing required parameters' }, { status: 400 });
        }

        const manager = PersonaManager.getInstance();
        const result = await manager.evolve(roomId, agentId, transcript, sessionId, isFinal, agentInstanceId, userId);

        if (result.success) {
            return Response.json(result);
        } else {
            console.error('[API evolve] failed:', result.updates);
            return Response.json({ error: 'Evolution process failed', details: result.updates }, { status: 500 });
        }
    } catch (error: any) {
        console.error('[API evolve] error:', error);
        return Response.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}

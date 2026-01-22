import { NextResponse } from 'next/server';
import { TurtleSoupController } from '@/lib/games/turtle-soup-controller';

// Keep controller instance globally to reuse dependencies
const controller = new TurtleSoupController();

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { roomId, agentInstanceId, agentId, userInput, conversationHistory } = body;

        if (!roomId || !agentInstanceId || !userInput) {
            return NextResponse.json({ success: false, error: 'Missing required parameters' }, { status: 400 });
        }

        // Pass agentId (default to 'xiaoye' if missing)
        const result = await controller.analyzeUserInput(roomId, agentInstanceId, userInput, conversationHistory || [], agentId || 'xiaoye');

        return NextResponse.json(result);
    } catch (error: any) {
        console.error('[API] /game/analyze error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

import { NextResponse } from 'next/server';
import { GameEngine } from '@/lib/games/game-engine';
import { TurtleSoupController } from '@/lib/games/turtle-soup-controller';

export async function GET() {
    const logs: string[] = [];
    const log = (msg: string) => logs.push(msg);

    try {
        const roomId = 'test_room_' + Date.now();
        const instanceId = 'test_agent_instance';

        // 1. Start Game
        const engine = new GameEngine();
        const startRes = await engine.startGame(roomId, 'turtle_soup');
        log(`[Step 1] Start Game: ${JSON.stringify(startRes)}`);

        if (!startRes.success) throw new Error('Start failed');

        // 2. Check Prompt Variables
        const gameVars = await engine.getGamePromptVariables(roomId);
        log(`[Step 2] Game Vars: TITLE=${gameVars.TITLE}, CONTENT=${gameVars.CONTENT?.substring(0, 30)}...`);

        // 3. Simulate Analyze (Mock Bailian to avoid external calls and waiting)
        const controller = new TurtleSoupController();
        // Mock bailian.completion
        (controller as any).bailian = {
            completion: async () => ({
                success: true,
                output: {
                    text: JSON.stringify({
                        thinking: "User asks if it is murder. Relevant.",
                        progress_score: 15,
                        kips_hit: [0],
                        needs_hint: true,
                        hint_urgency: 'high',
                        hint_content: "Mock Hint: Think about the door."
                    })
                }
            })
        };
        // Mock injectHint to verify TTS call and avoid actual Zego request
        (controller as any).injectHint = async (instanceId: string, hint: string) => {
            log(`[Mock injectHint] Called with: ${hint}`);
            return Promise.resolve();
        };

        // Mock sendCustomMessage inside pushGameState via spy? 
        // Or just let it fail (catched). Or mock pushGameState too.
        (controller as any).pushGameState = async (roomId: string) => {
            log(`[Mock pushGameState] Called for room: ${roomId}`);
            return Promise.resolve();
        };

        log('[Step 3] Analyzing user input: "Is it a murder?"');
        const analyzeRes = await controller.analyzeUserInput(roomId, instanceId, "Is it a murder?", []);
        log(`Analyze Result: ${JSON.stringify(analyzeRes)}`);

        // 4. Check Session State after analysis
        const session = await engine.getSession(roomId);
        log(`[Step 4] Session State: progress=${session?.progressScore}, kips=${session?.kipsHit}`);
        log(`Last Analysis: ${JSON.stringify(session?.lastAnalysis)}`);

        // 5. Test Hint Strategy (Silence)
        // Since Last Analysis said needs_hint=true, this should return [TTS]...
        const hintStrategy = await engine.getHintStrategy(roomId, 'medium');
        log(`[Step 5] Hint Strategy (Medium): "${hintStrategy}"`);

        if (!hintStrategy.startsWith('[TTS]')) {
            log('WARNING: Hint Strategy should start with [TTS] because we mocked needs_hint=true');
        }

        return NextResponse.json({ success: true, logs });
    } catch (e: any) {
        log(`Error: ${e.message}`);
        console.error(e);
        return NextResponse.json({ success: false, logs }, { status: 500 });
    }
}

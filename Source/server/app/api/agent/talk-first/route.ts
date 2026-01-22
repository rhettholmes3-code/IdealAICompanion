import { NextResponse } from 'next/server';
import { sendZegoRequest } from '@/lib/zego';
import { PromptManager, SceneType, SilenceLevel } from '@/lib/prompt-manager';

export async function POST(req: Request) {
    try {
        const {
            agentId,
            agentInstanceId,
            silenceLevel = 'short',
            sceneType = 'chat',  // 新增：当前场景类型
            roomId = 'room_xiaoye_001'
        } = await req.json();

        if (!agentInstanceId || !agentId) {
            console.error(`[Agent TalkFirst] Missing params. agentInstanceId: ${agentInstanceId}, agentId: ${agentId}`);
            return NextResponse.json({ error: 'agentInstanceId and agentId are required' }, { status: 400 });
        }

        console.log(`[Agent TalkFirst] Request: agentId="${agentId}", scene="${sceneType}", level="${silenceLevel}"`);

        const promptManager = PromptManager.getInstance();
        let prompt = '';

        // 1. 游戏场景优先走 GameEngine 的渐进提示
        if (sceneType === 'game' && (silenceLevel === 'medium' || silenceLevel === 'long')) {
            try {
                const { GameEngine } = require('@/lib/games/game-engine');
                const gameEngine = new GameEngine();

                const session = gameEngine.getSession(roomId);
                if (session) {
                    console.log(`[Agent TalkFirst] Game session found: ${session.gameType}, status: ${session.status}`);
                    prompt = gameEngine.getHintStrategy(roomId, silenceLevel);
                }
            } catch (e) {
                console.warn('[Agent TalkFirst] Failed to get game hint:', e);
            }
        }

        // 2. 使用配置化的主动对话提示模板
        if (!prompt) {
            const scene = promptManager.generateSceneContext();
            prompt = promptManager.generateProactivePrompt(
                agentId,
                sceneType as SceneType,
                silenceLevel as SilenceLevel,
                {
                    CURRENT_TIME: scene.currentTime,
                    LOCATION: scene.location,
                    INTERACTION_GOAL: scene.interactionGoal || '日常陪伴'
                }
            );
        }

        // 3. Fallback
        if (!prompt) {
            prompt = '用户沉默了一会儿，请你主动关心一下用户。';
        }

        console.log(`[Agent TalkFirst] Prompt: "${prompt.substring(0, 50)}..."`);

        // 检查是否为 TTS 指令
        if (prompt.startsWith('[TTS]')) {
            const ttsContent = prompt.replace('[TTS]', '');
            console.log(`[Agent TalkFirst] Triggering TTS: "${ttsContent.substring(0, 50)}..."`);

            const result = await sendZegoRequest('SendAgentInstanceTTS', {
                AgentInstanceId: agentInstanceId,
                Text: ttsContent,
                Priority: 'Medium',
                SamePriorityOption: 'Enqueue'
            });
            return NextResponse.json(result);
        }

        // 默认行为：调用 ZEGO 接口让智能体主动说话 (LLM 生成)
        console.log(`[Agent TalkFirst] Triggering LLM: "${prompt.substring(0, 50)}..."`);
        const result = await sendZegoRequest('SendAgentInstanceLLM', {
            AgentInstanceId: agentInstanceId,
            Text: prompt,
            Priority: 'Medium',
            AddAnswerToHistory: true
        });

        return NextResponse.json(result);
    } catch (error: any) {
        console.error('[Agent TalkFirst] Error:', error);
        return NextResponse.json({ error: 'Failed to trigger talk first', details: error.message }, { status: 500 });
    }
}

// 支持 OPTIONS 请求以处理跨域预检
export async function OPTIONS() {
    const response = new NextResponse(null, { status: 204 });
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
    return response;
}

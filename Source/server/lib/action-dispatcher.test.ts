import { ActionDispatcher } from './action-dispatcher';
import * as ZegoModule from './zego';

// Mock dependencies
jest.mock('./zego');
jest.mock('./games/game-engine', () => {
    return {
        GameEngine: jest.fn().mockImplementation(() => {
            return {
                startGame: jest.fn().mockReturnValue({
                    success: true,
                    data: { puzzle: 'Test Puzzle', id: 'test_id', progress: 0, hints: [] }
                }),
                pauseGame: jest.fn().mockReturnValue('Paused'),
                resumeGame: jest.fn().mockReturnValue('Resumed'),
                endGame: jest.fn().mockReturnValue('Ended'),
                getGameStatePrompt: jest.fn().mockReturnValue('<game_state>Test</game_state>')
            };
        })
    };
});
jest.mock('./prompt-manager', () => {
    return {
        PromptManager: {
            getInstance: jest.fn().mockReturnValue({
                generateFinalPrompt: jest.fn().mockReturnValue('System Prompt with Game State')
            })
        }
    }
});

describe('ActionDispatcher Integration', () => {
    let dispatcher: ActionDispatcher;
    const mockSendZegoRequest = ZegoModule.sendZegoRequest as jest.Mock;

    beforeEach(() => {
        dispatcher = new ActionDispatcher();
        mockSendZegoRequest.mockClear();
    });

    it('should call UpdateAgentInstance (Prompt Update) when GAME action is dispatched', async () => {
        const payload = {
            action: 'GAME',
            params: { gameType: 'turtle_soup' },
            instanceId: 'agent_123',
            roomId: 'room_123'
        };

        const result = await dispatcher.dispatch(payload);

        expect(result.success).toBe(true);
        expect(result.data.id).toBe('test_id');

        // Verify sendZegoRequest was called for logic broadcast
        // And CRITICALLY, called for Prompt Update
        const calls = mockSendZegoRequest.mock.calls;

        // Find the 'UpdateAgentInstance' call
        const updateCall = calls.find(call => call[0] === 'UpdateAgentInstance');
        expect(updateCall).toBeDefined();

        if (updateCall) {
            expect(updateCall[1].AgentInstanceId).toBe('agent_123');
            expect(updateCall[1].LLM.SystemPrompt).toContain('System Prompt with Game State');
            console.log('✅ TEST PASSED: UpdateAgentInstance called with correct prompt.');
        }
    });

    it('should call UpdateAgentInstance when GAME_PAUSE is dispatched', async () => {
        const payload = {
            action: 'GAME_PAUSE',
            params: {},
            instanceId: 'agent_123',
            roomId: 'room_123'
        };

        await dispatcher.dispatch(payload);

        const calls = mockSendZegoRequest.mock.calls;
        const updateCall = calls.find(call => call[0] === 'UpdateAgentInstance');
        expect(updateCall).toBeDefined();
        console.log('✅ TEST PASSED: UpdateAgentInstance called on PAUSE.');
    });
});

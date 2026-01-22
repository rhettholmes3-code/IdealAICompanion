import { merge } from 'lodash';
import { ConfigManager } from './config';
import { BailianService } from './bailian';
import { getSystemPrompt } from './prompt-manager';
import { sendZegoRequest } from './zego';
import { MemoryManager } from './memory-manager'; // [New Import]
import fs from 'fs';
import path from 'path';

export class PersonaManager {
    private static instance: PersonaManager;

    private constructor() { }

    static getInstance(): PersonaManager {
        if (!PersonaManager.instance) {
            PersonaManager.instance = new PersonaManager();
        }
        return PersonaManager.instance;
    }

    /**
     * Evolve persona based on dialogue history
     * @param roomId The Room ID where the agent is active
     * @param agentId The ID of the agent (e.g., 'xiaoye')
     * @param transcript New added dialogue lines
     * @param sessionId Bailian session ID (undefined for first call)
     * @param isFinal Whether this is the post-call final update
     * @param agentInstanceId The specific instance ID currently running
     * @param userId The user ID (IMPORTANT: Need this for memory scope)
     */
    async evolve(roomId: string, agentId: string, transcript: string, sessionId?: string, isFinal: boolean = false, agentInstanceId?: string, userId?: string): Promise<{ success: boolean; sessionId?: string; updates?: any }> {
        const config = ConfigManager.getInstance().getAgentConfig(agentId);
        if (!config || !config.bailian) {
            throw new Error(`Agent ${agentId} not configured for Bailian evolution`);
        }

        if (!userId) {
            console.warn('[PersonaManager] No userId provided for evolution, defaulting to global (bad practice but fallback)');
            // Fallback? Or fail? Let's just warn and maybe fail if strict.
            // For now, if no userId, we can't save to specific user.
        }

        const bailian = new BailianService(config.bailian.appId, config.bailian.apiKey);
        const memoryManager = MemoryManager.getInstance();

        // 1. Prepare initial memory if first session
        let initialMemory = '';
        if (!sessionId && userId) {
            // [Updated] Read from MemoryManager
            const userMemory = await memoryManager.getUserMemory(userId, agentId);
            if (userMemory) {
                // Construct initial state from User Memory
                // We pass the <target_user> content
                initialMemory = userMemory.targetUser;
            } else {
                // If it's a completely new user, maybe read default from XML?
                // Or just empty. Let's assume empty means "New User".
            }
        }

        // 2. Call Bailian
        console.log(`[PersonaManager] Calling Bailian API... SessionId: ${sessionId}, Transcript Length: ${transcript.length}`);
        console.log('[PersonaManager] Transcript Content Preview:', transcript.substring(0, 500)); // [Debug] Log content
        const result = await bailian.interact(transcript, sessionId, initialMemory);
        if (!result.success || !result.output) {
            return { success: false, updates: result.error };
        }

        const newSessionId = result.output.session_id;
        const answerText = result.output.text;

        // 3. Parse output
        const updates = bailian.parseOutput(answerText);

        // 4. Persistence (HDD Update via MemoryManager)
        if ((updates.memory || updates.relationship) && userId) {
            const memUpdates: any = {};

            // Fetch current memory state for deep merging
            const currentMemory = await memoryManager.getUserMemory(userId, agentId);

            // Handle Target User Profile Merge
            if (updates.memory) {
                let currentProfile = {};
                if (currentMemory && currentMemory.targetUser) {
                    try {
                        currentProfile = JSON.parse(currentMemory.targetUser);
                    } catch (e) {
                        console.warn('[PersonaManager] Failed to parse existing targetUser JSON during merge, starting fresh.', e);
                    }
                }

                let newProfile = updates.memory;
                if (typeof newProfile === 'string') {
                    try {
                        newProfile = JSON.parse(newProfile);
                    } catch (e) {
                        // Bailian returned raw string, wrap it? Or just use it?
                        // Ideally Bailian returns JSON object for profile.
                        // If string, assume it's valid JSON string.
                        console.warn('[PersonaManager] Bailian returned string for memory, attempting parse.');
                    }
                }

                // Deep merge: current + new -> merged
                const mergedProfile = merge({}, currentProfile, newProfile);
                memUpdates.targetUser = JSON.stringify(mergedProfile, null, 2);
            }

            // Handle Relationship Evolution
            // 注意：relationship_evolution 应该是简单字符串，如 "互有好感的职场搭子"
            // 不要使用 merge，直接替换即可
            if (updates.relationship) {
                let relValue: any = updates.relationship;

                // 如果是对象，提取 relationship_evolution 字段
                if (typeof relValue === 'object' && relValue !== null) {
                    relValue = (relValue as any).relationship_evolution || JSON.stringify(relValue);
                }

                // 确保存储为简单字符串
                memUpdates.relationshipEvolution = typeof relValue === 'string' ? relValue : String(relValue);
            }

            await memoryManager.updateUserMemory(userId, agentId, memUpdates);
        }

        // 5. Update Agent Instance (Hot Update) via ZEGO API
        if (updates.memory || updates.relationship) {
            await this.hotUpdateAgent(roomId, agentId, config, updates, agentInstanceId, userId);
        }

        return {
            success: true,
            sessionId: newSessionId,
            updates: updates
        };
    }

    private async hotUpdateAgent(roomId: string, agentId: string, config: any, updates: { memory?: any; relationship?: string }, agentInstanceId?: string, userId?: string) {
        console.log(`[PersonaManager] Hot updating agent ${agentId} in room ${roomId}`);

        // 使用新版 PromptManager
        const { PromptManager } = require('./prompt-manager');
        const promptManager = PromptManager.getInstance();

        let overrides: any = {};
        if (userId) {
            const memoryManager = MemoryManager.getInstance();
            const userMemory = await memoryManager.getUserMemory(userId, agentId);
            if (userMemory) {
                overrides.TARGET_USER = userMemory.targetUser;
                overrides.RELATIONSHIP_EVOLUTION = userMemory.relationshipEvolution;
            }
        } else {
            if (updates.memory) overrides.TARGET_USER = typeof updates.memory === 'string' ? updates.memory : JSON.stringify(updates.memory, null, 2);
            if (updates.relationship) overrides.RELATIONSHIP_EVOLUTION = typeof updates.relationship === 'string' ? updates.relationship : JSON.stringify(updates.relationship, null, 2);
        }

        // 使用新 API：generateFinalPrompt(agentId, sceneType, overrides)
        const fullPrompt = promptManager.generateFinalPrompt(agentId, 'chat', overrides);

        // 构建完整的 LLM 配置（UpdateAgentInstance 需要完整参数）
        const updatePayload: any = {
            AgentInstanceId: agentInstanceId,
            LLM: {
                Vendor: config.agent_info.llm.Vendor,
                Url: config.agent_info.llm.Url,
                ApiKey: config.agent_info.llm.ApiKey,
                Model: config.agent_info.llm.Model,
                SystemPrompt: fullPrompt
            }
        };

        // Call UpdateAgentInstance
        await sendZegoRequest('UpdateAgentInstance', updatePayload);
    }
}

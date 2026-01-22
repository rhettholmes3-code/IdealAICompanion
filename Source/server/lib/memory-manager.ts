import dbConnect from './db/client';
import { UserMemory } from './db/models';

export interface UserMemoryData {
    userId: string;
    agentId: string; // Memory is specific to user-agent pair
    targetUser: string; // Content for <target_user>
    relationshipEvolution: string; // Content for <relationship_evolution>
    lastUpdated: number;
}

export class MemoryManager {
    private static instance: MemoryManager;

    private constructor() { }

    static getInstance(): MemoryManager {
        if (!MemoryManager.instance) {
            MemoryManager.instance = new MemoryManager();
        }
        return MemoryManager.instance;
    }

    /**
     * Get memory for a specific user and agent
     * NOTE: Now Async
     */
    async getUserMemory(userId: string, agentId: string): Promise<UserMemoryData | null> {
        await dbConnect();
        try {
            const doc = await UserMemory.findOne({ userId, agentId }).lean();
            if (doc) {
                return {
                    userId: doc.userId,
                    agentId: doc.agentId,
                    targetUser: doc.targetUser,
                    relationshipEvolution: doc.relationshipEvolution,
                    lastUpdated: doc.lastUpdated
                };
            }
        } catch (e) {
            console.error(`[MemoryManager] Failed to read memory for ${userId}:`, e);
        }
        return null;
    }

    /**
     * Update or Create user memory
     * NOTE: Now Async
     */
    async updateUserMemory(userId: string, agentId: string, updates: Partial<UserMemoryData>): Promise<void> {
        await dbConnect();

        try {
            // Avoid conflicts between $set and $setOnInsert
            // If a field is in $set (via updates), it should NOT be in $setOnInsert
            const updatePayload: any = {
                $set: {
                    ...updates,
                    lastUpdated: Date.now()
                },
                $setOnInsert: {
                    userId,
                    agentId
                }
            };

            // Add defaults to $setOnInsert only if they are NOT in $set
            if (updates.targetUser === undefined) {
                updatePayload.$setOnInsert.targetUser = '';
            }
            if (updates.relationshipEvolution === undefined) {
                updatePayload.$setOnInsert.relationshipEvolution = '';
            }

            await UserMemory.findOneAndUpdate(
                { userId, agentId },
                updatePayload,
                { upsert: true, new: true }
            );
            console.log(`[MemoryManager] Saved memory for ${userId} with agent ${agentId}`);
        } catch (e) {
            console.error(`[MemoryManager] Failed to write memory for ${userId}:`, e);
        }
    }
}

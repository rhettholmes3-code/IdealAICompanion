import dbConnect from '../lib/db/client';
import { MemoryManager } from '../lib/memory-manager';
import fs from 'fs';
import path from 'path';

// Manually load .env.local because we are running outside of Next.js
const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
    console.log('Loading .env.local...');
    const envConfig = fs.readFileSync(envPath, 'utf-8');
    envConfig.split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) {
            process.env[key.trim()] = value.trim();
        }
    });
}

async function verifyMemoryFix() {
    console.log('Testing MemoryManager Fix...');
    try {
        await dbConnect();
        const mm = MemoryManager.getInstance();
        const userId = 'verify_mem_user_' + Date.now();
        const agentId = 'test_agent';

        console.log(`1. Create Memory for ${userId}`);
        await mm.updateUserMemory(userId, agentId, {
            targetUser: 'Initial User Info'
        });

        const m1 = await mm.getUserMemory(userId, agentId);
        if (!m1 || m1.targetUser !== 'Initial User Info') throw new Error('Create failed');
        console.log('✅ Create Successful');

        console.log(`2. Update with undefined field (The Conflict Case)`);
        // This is what caused the crash: passing targetUser: undefined in updates
        // while $setOnInsert also tried to set targetUser default.
        const invalidUpdate: any = {
            relationshipEvolution: 'Friends',
            targetUser: undefined
        };

        await mm.updateUserMemory(userId, agentId, invalidUpdate);

        const m2 = await mm.getUserMemory(userId, agentId);
        if (!m2 || m2.relationshipEvolution !== 'Friends' || m2.targetUser !== 'Initial User Info') {
            console.error('State:', m2);
            throw new Error('Update failed or overwrote with undefined');
        }
        console.log('✅ Update with undefined Passed');

        console.log('🎉 ALL MEMORY TESTS PASSED');
        process.exit(0);

    } catch (e) {
        console.error('❌ Verification Failed:', e);
        process.exit(1);
    }
}

verifyMemoryFix();

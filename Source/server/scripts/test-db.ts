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
} else {
    console.warn('⚠️ .env.local not found!');
}

async function runVerify() {
    console.log('Testing MongoDB Connection...');

    // Dynamic import AFTER env vars are set
    const { default: dbConnect } = await import('../lib/db/client');
    const { GameSession } = await import('../lib/db/models');

    try {
        await dbConnect();
        console.log('✅ Connection Successful!');

        const testRoomId = 'verify_test_room_' + Date.now();

        console.log(`Testing CRUD with Room: ${testRoomId}`);

        // 1. Create
        const created = await GameSession.create({
            roomId: testRoomId,
            gameType: 'turtle_soup',
            status: 'idle',
            history: []
        });
        console.log('✅ Create Successful:', created.roomId);

        // 2. Read
        const found = await GameSession.findOne({ roomId: testRoomId });
        if (!found || found.roomId !== testRoomId) {
            throw new Error('Read failed or mismatch');
        }
        console.log('✅ Read Successful');

        // 3. Delete
        await GameSession.deleteOne({ roomId: testRoomId });
        const deleted = await GameSession.findOne({ roomId: testRoomId });
        if (deleted) {
            throw new Error('Delete failed');
        }
        console.log('✅ Delete Successful');

        console.log('🎉 ALL TESTS PASSED');
        process.exit(0);

    } catch (e) {
        console.error('❌ Verification Failed:', e);
        process.exit(1);
    }
}

runVerify();

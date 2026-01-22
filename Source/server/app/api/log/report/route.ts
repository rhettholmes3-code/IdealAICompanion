import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    try {
        const payload = await req.json();
        const { error, context, level = 'error', timestamp = new Date().toISOString() } = payload;

        const logDir = path.join(process.cwd(), 'logs');
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }

        const logEntry = {
            timestamp,
            level,
            source: 'frontend',
            message: error?.message || String(error),
            stack: error?.stack,
            context, // URL, UserAgent, GameState, etc.
        };

        // Append to frontend_errors.jsonl
        fs.appendFileSync(
            path.join(logDir, 'frontend_errors.jsonl'),
            JSON.stringify(logEntry) + '\n'
        );

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error('Failed to write frontend log:', err);
        return NextResponse.json({ success: false }, { status: 500 });
    }
}

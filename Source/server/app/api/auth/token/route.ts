import { NextResponse } from 'next/server';
import { CONFIG } from '@/config/env';
import { generateToken04 } from '@/lib/token';

export async function POST(req: Request) {
    try {
        const { userId } = await req.json();

        // 使用真实的 Token 生成逻辑
        const effectiveTimeInSeconds = 3600; // 1小时有效
        const token = generateToken04(
            CONFIG.appId,
            userId,
            CONFIG.appSign,
            effectiveTimeInSeconds
        );

        console.log(`Generated real token for user: ${userId}`);

        return NextResponse.json({ token });
    } catch (error) {
        console.error('Token generation error:', error);
        return NextResponse.json({ error: 'Failed to generate token' }, { status: 500 });
    }
}

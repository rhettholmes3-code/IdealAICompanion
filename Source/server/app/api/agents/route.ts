import { NextResponse } from 'next/server';
import { ConfigManager } from '../../../lib/config';

export const dynamic = 'force-dynamic'; // Ensure no caching

export async function GET() {
    try {
        const configManager = ConfigManager.getInstance();
        const agents = configManager.loadAllAgents();

        // Map to simpler structure for frontend
        const result = agents
            .sort((a, b) => (a.order || 999) - (b.order || 999))
            .map(agent => ({
                id: agent.id,
                name: agent.name,
                backgroundImage: agent.backgroundImage
            }));

        return NextResponse.json(result);
    } catch (error) {
        console.error('Error fetching agents:', error);
        return NextResponse.json(
            { error: 'Failed to fetch agents' },
            { status: 500 }
        );
    }
}

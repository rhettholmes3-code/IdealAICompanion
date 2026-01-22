import { useEffect, useRef, useState, useCallback } from 'react';

interface UsePersonaEvolutionProps {
    roomId: string;
    agentId: string;
    agentInstanceId?: string | null;
    userId: string;
    transcript: Array<{ role: 'user' | 'assistant'; content: string }>;
    isActive: boolean;
    activeGameType?: string | null; // [New]
}

export function usePersonaEvolution({ roomId, agentId, agentInstanceId, userId, transcript, isActive, activeGameType }: UsePersonaEvolutionProps) {
    const [sessionId, setSessionId] = useState<string | undefined>(undefined);
    const lastEvolveIndexRef = useRef<number>(0);
    const lastEvolveTimeRef = useRef<number>(Date.now());
    const sessionIdRef = useRef<string | undefined>(undefined);

    // Sync sessionId state to ref
    useEffect(() => {
        sessionIdRef.current = sessionId;
    }, [sessionId]);

    const evolve = useCallback(async (isFinal: boolean = false) => {
        // Calculate new transcript segments
        const currentTranscript = transcript;
        const startIndex = lastEvolveIndexRef.current;
        const newSegments = currentTranscript.slice(startIndex);

        // 如果游戏正在进行中，直接忽略这段对话
        // 并更新 lastEvolveIndexRef，相当于"消耗并丢弃"了这段游戏内容
        if (activeGameType) {
            console.log(`[PersonaEvolution] Skipping evolution (Game active: ${activeGameType}). Discarding ${newSegments.length} lines.`);
            lastEvolveIndexRef.current = currentTranscript.length;
            lastEvolveTimeRef.current = Date.now();
            return;
        }

        if (newSegments.length === 0 && !isFinal) {
            console.log('[PersonaEvolution] No new dialogues, skipping update.');
            return;
        }

        // Format transcript for API
        const transcriptText = newSegments.map(msg => `${msg.role === 'user' ? '用户' : 'AI'}: ${msg.content}`).join('\n');

        console.log(`[PersonaEvolution] Evolving... isFinal=${isFinal}, newLines=${newSegments.length}`);

        try {
            const response = await fetch('/api/agent/evolve', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    roomId,
                    agentId,
                    agentInstanceId,
                    userId,
                    transcript: transcriptText || (isFinal ? "[End of Call]" : ""),
                    sessionId: sessionIdRef.current,
                    isFinal
                }),
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    setSessionId(data.sessionId);
                    console.log('[PersonaEvolution] Success:', data);

                    // Update markers
                    lastEvolveIndexRef.current = currentTranscript.length;
                    lastEvolveTimeRef.current = Date.now();
                }
            } else {
                console.error('[PersonaEvolution] API Failed');
            }
        } catch (error) {
            console.error('[PersonaEvolution] Error:', error);
        }
    }, [roomId, agentId, transcript]);

    // Timer Trigger (1 min) AND Turn Count Trigger (10 turns)
    // We check every time transcript updates or timer interval fires

    // Check Timer
    useEffect(() => {
        if (!isActive) return;

        const interval = setInterval(() => {
            const now = Date.now();
            if (now - lastEvolveTimeRef.current >= 60000) { // 1 min
                evolve(false);
            }
        }, 5000); // Check every 5s

        return () => clearInterval(interval);
    }, [isActive, evolve]);

    // Check Turn Count
    useEffect(() => {
        if (!isActive) return;

        const newTurns = transcript.length - lastEvolveIndexRef.current;
        if (newTurns >= 10) {
            evolve(false);
        }
    }, [transcript.length, isActive, evolve]);

    return {
        evolve // Expose for manual final call
    };
}

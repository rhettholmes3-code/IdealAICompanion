import { useEffect, useRef, useCallback } from 'react';

interface UseSilenceDetectorProps {
    isActive: boolean; // 通话是否进行中
    agentInstanceId: string | null;
    agentId: string;
    tokenUrl: string;
    roomId: string;
    sceneType?: 'chat' | 'game' | 'task'; // 当前场景类型
    onSilence?: (level: 'short' | 'medium' | 'long') => void;
}

/**
 * 沉默检测 Hook
 * 当用户沉默超过一定时间时触发 AI 主动说话
 * 规则：
 * - 用户停止说话(Cmd=1, Status=2)后开始计时
 * - AI开始说话(Cmd=6, Status=3/2)时暂停计时
 * - AI停止说话(Cmd=6, Status=0/1)时恢复计时
 * - 5s -> short
 * - 15s (total) -> medium
 * - 30s (total) -> long
 * - 之后每 30s -> long (loop)
 * 
 * 使用 onInternalMessage 直接处理 ZEGO 信令事件，避免 React 状态同步问题
 */
export function useSilenceDetector({
    isActive,
    agentInstanceId,
    agentId,
    tokenUrl,
    roomId,
    sceneType = 'chat',
    onSilence,
    activeGameType
}: UseSilenceDetectorProps & { activeGameType?: string | null }) {
    const timersRef = useRef<NodeJS.Timeout[]>([]);
    const silenceStartRef = useRef<number>(Date.now());
    const triggeredLevelsRef = useRef<Set<string>>(new Set());
    const isTimerActiveRef = useRef<boolean>(false);

    // Internal state tracking solely for silence logic
    const internalAgentStatusRef = useRef<string>('idle');

    // Use refs to avoid old closures in timer callbacks
    const agentInstanceIdRef = useRef(agentInstanceId);
    const agentIdRef = useRef(agentId);
    const onSilenceRef = useRef(onSilence);
    const activeGameTypeRef = useRef(activeGameType);
    const roomIdRef = useRef(roomId);
    const sceneTypeRef = useRef(sceneType);

    const isProactiveTriggerRef = useRef<boolean>(false);

    // Sync Props
    useEffect(() => { agentInstanceIdRef.current = agentInstanceId; }, [agentInstanceId]);
    useEffect(() => { agentIdRef.current = agentId; }, [agentId]);
    useEffect(() => { onSilenceRef.current = onSilence; }, [onSilence]);
    useEffect(() => { activeGameTypeRef.current = activeGameType; }, [activeGameType]);
    useEffect(() => { roomIdRef.current = roomId; }, [roomId]);
    useEffect(() => { sceneTypeRef.current = sceneType; }, [sceneType]);

    const clearAllTimers = useCallback(() => {
        timersRef.current.forEach(timer => clearTimeout(timer));
        timersRef.current = [];
        isTimerActiveRef.current = false;
    }, []);

    const triggerSilenceAction = useCallback(async (level: 'short' | 'medium' | 'long') => {
        const instanceId = agentInstanceIdRef.current;
        const currentAgentId = agentIdRef.current;
        const statusNow = internalAgentStatusRef.current;

        console.log(`[Silence] Timer fired for ${level}. InternalStatus: ${statusNow}, InstanceId: ${instanceId}`);

        // Safety check: if somehow agent started speaking but timers weren't cleared
        if (statusNow === 'speaking' || statusNow === 'thinking') {
            console.log(`[Silence] Aborting ${level} because internal status is ${statusNow}`);
            return;
        }

        if (!instanceId) return;

        // Mark as proactive trigger so we know to preserve silent levels on resume
        isProactiveTriggerRef.current = true;

        console.log(`[Silence] Triggering ${level} check`);
        onSilenceRef.current?.(level);

        try {
            const backendUrl = tokenUrl.startsWith('http')
                ? new URL(tokenUrl).origin
                : '';
            await fetch(`${backendUrl}/api/agent/talk-first`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    agentInstanceId: instanceId,
                    agentId: currentAgentId,
                    roomId: roomIdRef.current,
                    silenceLevel: level,
                    sceneType: sceneTypeRef.current, // 传递当前场景
                    activeGameType: activeGameTypeRef.current
                })
            });
        } catch (err) {
            console.error('[Silence] API error:', err);
        }
    }, [tokenUrl]);

    const scheduleTimers = useCallback(() => {
        if (!isActive) return;
        if (isTimerActiveRef.current) return;

        const status = internalAgentStatusRef.current;
        if (status === 'speaking' || status === 'thinking') {
            return;
        }

        const now = Date.now();
        const elapsed = now - silenceStartRef.current;
        isTimerActiveRef.current = true;

        console.log(`[Silence] Scheduling. Elapsed: ${elapsed}ms. TriggeredLevels:`, Array.from(triggeredLevelsRef.current));

        const schedule = (delay: number, level: 'short' | 'medium' | 'long') => {
            // Game Mode Rule: Skip 'short' (5s), only trigger >= 15s (medium/long)
            if (activeGameType && level === 'short') {
                return;
            }

            if (level !== 'long' && triggeredLevelsRef.current.has(level)) return;

            const remainingDelay = Math.max(0, delay - elapsed);

            if (remainingDelay === 0 && level !== 'long') {
                if (!triggeredLevelsRef.current.has(level)) {
                    triggeredLevelsRef.current.add(level);
                    triggerSilenceAction(level);
                }
                return;
            }

            const timer = setTimeout(() => {
                if (level !== 'long') triggeredLevelsRef.current.add(level);
                triggerSilenceAction(level);

                if (level === 'long') {
                    silenceStartRef.current = Date.now();
                    triggeredLevelsRef.current.clear();
                    scheduleTimers();
                }
            }, remainingDelay);
            timersRef.current.push(timer);
        };

        schedule(5000, 'short');
        schedule(15000, 'medium');
        schedule(30000, 'long');
    }, [isActive, triggerSilenceAction, activeGameType]);

    // Start timers (Optionally clearing levels)
    const startSilenceTimer = useCallback((preserveLevels: boolean = false) => {
        console.log(`[Silence] Starting timer (PreserveLevels: ${preserveLevels})`);
        clearAllTimers();
        silenceStartRef.current = Date.now();

        if (!preserveLevels) {
            triggeredLevelsRef.current.clear();
        }

        scheduleTimers();
    }, [clearAllTimers, scheduleTimers]);

    // Handle raw ZEGO messages
    const onInternalMessage = useCallback((cmd: number, data: any) => {
        if (!isActive) return;

        // Cmd=1: User Speak Status -- Used ONLY to reset silence detection completely
        if (cmd === 1) {
            const speakStatus = data.SpeakStatus;
            if (speakStatus === 1) { // Start speaking
                clearAllTimers();
                isProactiveTriggerRef.current = false; // User broke the proactive chain
            } else if (speakStatus === 2) { // End speaking
                // Full Reset
                startSilenceTimer(false);
            }
        }
        // Cmd=6: Agent Status
        else if (cmd === 6) {
            const rawStatus = data.Status;
            let statusStr = 'idle';
            if (rawStatus === 2) statusStr = 'thinking';
            else if (rawStatus === 3) statusStr = 'speaking';
            else if (rawStatus === 1) statusStr = 'listening';

            internalAgentStatusRef.current = statusStr;

            if (statusStr === 'speaking' || statusStr === 'thinking') {
                console.log(`[Silence] Agent ${statusStr}, pausing timers`);
                clearAllTimers();
            } else {
                console.log(`[Silence] Agent ${statusStr}, starting timers`);

                // If this resume was caused by a proactive trigger, we preserve levels
                // to continue the escalation (5s -> 15s -> 30s).
                // If it was a normal reply (isProactiveTriggerRef = false), we reset levels.
                const preserve = isProactiveTriggerRef.current;

                if (preserve) {
                    console.log('[Silence] Resuming proactive session (levels preserved)');
                } else {
                    console.log('[Silence] Starting fresh session (levels cleared)');
                }

                startSilenceTimer(preserve);

                // Reset flag after consuming it
                isProactiveTriggerRef.current = false;
            }
        }
    }, [isActive, clearAllTimers, startSilenceTimer]);

    // Lifecycle
    useEffect(() => {
        if (isActive) {
            internalAgentStatusRef.current = 'idle';
        } else {
            clearAllTimers();
        }
        return () => clearAllTimers();
    }, [isActive, clearAllTimers, startSilenceTimer]);

    return {
        onInternalMessage
    };
}

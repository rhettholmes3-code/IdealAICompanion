import { useCallback } from 'react';

/**
 * useIntentAnalysis Hook
 * 
 * 职责：
 * 1. 当用户停止说话 (SpeakStatus=0) 时，主动调用后端意图分析 API
 * 2. 更新任务状态（如天气卡片数据）
 * 3. 处理任务错误
 */

interface UseIntentAnalysisProps {
    tokenUrl: string;
    roomID: string;
    userID: string;
    agentInstanceIdRef: React.MutableRefObject<string | null>;
    setActiveTaskData: (data: any) => void;
    setTaskError: (error: any) => void;
}

export function useIntentAnalysis({
    tokenUrl,
    roomID,
    userID,
    agentInstanceIdRef,
    setActiveTaskData,
    setTaskError
}: UseIntentAnalysisProps) {

    const analyzeIntent = useCallback(async (currentSubtitle: string) => {
        if (!currentSubtitle.trim() || !agentInstanceIdRef.current) return;

        console.log('[IntentAnalysis] Triggering analysis for:', currentSubtitle);

        const backendUrl = tokenUrl.startsWith('http') ? new URL(tokenUrl).origin : '';

        try {
            const res = await fetch(`${backendUrl}/api/task/analyze`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    rawText: currentSubtitle,
                    instanceId: agentInstanceIdRef.current,
                    roomId: roomID,
                    userId: userID,
                })
            });

            const data = await res.json();
            console.log('[IntentAnalysis] Result:', data);

            // If task was executed, update the task data
            if (data.taskResult?.success && data.taskResult.data) {
                console.log('[IntentAnalysis] Task completed:', data.taskResult.data);
                // Force state update by creating new object reference
                setActiveTaskData({ ...data.taskResult.data, _ts: Date.now() });
                setTaskError(null);
            } else if (data.taskResult?.error) {
                console.error('[IntentAnalysis] Task failed:', data.taskResult.error);
                setTaskError(data.taskResult.error);
            }

        } catch (err) {
            console.error('[IntentAnalysis] Request failed:', err);
        }

    }, [tokenUrl, roomID, userID, agentInstanceIdRef, setActiveTaskData, setTaskError]);

    return { analyzeIntent };
}

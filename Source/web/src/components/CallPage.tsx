/**
 * CallPage - 通话主页面
 * 
 * 重构后的精简版本，职责：
 * - 组合子组件
 * - 管理全局状态
 * - 协调 hooks 之间的交互
 */
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useZegoRTC } from '../hooks/useZegoRTC';
import { SubtitleDisplay } from './SubtitleDisplay';
import { Waveform } from './Waveform';
import { useToast } from './Toast';
import { GameStatusCard } from './GameStatusCard';
import { useSilenceDetector } from '../hooks/useSilenceDetector';
import { SystemPromptModal } from './SystemPromptModal';
import { usePersonaEvolution } from '../hooks/usePersonaEvolution';
import type { SubtitleItem } from '../lib/zego-subtitle';

// 拆分后的子组件
import {
    AgentSelector,
    CallControls,
    CallHeader,
    LandingView,
    GameInfoCard,
    WeatherCard,
    ErrorCard,
    CONFIG,
    getStatusText,
    findLastIndex
} from './call';
import type { AgentInfo } from './call';

export const CallPage: React.FC = () => {
    const { showToast } = useToast();

    // ============ State ============
    const [agents, setAgents] = useState<AgentInfo[]>([]);
    const [currentAgent, setCurrentAgent] = useState<AgentInfo | null>(null);
    const [showSettings, setShowSettings] = useState(false);
    const [showDebugPrompt, setShowDebugPrompt] = useState(false);
    const [subtitles, setSubtitles] = useState<SubtitleItem[]>([]);

    // v2.2.0: 任务状态已移至 useZegoRTC 统一管理 (activeTaskData, taskError)
    // 此处移除重复的本地状态以防同步失效

    // Ref Bridge for circular dependency
    const onInternalMessageRef = useRef<((cmd: number, data: any) => void) | null>(null);

    // ============ Callbacks ============
    const handleError = useCallback((message: string) => {
        showToast(message, 'error');
    }, [showToast]);

    // ============ ZEGO RTC Hook ============
    const {
        startCall,
        endCall,
        isPublishing,
        agentStatus,
        toggleMic,
        isMicOn,
        userSubtitle,
        userSegmentId,
        agentSubtitle,
        agentMessageId,
        currentEmotion,
        soundLevel,
        agentInstanceId,
        systemPrompt,
        activeGameType,
        activeGameData,
        activeTaskData,
        setActiveTaskData,
        taskError,
        setTaskError
    } = useZegoRTC({
        ...CONFIG,
        onError: handleError,
        onAgentReady: useCallback((instanceId: string) => {
            console.log('[CallPage] Agent stream ready, triggering welcome');
            if (instanceId) {
                const currentAgentId = currentAgent?.id || 'xiaoye';
                const backendUrl = CONFIG.tokenUrl.startsWith('http') ? new URL(CONFIG.tokenUrl).origin : '';

                fetch(`${backendUrl}/api/agent/talk-first`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        agentInstanceId: instanceId,
                        agentId: currentAgentId,
                        silenceLevel: 'welcome'
                    })
                }).catch(err => console.error('[CallPage] Failed to trigger welcome:', err));
            }
        }, [currentAgent]),
        onRawMessage: useCallback((cmd: number, data: any) => {
            if (onInternalMessageRef.current) {
                onInternalMessageRef.current(cmd, data);
            }
        }, [])
    });

    // ============ Silence Detector Hook ============
    const { onInternalMessage } = useSilenceDetector({
        isActive: isPublishing,
        agentInstanceId,
        agentId: currentAgent?.id || 'xiaoye',
        tokenUrl: CONFIG.tokenUrl,
        roomId: CONFIG.roomID,
        activeGameType,
        sceneType: activeGameType ? 'game' : 'chat', // Fix: Explicitly pass sceneType
        onSilence: (level) => {
            console.log(`[CallPage] User is silent: ${level}`);
        }
    });

    // Update Ref Bridge
    useEffect(() => {
        onInternalMessageRef.current = onInternalMessage;
    }, [onInternalMessage]);

    // ============ Agent Management ============
    const fetchAgents = useCallback(async () => {
        try {
            const res = await fetch('/api/agents');
            if (res.ok) {
                const data = await res.json();
                setAgents(data);
                if (!currentAgent && data.length > 0) {
                    setCurrentAgent(data[0]);
                }
            } else {
                console.error("Failed to fetch agents");
                showToast("获取智能体列表失败", "error");
            }
        } catch (e) {
            console.error("Error fetching agents", e);
        }
    }, [currentAgent, showToast]);

    useEffect(() => {
        fetchAgents();
    }, [fetchAgents]);

    // ============ Subtitle Management ============
    useEffect(() => {
        if (userSubtitle) {
            setSubtitles(prev => {
                const lastUserIdx = findLastIndex(prev, (s: SubtitleItem) => s.type === 'user');
                const newItem: SubtitleItem = {
                    text: userSubtitle,
                    type: 'user',
                    timestamp: Date.now(),
                    segmentId: userSegmentId
                };

                if (lastUserIdx >= 0) {
                    const lastItem = prev[lastUserIdx];
                    if (lastItem.segmentId === userSegmentId) {
                        const updated = [...prev];
                        updated[lastUserIdx] = newItem;
                        return updated;
                    }
                    if (lastItem.segmentId === undefined && Date.now() - lastItem.timestamp < 3000) {
                        const updated = [...prev];
                        updated[lastUserIdx] = { ...newItem, segmentId: userSegmentId };
                        return updated;
                    }
                }
                return [...prev, newItem];
            });
        }
    }, [userSubtitle, userSegmentId]);

    useEffect(() => {
        if (agentSubtitle) {
            setSubtitles(prev => {
                const lastAgentIdx = findLastIndex(prev, (s: SubtitleItem) => s.type === 'agent');
                const newItem: SubtitleItem = {
                    text: agentSubtitle,
                    type: 'agent',
                    timestamp: Date.now(),
                    messageId: agentMessageId
                };

                if (lastAgentIdx >= 0) {
                    const lastItem = prev[lastAgentIdx];
                    if (lastItem.messageId === agentMessageId) {
                        const updated = [...prev];
                        updated[lastAgentIdx] = newItem;
                        return updated;
                    }
                    if (!lastItem.messageId && Date.now() - lastItem.timestamp < 5000) {
                        const updated = [...prev];
                        updated[lastAgentIdx] = { ...newItem, messageId: agentMessageId };
                        return updated;
                    }
                }
                return [...prev, newItem];
            });
        }
    }, [agentSubtitle, agentMessageId]);

    // ============ Persona Evolution ============
    const transcript = useMemo(() =>
        subtitles.map(s => ({
            role: s.type === 'user' ? 'user' as const : 'assistant' as const,
            content: s.text
        })),
        [subtitles]);

    const { evolve } = usePersonaEvolution({
        roomId: CONFIG.roomID,
        agentId: currentAgent?.id || 'xiaoye',
        agentInstanceId: agentInstanceId,
        userId: CONFIG.userID,
        transcript: transcript,
        isActive: isPublishing,
        activeGameType: activeGameType // [New] Pass game type to filter memory updates
    });

    // Memoize Turtle Soup game state to prevent unnecessary re-renders
    const turtleSoupGameState = useMemo(() => {
        if (activeGameType !== 'turtle_soup' || !activeGameData) return null;
        return {
            title: activeGameData.title || '未命名',
            story: activeGameData.story || activeGameData.puzzle || '内容加载中...',
            progressPercent: activeGameData.progress || 0,
            clues: activeGameData.kips?.map((kip: any, idx: number) => ({
                name: kip.name || `线索 ${idx + 1}`,
                content: kip.content || '',
                unlocked: activeGameData.kips_hit?.includes(idx) || false
            })) || []
        };
    }, [
        activeGameType,
        activeGameData?.title,
        activeGameData?.story,
        activeGameData?.puzzle,
        activeGameData?.progress,
        JSON.stringify(activeGameData?.kips),
        JSON.stringify(activeGameData?.kips_hit)
    ]);

    // ============ Event Handlers ============
    const handleClearContext = async () => {
        if (!agentInstanceId) {
            showToast('智能体尚未连接', 'warning');
            return;
        }

        try {
            const backendUrl = CONFIG.tokenUrl.startsWith('http') ? new URL(CONFIG.tokenUrl).origin : '';
            const res = await fetch(`${backendUrl}/api/agent/clear-context`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ agentInstanceId })
            });
            const data = await res.json();

            if (data.success) {
                showToast('上下文已清除，AI 已重置记忆', 'success');
            } else {
                throw new Error(data.error);
            }
        } catch (err: any) {
            console.error('Failed to clear context:', err);
            showToast(err.message || '清除上下文失败', 'error');
        }
    };

    const handleStart = async () => {
        if (!currentAgent) {
            showToast('请先选择一个智能体', 'warning');
            return;
        }
        try {
            await navigator.mediaDevices.getUserMedia({ audio: true });
            startCall(currentAgent.id);
        } catch (err: any) {
            if (err.name === 'NotAllowedError') {
                showToast('请允许使用麦克风以开始通话', 'warning');
            } else {
                showToast('无法访问麦克风', 'error');
            }
        }
    };

    const handleEnd = () => {
        evolve(true);
        endCall();
        setSubtitles([]);
        showToast('通话已结束', 'info');
    };

    const handleAgentSelect = (agent: AgentInfo) => {
        setCurrentAgent(agent);
        setShowSettings(false);
        showToast(`已切换至: ${agent.name}`, 'success');
    };

    const handleOpenSettings = () => {
        fetchAgents();
        setShowSettings(true);
    };

    // ============ Render ============
    return (
        <div className="relative w-full h-full bg-bg-dark text-white overflow-hidden font-sans select-none">
            {/* Background */}
            <div
                className="absolute inset-0 bg-cover bg-[center_top] z-0 transition-all duration-500"
                style={{ backgroundImage: `url('${currentAgent?.backgroundImage || '/xiaoye_avatar.png'}')` }}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-bg-dark/60 via-transparent to-bg-dark/95 z-0" />

            {/* Page Transitions */}
            <AnimatePresence mode="popLayout">
                {/* Landing View */}
                {!isPublishing && (
                    <LandingView
                        currentAgent={currentAgent}
                        onStart={handleStart}
                        onOpenSettings={handleOpenSettings}
                    />
                )}

                {/* Call View */}
                {isPublishing && (
                    <motion.div
                        key="call-view"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="absolute inset-0 flex flex-col z-10"
                    >
                        {/* Header */}
                        <CallHeader
                            currentEmotion={currentEmotion}
                            onShowDebugPrompt={() => setShowDebugPrompt(true)}
                            onClearContext={handleClearContext}
                        />

                        {/* Game Status Overlay (Hide for Turtle Soup as it uses GameInfoCard) */}
                        {activeGameType !== 'turtle_soup' && (
                            <div className="z-30 pointer-events-none">
                                <GameStatusCard
                                    key={activeGameData?.id || 'empty'}
                                    gameType={activeGameType}
                                    content={activeGameData || undefined}
                                />
                            </div>
                        )}

                        {/* Debug Modal */}
                        <SystemPromptModal
                            isOpen={showDebugPrompt}
                            onClose={() => setShowDebugPrompt(false)}
                            content={systemPrompt}
                        />

                        {/* Status Area */}
                        <div className="text-center py-3 px-4 z-20">
                            <h1 className="text-lg font-semibold mb-1.5 drop-shadow-md">{currentAgent?.name || 'Loading...'}</h1>
                            <div className="inline-flex items-center gap-1.5 text-xs text-white/70">
                                <span className={`w-1.5 h-1.5 rounded-full bg-green-500 animate-status-pulse`} />
                                <span>{getStatusText(agentStatus)}</span>
                            </div>
                        </div>

                        {/* 海龟汤游戏信息卡片 - 仅在海龟汤游戏进行中显示 */}
                        {turtleSoupGameState && (
                            <GameInfoCard gameState={turtleSoupGameState} />
                        )}

                        {/* v2.2.0: 天气卡片 */}
                        {activeTaskData && (
                            <WeatherCard
                                data={activeTaskData}
                                onClose={() => setActiveTaskData(null)}
                            />
                        )}

                        {/* v2.2.0: 错误卡片 */}
                        {taskError && (
                            <ErrorCard
                                data={taskError}
                                onClose={() => setTaskError(null)}
                            />
                        )}

                        {/* Subtitle Area */}
                        <div className="flex-1 overflow-hidden relative z-20 mask-linear-gradient">
                            <SubtitleDisplay subtitles={subtitles} />
                        </div>

                        {/* Waveform Area */}
                        <div className="flex items-center justify-center h-14 px-4 z-20">
                            <Waveform
                                isAnimating={agentStatus === 'speaking' || agentStatus === 'thinking'}
                                soundLevel={soundLevel}
                            />
                        </div>

                        {/* Control Area */}
                        <CallControls
                            isMicOn={isMicOn}
                            onToggleMic={toggleMic}
                            onEndCall={handleEnd}
                        />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Agent Selector Modal */}
            <AgentSelector
                isOpen={showSettings}
                onClose={() => setShowSettings(false)}
                agents={agents}
                currentAgent={currentAgent}
                onSelect={handleAgentSelect}
            />
        </div>
    );
};

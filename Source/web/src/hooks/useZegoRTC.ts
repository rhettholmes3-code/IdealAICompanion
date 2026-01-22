/**
 * useZegoRTC - ZEGO Express SDK 封装 Hook
 *
 * 职责：
 * - RTC 引擎初始化和生命周期管理
 * - 房间登录/登出、推拉流
 * - Agent 创建/销毁
 * - 消息/字幕/情绪处理
 *
 * 代码组织：
 * - 类型定义 -> ./zego/types.ts
 * - 消息解析 -> ./zego/message-parser.ts
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { useIntentAnalysis } from './useIntentAnalysis';
import * as ZegoModule from 'zego-express-engine-webrtc';
import { useActionDetector } from './useActionDetector';
import { logger } from '../lib/logger';

// 模块化导入
import type { AgentStatus, UseZegoRTCProps } from './zego/types';
import { AGENT_STATUS_MAP, GAME_ALIASES } from './zego/types';
import {
    extractGameMetadata,
    extractEmotion,
    cleanSubtitleText,
    assembleTextFragments
} from './zego/message-parser';

// 重新导出类型供外部使用
export type { AgentStatus, SubtitleMessage } from './zego/types';

const ZegoExpressEngine = (ZegoModule as any).ZegoExpressEngine || (ZegoModule as any).default?.ZegoExpressEngine;

// ============================================================================
// MAIN HOOK
// ============================================================================

export function useZegoRTC({
    appID,
    server,
    tokenUrl,
    userID,
    userName,
    roomID,
    onError,
    onAgentReady,
    onRawMessage
}: UseZegoRTCProps) {

    // ========== Refs ==========
    const engineRef = useRef<any>(null);
    const agentTextCache = useRef<Map<string, Map<number, string>>>(new Map());
    const agentInstanceIdRef = useRef<string | null>(null);
    const agentStreamIdRef = useRef<string | null>(null);
    const agentIdRef = useRef<string>('xiaoye'); // Default to xiaoye
    const lastAsrSeqId = useRef<number>(0);
    const conversationHistoryRef = useRef<any[]>([]); // [New] Chat History for Judge
    const agentStatusRef = useRef<AgentStatus>('idle'); // [New] Sync Ref

    // ========== State ==========
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
    const [isPublishing, setIsPublishing] = useState(false);
    const [agentStatus, setAgentStatus] = useState<AgentStatus>('idle');
    const [isMicOn, setIsMicOn] = useState(true);

    // 字幕相关
    const [userSubtitle, setUserSubtitle] = useState<string>('');
    const [agentSubtitle, setAgentSubtitle] = useState<string>('');
    const [currentEmotion, setCurrentEmotion] = useState<string>('neutral');
    const [userSegmentId, setUserSegmentId] = useState<number>(0);
    const [agentMessageId, setAgentMessageId] = useState<string>('');

    // 其他状态
    const [agentInstanceId, setAgentInstanceId] = useState<string | null>(null);
    const [soundLevel, setSoundLevel] = useState<number>(0);
    const [systemPrompt, setSystemPrompt] = useState<string>('');

    // 游戏相关
    const [rawAgentText, setRawAgentText] = useState<string>('');
    const [activeGameType, setActiveGameType] = useState<string | null>(null);
    const [activeGameData, setActiveGameData] = useState<any | null>(null);

    // v2.2.0: 任务状态
    const [activeTaskData, setActiveTaskData] = useState<any>(null);
    const [taskError, setTaskError] = useState<any>(null);

    // v2.2.0: Extract Intent Analysis
    const { analyzeIntent } = useIntentAnalysis({
        tokenUrl,
        roomID,
        userID,
        agentInstanceIdRef,
        setActiveTaskData,
        setTaskError
    });
    // Refs for Event Handlers (Prevent Stale Closures)
    const activeGameTypeRef = useRef<string | null>(null);
    const userSubtitleRef = useRef<string>('');

    // Sync state to refs
    useEffect(() => { activeGameTypeRef.current = activeGameType; }, [activeGameType]);
    useEffect(() => { userSubtitleRef.current = userSubtitle; }, [userSubtitle]);

    // ========== Engine Lifecycle ==========
    useEffect(() => {
        if (!engineRef.current) {
            engineRef.current = new ZegoExpressEngine(appID, server);
            console.log("[RTC] Engine initialized");
        }

        const handleBeforeUnload = () => {
            if (agentInstanceIdRef.current) {
                const backendUrl = tokenUrl.startsWith('http') ? new URL(tokenUrl).origin : '';
                fetch(`${backendUrl}/api/agent/destroy`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        agentInstanceId: agentInstanceIdRef.current,
                        roomId: roomID
                    }),
                    keepalive: true
                }).catch(() => { });
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
            if (engineRef.current) {
                engineRef.current.destroyEngine();
                engineRef.current = null;
                console.log("[RTC] Engine destroyed");
            }
        };
    }, [appID, server, tokenUrl]);

    // ========== Token Fetching ==========
    const fetchToken = async (uid: string) => {
        const res = await fetch(tokenUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: uid }),
        });
        const data = await res.json();
        return data.token;
    };

    // ========== Message Handler ==========
    const handleRoomMessage = useCallback((content: any) => {
        try {
            const recvMsg = JSON.parse(content.msgContent);
            const { Cmd, Data, SeqId } = recvMsg;

            console.log('[RTC] Recv Room Msg:', recvMsg);

            // --- DEBUG: Trace all Cmds ---
            console.log(`[RTC DEBUG] Cmd: ${Cmd}, SpeakStatus: ${Data?.SpeakStatus} (${typeof Data?.SpeakStatus})`);
            // -----------------------------

            onRawMessage?.(Cmd, Data);

            // Cmd 6: Agent 状态更新
            if (Cmd === 6) {
                if (typeof Data.Status !== 'undefined') {
                    const newStatus = AGENT_STATUS_MAP[Data.Status];
                    if (newStatus) {
                        const prevStatus = agentStatusRef.current; // Get current status before update

                        setAgentStatus(newStatus);
                        agentStatusRef.current = newStatus; // Update Ref
                        console.log(`[RTC] Agent Status Update: ${prevStatus} -> ${newStatus}`);

                        // [Fix] Agent finished speaking -> Add to history
                        if (prevStatus === 'speaking' && newStatus !== 'speaking') {
                            const text = agentSubtitle; // Note: agentSubtitle might be slightly stale if update dominates, but usually fine.
                            // Better to use rawAgentText if available or just proceed.
                            if (text && text.trim().length > 0) {
                                console.log('[RTC] History push agent:', text);
                                conversationHistoryRef.current.push({ role: 'agent', content: text });
                                if (conversationHistoryRef.current.length > 20) conversationHistoryRef.current.shift();
                            }
                        }

                        // [Fix] Trigger Game Analysis on 'Thinking' state (Cmd 6)
                        // This is more reliable than SpeakStatus (Cmd 1) which might be missing.
                        if (newStatus === 'thinking') {
                            const currentGameType = activeGameTypeRef.current;
                            const currentSubtitle = userSubtitleRef.current;

                            if (currentGameType === 'turtle_soup' && currentSubtitle.trim().length > 0 && agentInstanceIdRef.current) {
                                console.log('[RTC] Agent thinking, triggering analysis for:', currentSubtitle);

                                const currentText = currentSubtitle.trim();
                                const backendUrl = tokenUrl.startsWith('http') ? new URL(tokenUrl).origin : '';

                                // Clear subtitle immediately to prevent double-trigger
                                userSubtitleRef.current = '';
                                setUserSubtitle('');

                                fetch(`${backendUrl}/api/game/analyze`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                        roomId: roomID,
                                        agentInstanceId: agentInstanceIdRef.current,
                                        agentId: agentIdRef.current, // Pass agentId
                                        userInput: currentText,
                                        conversationHistory: conversationHistoryRef.current
                                    })
                                }).catch(err => {
                                    console.error('[RTC] Failed to trigger game analysis:', err);
                                });

                                // Add user input to history AFTER triggering query
                                console.log('[RTC] History push user:', currentText);
                                conversationHistoryRef.current.push({ role: 'user', content: currentText });
                            }
                        }
                    }
                }
            }
            // Cmd 1: 用户说话状态
            else if (Cmd === 1) {
                if (Data.SpeakStatus === 1) {
                    setUserSegmentId(prev => prev + 1);
                    setUserSubtitle(''); // Only clear on start
                    userSubtitleRef.current = ''; // Sync ref immediately
                    console.log('[RTC] User started speaking, new segment');
                } else if (Data.SpeakStatus === 0) {
                    // [v2.2.0] User stopped speaking - trigger proactive intent analysis
                    const currentSubtitle = userSubtitleRef.current.trim();

                    if (currentSubtitle.length > 0 && agentInstanceIdRef.current) {
                        // Use extracted hook
                        analyzeIntent(currentSubtitle);
                    }

                    console.log(`[RTC] User stopped speaking.`);
                }
            }
            // Cmd 3: 用户语音识别 (ASR)
            else if (Cmd === 3) {
                if (SeqId && SeqId < lastAsrSeqId.current) {
                    console.warn(`[RTC] Drop out-of-order ASR packet: ${SeqId} < ${lastAsrSeqId.current}`);
                    return;
                }
                if (SeqId) lastAsrSeqId.current = SeqId;
                const newText = Data.Text || '';
                setUserSubtitle(newText);
                userSubtitleRef.current = newText; // Sync ref immediately
            }
            // Cmd 4: Agent 文本 (LLM Delta)
            else if (Cmd === 4) {
                const msgId = Data.MessageId;
                setAgentMessageId(msgId);
                const currentText = Data.Text || '';
                const seqId = SeqId || 0;

                // 组装增量文本
                let segments = agentTextCache.current.get(msgId);
                if (!segments) {
                    segments = new Map<number, string>();
                    agentTextCache.current.set(msgId, segments);
                }
                segments.set(seqId, currentText);
                const fullText = assembleTextFragments(segments);

                // 提取游戏元数据
                const metadata = extractGameMetadata(fullText);
                if (metadata.progress !== undefined || metadata.hint) {
                    console.log('[RTC] Game Metadata Detected:', metadata);
                    setActiveGameData((prev: any) => {
                        if (!prev) return prev;
                        const newData = { ...prev };
                        if (metadata.progress !== undefined) newData.progress = metadata.progress;
                        if (metadata.hint) {
                            if (!newData.hints) newData.hints = [];
                            if (!newData.hints.includes(metadata.hint)) {
                                newData.hints = [...newData.hints, metadata.hint];
                            }
                        }
                        return newData;
                    });
                }

                // 提取情绪
                const emotion = extractEmotion(fullText);
                if (emotion) {
                    console.log('[RTC] Emotion detected:', emotion);
                    setCurrentEmotion(emotion);
                }

                // 更新原始文本
                setRawAgentText(fullText);

                // 清理并设置字幕
                const cleanText = cleanSubtitleText(fullText);
                setAgentSubtitle(cleanText);
            }
        } catch (e) {
            console.error("Failed to parse room message", e);
        }
    }, [onRawMessage]);

    // ========== Start Call ==========
    const startCall = useCallback(async (agentId?: string) => {
        if (!engineRef.current) return;
        const zg = engineRef.current;

        try {
            // 1. 获取 Token
            console.log("[RTC] Fetching token for user:", userID);
            if (agentId) {
                agentIdRef.current = agentId;
            }
            const token = await fetchToken(userID);
            console.log("[RTC] Token fetched successfully");

            // 2. 登录房间
            await zg.loginRoom(roomID, token, { userID, userName }, { userUpdate: true });
            console.log("[RTC] Logged into room:", roomID);

            // 2.1 启用字幕接收
            zg.callExperimentalAPI({ method: 'onRecvRoomChannelMessage', params: {} });

            // 3. 创建麦克风流
            const stream = await zg.createStream({ camera: { audio: true, video: false } });
            setLocalStream(stream);

            // 4. 推流
            const streamID = `user_${userID}_${Date.now()}`;
            zg.startPublishingStream(streamID, stream);
            setIsPublishing(true);
            console.log(`[RTC] Started publishing: ${streamID}`);

            // 5. 监听流更新
            zg.on('roomStreamUpdate', async (_roomID: string, updateType: 'ADD' | 'DELETE', streamList: any[]) => {
                console.log(`[RTC] Room stream update: ${updateType}`, streamList);
                if (updateType === 'ADD') {
                    for (const s of streamList) {
                        // Check if already playing this stream to prevent 'player already exist' error
                        if (agentStreamIdRef.current === s.streamID) {
                            console.log(`[RTC] Stream ${s.streamID} already playing, skipping.`);
                            continue;
                        }

                        const isAgent = s.user?.userID === 'agent_xiaoye' || s.streamID.startsWith('agent_');
                        if (isAgent) {
                            agentStreamIdRef.current = s.streamID;
                            console.log(`[RTC] AI Agent stream recognized: ${s.streamID}`);
                        }

                        const remote = await zg.startPlayingStream(s.streamID).catch((err: any) => {
                            // If error is "player already exist" (1103049), just ignore it
                            if (err?.code === 1103049) {
                                console.warn(`[RTC] Player already exist for ${s.streamID}, ignoring.`);
                                return null;
                            }
                            console.error(`[RTC] Failed to play stream ${s.streamID}`, err);
                            return null;
                        });

                        if (remote) {
                            setRemoteStream(remote);
                            const audio = new Audio();
                            audio.srcObject = remote;
                            audio.play().catch(e => console.error('Audio play failed:', e));
                        }
                    }
                } else if (updateType === 'DELETE') {
                    for (const s of streamList) {
                        if (s.streamID === agentStreamIdRef.current) {
                            console.log(`[RTC] AI Agent stream removed: ${s.streamID}`);
                            agentStreamIdRef.current = null;
                            setRemoteStream(null);
                        }
                    }
                }
            });

            // 5.2 监听播放状态
            zg.on('playerStateUpdate', (result: any) => {
                if (result.state === 'PLAYING') {
                    const sID = result.streamID;
                    const isAgent = sID.startsWith('agent_') || (sID === agentStreamIdRef.current);
                    if (isAgent && agentInstanceIdRef.current) {
                        onAgentReady?.(agentInstanceIdRef.current);
                    }
                }
            });

            // 5.1 监听音量变化
            zg.on('soundLevelUpdate', (list: any[]) => {
                let agentLevel = 0;
                let found = false;

                for (const item of list) {
                    if (item.type === 'pull') {
                        const isAgent = (agentStreamIdRef.current && item.streamID === agentStreamIdRef.current) ||
                            item.streamID.startsWith('agent_');
                        if (isAgent) {
                            if (!agentStreamIdRef.current) {
                                agentStreamIdRef.current = item.streamID;
                            }
                            agentLevel = Math.floor(item.soundLevel || 0);
                            found = true;
                            break;
                        }
                    }
                }
                setSoundLevel(found ? agentLevel : 0);
            });
            zg.setSoundLevelDelegate(true, 100);

            // 6. 监听房间附加信息
            zg.on('roomExtraInfoUpdate', (_roomID: string, _roomExtraInfoList: any[]) => {
                // Backup handler
            });

            // 7. 监听字幕消息
            zg.on('recvExperimentalAPI', (result: { method: string, content: any }) => {
                if (result.method === 'onRecvRoomChannelMessage') {
                    handleRoomMessage(result.content);
                }
            });

            // 8. 监听广播消息 (Cmd 1002 状态同步 - Server API SendBroadcastMessage)
            zg.on('IMRecvBroadcastMessage', (_roomID: string, chatData: any[]) => {
                try {
                    console.log('[RTC] IM Broadcast Message:', chatData);
                    chatData.forEach((msg) => {
                        const content = msg.message;
                        try {
                            const json = JSON.parse(content);
                            if (json.cmd === 1002 && json.data?.type === 'game_state_update') {
                                const payload = json.data.payload;
                                console.log('[RTC] Game State Update (Broadcast):', payload);
                                setActiveGameData((prev: any) => {
                                    return { ...prev, ...payload };
                                });
                                if (json.data.gameType) {
                                    setActiveGameType(json.data.gameType);
                                }
                            }
                        } catch (e) {
                            // ignore non-json
                        }
                    });
                } catch (e) {
                    console.error('[RTC] Handle Broadcast Error', e);
                }
            });

            // 8.1 监听自定义信令 (Cmd 1002 Backup)
            zg.on('IMRecvCustomCommand', (_roomID: string, _fromUser: any, command: string) => {
                try {
                    console.log('[RTC] IM Custom Command:', command);
                    const json = JSON.parse(command);
                    if (json.cmd === 1002 && json.data?.type === 'game_state_update') {
                        const payload = json.data.payload;
                        console.log('[RTC] Game State Update:', payload);
                        setActiveGameData((prev: any) => {
                            // Merge with existing data
                            return { ...prev, ...payload };
                        });
                        // 同时也确保 gameType 正确
                        if (json.data.gameType) {
                            setActiveGameType(json.data.gameType); // 覆盖 update
                        }
                    }
                } catch (e) {
                    // ignore non-json
                }
            });

            // 8. 创建 Agent 实例
            const backendUrl = tokenUrl.startsWith('http') ? new URL(tokenUrl).origin : '';
            const createRes = await fetch(`${backendUrl}/api/agent/create`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    roomId: roomID,
                    userId: userID,
                    userStreamId: streamID,
                    agentId: agentId
                })
            });
            const createResult = await createRes.json();
            console.log('[RTC] Agent create result:', createResult);

            if (createResult.Data?.AgentInstanceId) {
                agentInstanceIdRef.current = createResult.Data.AgentInstanceId;
                setAgentInstanceId(createResult.Data.AgentInstanceId);
            }

            if (createResult.systemPrompt) {
                setSystemPrompt(createResult.systemPrompt);
            }

        } catch (err: any) {
            console.error("Start call failed", err);
            logger.error("Start call failed", { error: err, roomID });
            onError?.(err?.message || '通话连接失败，请重试');
        }
    }, [userID, userName, roomID, tokenUrl, onError, handleRoomMessage, onAgentReady]);

    // ========== End Call ==========
    const endCall = useCallback(async () => {
        if (!engineRef.current) return;
        const zg = engineRef.current;

        // 1. 立即停止本地媒体
        if (isPublishing) setIsPublishing(false);
        if (localStream) {
            localStream.getTracks().forEach(track => track.stop());
            zg.destroyStream(localStream);
            setLocalStream(null);
        }
        if (remoteStream) setRemoteStream(null);

        // 2. 离开房间
        zg.logoutRoom(roomID);

        // 3. 重置状态
        setAgentStatus('idle');
        setUserSubtitle('');
        setAgentSubtitle('');
        setCurrentEmotion('neutral');
        setSoundLevel(0);
        setSystemPrompt('');
        agentTextCache.current.clear();
        agentStreamIdRef.current = null;
        setActiveGameType(null);
        setActiveGameData(null);

        // 4. 清理后端资源
        if (agentInstanceIdRef.current) {
            const instanceId = agentInstanceIdRef.current;
            agentInstanceIdRef.current = null;
            setAgentInstanceId(null);

            try {
                const backendUrl = tokenUrl.startsWith('http') ? new URL(tokenUrl).origin : '';
                await fetch(`${backendUrl}/api/agent/destroy`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        agentInstanceId: instanceId,
                        roomId: roomID
                    })
                });
            } catch (err) {
                console.error('[RTC] Failed to destroy agent:', err);
            }
        }
    }, [roomID, localStream, remoteStream, isPublishing, tokenUrl]);

    // ========== Toggle Mic ==========
    const toggleMic = useCallback(async () => {
        if (localStream) {
            const track = localStream.getAudioTracks()[0];
            if (track) {
                track.enabled = !track.enabled;
                setIsMicOn(track.enabled);
            }
        }
    }, [localStream]);

    // ========== Action Detection ==========
    useActionDetector(rawAgentText, agentMessageId, useCallback((action) => {
        console.log('[RTC] Action Detected:', action);

        let normalizedParam = action.param;

        if (action.type === 'GAME') {
            let gameType = action.param ? action.param.trim() : 'unknown';
            if (GAME_ALIASES[gameType]) {
                gameType = GAME_ALIASES[gameType];
            }
            normalizedParam = gameType;
            setActiveGameType(gameType);
        } else if (action.type === 'GAME_END') {
            setActiveGameType(null);
            setActiveGameData(null);
        } else if (action.type === 'TASK') {
            // v2.2.0: 任务类型处理
            normalizedParam = action.param?.trim() || 'unknown';
            console.log('[RTC] Task type detected:', normalizedParam);
        }

        if (!agentInstanceIdRef.current) return;

        // 构造 Dispatch 参数
        const payload: any = {
            action: action.type,
            instanceId: agentInstanceIdRef.current,
            roomId: roomID
        };

        if (normalizedParam) {
            if (action.type === 'NEWS') {
                payload.params = { type: normalizedParam };
            } else if (action.type === 'GAME') {
                payload.params = { gameType: normalizedParam };
            } else if (action.type === 'TASK') {
                // v2.2.0: 任务参数 (支持 TASK:weather 或 TASK:weather:深圳市 格式)
                const parts = normalizedParam.split(':');
                const taskType = parts[0] || 'unknown';
                const location = parts[1] || '';

                payload.params = {
                    taskType: taskType,
                    location: location,
                    userId: userID
                };
            } else {
                payload.params = { value: normalizedParam };
            }
        }

        const backendUrl = tokenUrl.startsWith('http') ? new URL(tokenUrl).origin : '';
        fetch(`${backendUrl}/api/dispatch`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        }).then(res => res.json())
            .then(data => {
                console.log('[RTC] Dispatch result:', data);
                if (data.data?.puzzle) {
                    setActiveGameData((prev: any) => {
                        if (prev?.id === data.data.id) {
                            console.warn(`[RTC] Same game ID: ${data.data.id}`);
                        }
                        return data.data;
                    });
                }

                // v2.2.0: 处理任务结果
                if (action.type === 'TASK') {
                    if (data.data?.success) {
                        console.log('[RTC] Task completed, setting data:', data.data);
                        console.log('[RTC] Task completed, setting data:', data.data);
                        // Force state update by creating new object reference
                        setActiveTaskData({ ...data.data.data, _ts: Date.now() });
                        setTaskError(null);
                    } else if (data.data?.error) {
                        console.error('[RTC] Task failed, setting error:', data.data.error);
                        setTaskError(data.data.error);
                        setActiveTaskData(null);
                    }
                }
            })
            .catch(e => {
                console.error('[RTC] Dispatch failed:', e);
                logger.error("Dispatch API failed", { error: e, action: action.type });
            });

    }, [tokenUrl, roomID, userID]));

    // v2.2.0: 监听用户语音，实现“回复关闭卡片”
    useEffect(() => {
        const text = userSubtitle.trim().toLowerCase();
        if (activeTaskData && (
            text.includes('好的') ||
            text.includes('知道了') ||
            text.includes('收到') ||
            text.includes('关闭') ||
            text.includes('行吧')
        )) {
            console.log('[RTC] User voice trigger: closing task card');
            setActiveTaskData(null);
        }
    }, [userSubtitle, activeTaskData]);

    // ========== Return API ==========
    return {
        engine: engineRef.current,
        localStream,
        remoteStream,
        isPublishing,
        agentStatus,
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
        setTaskError,
        startCall,
        endCall,
        toggleMic
    };
}

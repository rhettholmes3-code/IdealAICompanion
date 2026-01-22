/**
 * Agent 选择模态框组件
 */
import React from 'react';
import type { AgentInfo } from './constants';

interface AgentSelectorProps {
    isOpen: boolean;
    onClose: () => void;
    agents: AgentInfo[];
    currentAgent: AgentInfo | null;
    onSelect: (agent: AgentInfo) => void;
}

export const AgentSelector: React.FC<AgentSelectorProps> = ({
    isOpen,
    onClose,
    agents,
    currentAgent,
    onSelect
}) => {
    if (!isOpen) return null;

    return (
        <div className="absolute inset-0 z-50 bg-black/70 backdrop-blur-md flex items-end sm:items-center justify-center animate-backdrop-in">
            {/* Modal Container */}
            <div className="w-full max-h-[65%] sm:max-h-[80%] sm:max-w-sm glass-modal rounded-t-3xl sm:rounded-3xl flex flex-col animate-modal-in">
                {/* Drag Indicator (iOS Style) */}
                <div className="flex justify-center pt-3 pb-1">
                    <div className="w-10 h-1 rounded-full bg-white/20" />
                </div>

                {/* Header */}
                <div className="flex justify-between items-center px-6 pb-4">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                        <span className="material-symbols-outlined text-gradient-start">smart_toy</span>
                        选择智能体
                    </h3>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
                    >
                        <span className="material-symbols-outlined text-white/60 text-[20px]">close</span>
                    </button>
                </div>

                {/* Agent List */}
                <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-3">
                    {agents.map(agent => {
                        const isSelected = currentAgent?.id === agent.id;
                        return (
                            <button
                                key={agent.id}
                                onClick={() => onSelect(agent)}
                                className={`agent-list-item w-full flex items-center gap-4 p-4 rounded-2xl ${isSelected ? 'selected' : ''}`}
                            >
                                {/* Avatar with Glow Effect */}
                                <div className={`avatar-glow w-14 h-14 rounded-full overflow-hidden bg-black/30 ${isSelected ? 'active' : ''}`}>
                                    <img
                                        src={agent.backgroundImage}
                                        alt={agent.name}
                                        className="w-full h-full object-cover"
                                    />
                                </div>

                                {/* Agent Info */}
                                <div className="flex-1 text-left">
                                    <div className="font-semibold text-white text-[15px]">{agent.name}</div>
                                    <div className="text-xs text-white/40 mt-0.5">ID: {agent.id}</div>
                                </div>

                                {/* Selection Indicator */}
                                {isSelected && (
                                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-gradient-start to-gradient-end flex items-center justify-center">
                                        <span className="material-symbols-outlined text-white text-[16px]">check</span>
                                    </div>
                                )}
                            </button>
                        );
                    })}
                    {agents.length === 0 && (
                        <div className="text-center text-white/30 py-10 flex flex-col items-center gap-2">
                            <span className="material-symbols-outlined text-[32px]">person_off</span>
                            <span>暂无可用智能体</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

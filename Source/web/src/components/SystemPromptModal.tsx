import React, { useState } from 'react';

interface SystemPromptModalProps {
    isOpen: boolean;
    onClose: () => void;
    content: string;
}

export const SystemPromptModal: React.FC<SystemPromptModalProps> = ({ isOpen, onClose, content }) => {
    const [copied, setCopied] = useState(false);

    if (!isOpen) return null;

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(content);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy text: ', err);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-fade-in"
                onClick={onClose}
            />

            {/* Modal Content */}
            <div className="relative w-full max-w-2xl max-h-[85vh] flex flex-col bg-slate-900 border border-white/10 rounded-2xl shadow-2xl animate-scale-in z-10">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-white/5">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                        <span className="material-symbols-outlined text-indigo-400">integration_instructions</span>
                        System Prompt Debug
                    </h3>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleCopy}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${copied
                                    ? 'bg-green-500/20 text-green-400'
                                    : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'
                                }`}
                        >
                            <span className="material-symbols-outlined text-[16px]">
                                {copied ? 'check' : 'content_copy'}
                            </span>
                            {copied ? '已复制' : '复制'}
                        </button>
                        <button
                            onClick={onClose}
                            className="p-1.5 rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-colors"
                        >
                            <span className="material-symbols-outlined">close</span>
                        </button>
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                    <pre className="whitespace-pre-wrap font-mono text-sm text-white/80 bg-black/30 p-4 rounded-xl border border-white/5">
                        {content || 'Wait to start calling to generate prompt...'}
                    </pre>
                </div>
            </div>
        </div>
    );
};

import React, { useState, useEffect, createContext, useContext, useCallback } from 'react';

// Toast 类型
type ToastType = 'info' | 'success' | 'warning' | 'error';

interface Toast {
    id: string;
    message: string;
    type: ToastType;
}

interface ToastContextType {
    showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within ToastProvider');
    }
    return context;
};

interface ToastProviderProps {
    children: React.ReactNode;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const showToast = useCallback((message: string, type: ToastType = 'info') => {
        const id = Date.now().toString();
        setToasts(prev => [...prev, { id, message, type }]);

        // 3秒后自动关闭
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 3000);
    }, []);

    const removeToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            <ToastContainer toasts={toasts} onRemove={removeToast} />
        </ToastContext.Provider>
    );
};

// Toast 容器组件
interface ToastContainerProps {
    toasts: Toast[];
    onRemove: (id: string) => void;
}

const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onRemove }) => {
    if (toasts.length === 0) return null;

    return (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2">
            {toasts.map(toast => (
                <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
            ))}
        </div>
    );
};

// 单个 Toast
interface ToastItemProps {
    toast: Toast;
    onRemove: (id: string) => void;
}

const ToastItem: React.FC<ToastItemProps> = ({ toast, onRemove }) => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // 入场动画
        setTimeout(() => setIsVisible(true), 10);
    }, []);

    const typeStyles: Record<ToastType, string> = {
        info: 'bg-blue-500/90',
        success: 'bg-green-500/90',
        warning: 'bg-yellow-500/90',
        error: 'bg-red-500/90'
    };

    const icons: Record<ToastType, string> = {
        info: 'info',
        success: 'check_circle',
        warning: 'warning',
        error: 'error'
    };

    return (
        <div
            className={`flex items-center gap-2 px-4 py-3 rounded-xl text-white text-sm shadow-lg backdrop-blur-md
                transition-all duration-300 cursor-pointer
                ${typeStyles[toast.type]}
                ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}
            onClick={() => onRemove(toast.id)}
        >
            <span className="material-symbols-outlined text-lg">{icons[toast.type]}</span>
            <span>{toast.message}</span>
        </div>
    );
};

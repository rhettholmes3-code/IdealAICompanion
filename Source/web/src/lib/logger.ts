
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const LOG_ENDPOINT = '/api/log/report';

export type LogLevel = 'info' | 'warn' | 'error';

export interface LogContext {
    [key: string]: any;
}

class ActionReporter {
    private static instance: ActionReporter;
    private queue: any[] = [];
    private isSending = false;

    private constructor() {
        if (typeof window !== 'undefined') {
            window.addEventListener('beforeunload', () => this.flush());
        }
    }

    public static getInstance(): ActionReporter {
        if (!ActionReporter.instance) {
            ActionReporter.instance = new ActionReporter();
        }
        return ActionReporter.instance;
    }

    public log(level: LogLevel, message: string, context: LogContext = {}) {
        const entry = {
            timestamp: new Date().toISOString(),
            level,
            error: { message }, // Align with backend structure
            context: {
                url: typeof window !== 'undefined' ? window.location.href : '',
                ...context
            }
        };

        // Console output
        const style = level === 'error' ? 'color: red' : level === 'warn' ? 'color: orange' : 'color: blue';
        console.log(`%c[ActionReporter] ${message}`, style, context);

        this.queue.push(entry);
        this.processQueue();
    }

    public error(error: Error | string, context: LogContext = {}) {
        const message = error instanceof Error ? error.message : String(error);
        const stack = error instanceof Error ? error.stack : undefined;

        this.log('error', message, { ...context, stack });
    }

    private async processQueue() {
        if (this.isSending || this.queue.length === 0) return;

        this.isSending = true;
        const batch = this.queue.splice(0, 5); // Send up to 5 logs at a time

        try {
            // Use sendBeacon for better reliability on page unload, but it doesn't support JSON headers easily
            // So we fallback to fetch with keepalive
            await Promise.all(batch.map(entry =>
                fetch(LOG_ENDPOINT, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(entry),
                    keepalive: true
                }).catch(e => console.error('Failed to report log', e))
            ));
        } finally {
            this.isSending = false;
            // Process remaining items
            if (this.queue.length > 0) {
                setTimeout(() => this.processQueue(), 1000);
            }
        }
    }

    private flush() {
        if (this.queue.length === 0) return;
        // Try formatted beacon
        const data = JSON.stringify(this.queue);
        // Blob for sendBeacon
        const blob = new Blob([data], { type: 'application/json' });
        navigator.sendBeacon(LOG_ENDPOINT, blob);
    }
}

export const logger = ActionReporter.getInstance();

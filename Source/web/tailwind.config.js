/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: {
                    light: '#7DD3FC',
                    DEFAULT: '#38BDF8',
                    dark: '#0284C7',
                },
                gradient: {
                    start: '#60A5FA',
                    end: '#A78BFA',
                },
                bg: {
                    dark: '#0F172A',
                    mid: '#1E293B',
                }
            },
            fontFamily: {
                sans: ['"Noto Sans SC"', 'sans-serif'],
            },
            keyframes: {
                'pulse-glow': {
                    '0%, 100%': { opacity: '0.4', transform: 'scale(1)' },
                    '50%': { opacity: '0.6', transform: 'scale(1.1)' },
                },
                'status-pulse': {
                    '0%, 100%': { opacity: '1' },
                    '50%': { opacity: '0.5' },
                },
                'message-in': {
                    'from': { opacity: '0', transform: 'translateY(10px)' },
                    'to': { opacity: '1', transform: 'translateY(0)' },
                }
            },
            animation: {
                'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
                'status-pulse': 'status-pulse 1.5s ease-in-out infinite',
                'message-in': 'message-in 0.3s ease forwards',
            }
        },
    },
    plugins: [],
}

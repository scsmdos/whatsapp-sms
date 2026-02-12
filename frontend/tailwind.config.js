/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                'roboto': ['Roboto', 'sans-serif'],
            },
            colors: {
                whatsapp: {
                    teal: '#008069',      // Main Header / Darker Green
                    light: '#25D366',     // Bright Green (Logos/Buttons)
                    dark: '#075E54',      // Deepest Green
                    bg: '#EFEAE2',        // Chat Background (Beige-ish)
                    hover: '#00A884',     // Hover State
                    chat: '#D9FDD3',      // Sent Message Bubble
                },
                primary: {
                    50: '#F0FDF4',
                    100: '#DCFCE7',
                    200: '#BBF7D0',
                    300: '#86EFAC',
                    400: '#4ADE80',
                    500: '#10B981',
                    600: '#059669',
                    700: '#047857',
                    800: '#065F46',
                    900: '#064E3B',
                },
                gray: {
                    50: '#F0F2F5', // WhatsApp Web Background
                    100: '#E9EDEF',
                    200: '#D1D7DB',
                    800: '#111B21', // Dark Text
                    900: '#0B141A',
                }
            },
            boxShadow: {
                'card': '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)',
                'modal': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                'sm-light': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                'light': '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
            },
            backgroundImage: {
                'chat-pattern': "url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')",
            }
        },
    },
    plugins: [],
}

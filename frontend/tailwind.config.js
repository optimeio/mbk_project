/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "!./src/**/*.backup.{js,ts,jsx,tsx,mdx}",
    "!./src/**/*.corrupted.{js,ts,jsx,tsx,mdx}",
    "!./src/**/*.test.{js,ts,jsx,tsx,mdx}",
    "!./src/**/*.spec.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    screens: {
      xs: '375px',
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      '2xl': '1536px',
    },
    extend: {
      spacing: {
        touch: '44px',
      },
      minHeight: {
        touch: '44px',
      },
      minWidth: {
        touch: '44px',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'ui-sans-serif', 'system-ui'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      colors: {
        // Portal Legacy Colors (Keep for Admin Portal compatibility)
        primary: "#0f2535",
        primaryDark: "#0b242d",
        secondary: "#143d52",
        accentLight: "#2FA97A",
        background: "#f4f7f9",
        card: "#ffffff",
        border: "#d9e2ec",
        textDark: "#122c1e",
        textLight: "#2d5c3e",

        // MBK Forest Green Master Tokens
        brand: {
          50:  '#f2f7f4',
          100: '#eaf3ee',
          200: '#d4e9db',
          300: '#8ab89a',
          400: '#5a8c6e',
          500: '#2d7a52',
          600: '#245f3f',
          DEFAULT: '#2d7a52',
        },
        surface: {
          50:  '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          850: '#172032',
          900: '#0f172a',
          950: '#080e1a',
        },
        accent: {
          teal:   '#14b8a6',
          cyan:   '#06b6d4',
          violet: '#8b5cf6',
          amber:  '#f59e0b',
          rose:   '#f43f5e',
          green:  '#10b981',
          DEFAULT: '#1C7C56',
        },
      },
      boxShadow: {
        'soft':       '0 8px 24px rgba(15, 47, 58, 0.08)',
        'glass':      '0 8px 32px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.06)',
        'card':       '0 4px 24px rgba(0,0,0,0.12)',
        'message':    '0 1px 4px rgba(0,0,0,0.08)',
        'glow-brand': '0 0 20px rgba(45,122,82,0.25)',
      },
      backgroundImage: {
        'gradient-brand': 'linear-gradient(135deg, #2d7a52 0%, #38a169 100%)',
        'gradient-dark':  'linear-gradient(180deg, #122c1e 0%, #080e1a 100%)',
        'gradient-surface':'linear-gradient(180deg, #f2f7f4 0%, #ffffff 100%)',
      },
      animation: {
        'fade-in':       'fadeIn 0.2s ease-out',
        'slide-up':      'slideUp 0.25s cubic-bezier(0.34,1.56,0.64,1)',
        'slide-in-left': 'slideInLeft 0.3s cubic-bezier(0.34,1.56,0.64,1)',
        'pulse-soft':    'pulseSoft 2s ease-in-out infinite',
        'typing':        'typing 1.2s steps(3,end) infinite',
        'bounce-dot':    'bounceDot 1.4s ease-in-out infinite',
        'fadeIn':        'fadeIn 0.3s ease-in-out',
      },
      keyframes: {
        fadeIn:      { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp:     { from: { opacity: 0, transform: 'translateY(12px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        slideInLeft: { from: { opacity: 0, transform: 'translateX(-16px)' }, to: { opacity: 1, transform: 'translateX(0)' } },
        pulseSoft:   { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.6 } },
        bounceDot:   { '0%,80%,100%': { transform: 'scale(0)' }, '40%': { transform: 'scale(1)' } },
      },
    },
  },
  plugins: [],
};

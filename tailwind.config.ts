import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          base: '#0b0b0d',
          surface: '#121215',
          elevated: '#1a1a1f',
        },
        // Swiss Post house colours, used for the demo chrome only.
        post: {
          yellow: '#FFCC00',
          'yellow-dim': 'rgba(255,204,0,0.10)',
          'yellow-soft': 'rgba(255,204,0,0.22)',
          dark: '#2b2b2b',
        },
        // Unit8 house blue, used only for maker attribution so it never
        // competes with the Swiss Post yellow the demo itself runs on.
        unit8: '#fff',
        status: {
          open: '#22c55e',
          closing: '#f59e0b',
          closed: '#ef4444',
          converted: '#38bdf8',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      animation: {
        'wave-1': 'wave 1.0s ease-in-out infinite alternate',
        'wave-2': 'wave 1.0s ease-in-out 0.1s infinite alternate',
        'wave-3': 'wave 1.0s ease-in-out 0.2s infinite alternate',
        'wave-4': 'wave 1.0s ease-in-out 0.3s infinite alternate',
        'wave-5': 'wave 1.0s ease-in-out 0.15s infinite alternate',
        'pulse-ring': 'pulse-ring 2s ease-out infinite',
        'fade-up': 'fade-up 0.4s ease-out forwards',
        'slide-in': 'slide-in 0.3s ease-out forwards',
      },
      keyframes: {
        wave: {
          '0%': { transform: 'scaleY(0.4)' },
          '100%': { transform: 'scaleY(1.6)' },
        },
        'pulse-ring': {
          '0%': { transform: 'scale(1)', opacity: '0.6' },
          '100%': { transform: 'scale(1.6)', opacity: '0' },
        },
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in': {
          '0%': { opacity: '0', transform: 'translateX(-8px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;

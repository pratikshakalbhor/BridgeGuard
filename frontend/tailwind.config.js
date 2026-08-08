/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Midnight blue accents
        midnight: {
          950: '#04060d',
          900: '#080b16',
          800: '#0b0f1f',
          700: '#111829',
          600: '#16213a',
        },
        // Cyan accent for primary actions
        cyan: {
          300: '#67e8f9',
          400: '#22d3ee',
          500: '#06b6d4',
        },
        // Purple highlight
        violet: {
          300: '#c4b5fd',
          400: '#a78bfa',
          500: '#8b5cf6',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 40px -12px rgba(34, 211, 238, 0.45)',
        'glow-violet': '0 0 40px -12px rgba(139, 92, 246, 0.45)',
        card: '0 18px 50px -20px rgba(0, 0, 0, 0.6)',
      },
      backgroundImage: {
        'grid-faint':
          'linear-gradient(rgba(139, 152, 173, 0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(139, 152, 173, 0.06) 1px, transparent 1px)',
        'hero-glow':
          'radial-gradient(700px 420px at 15% 0%, rgba(34, 211, 238, 0.14) 0%, transparent 60%), radial-gradient(700px 420px at 85% 10%, rgba(139, 92, 246, 0.16) 0%, transparent 60%)',
      },
      keyframes: {
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(18px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 24px -6px rgba(34, 211, 238, 0.4)' },
          '50%': { boxShadow: '0 0 40px -4px rgba(34, 211, 238, 0.7)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.6s ease-out both',
        'fade-in': 'fade-in 0.5s ease-out both',
        'pulse-glow': 'pulse-glow 3s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

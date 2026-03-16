import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Playfair Display', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        // Ink Indigo primary
        ink: {
          50: '#EEF2FF',
          100: '#E0E7FF',
          200: '#C7D2FE',
          300: '#A5B4FC',
          400: '#818CF8',
          500: '#6366F1',
          600: '#4F46E5',
          700: '#4338CA',
          800: '#3730A3',
          900: '#1E1B4B',
        },
        // Warm Stone neutral
        stone: {
          50: '#FAFAF9',
          100: '#F5F5F4',
          200: '#E7E5E4',
          300: '#D6D3D1',
          400: '#A8A29E',
          500: '#78716C',
          600: '#57534E',
          700: '#44403C',
          800: '#292524',
          900: '#1C1917',
        },
        // Semantic colors
        background: '#FAFAF9',
        foreground: '#1C1917',
        muted: '#F5F5F4',
        'muted-foreground': '#78716C',
        accent: '#6366F1',
        'accent-light': '#818CF8',
        'accent-foreground': '#FFFFFF',
        border: '#E7E5E4',
        card: '#FFFFFF',
        ring: '#6366F1',
        success: '#059669',
        warning: '#D97706',
        danger: '#DC2626',
      },
      borderRadius: {
        sm: '6px',
        DEFAULT: '8px',
        md: '8px',
        lg: '12px',
        xl: '16px',
        '2xl': '24px',
      },
      maxWidth: {
        '6xl': '72rem',
      },
      boxShadow: {
        xs: '0 1px 2px rgba(0,0,0,0.04)',
        sm: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        DEFAULT: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        md: '0 4px 8px -2px rgba(0,0,0,0.06), 0 2px 4px -2px rgba(0,0,0,0.04)',
        lg: '0 12px 24px -4px rgba(0,0,0,0.08), 0 4px 8px -2px rgba(0,0,0,0.04)',
        ring: '0 0 0 3px rgba(99,102,241,0.15)',
        glow: '0 4px 16px rgba(99,102,241,0.12)',
      },
      keyframes: {
        'pulse-dot': {
          '0%, 100%': { transform: 'scale(1)', opacity: '1' },
          '50%': { transform: 'scale(1.3)', opacity: '0.7' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'slow-rotate': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        'bounce-dot': {
          '0%, 80%, 100%': { transform: 'translateY(0)' },
          '40%': { transform: 'translateY(-8px)' },
        },
        breathing: {
          '0%, 100%': { opacity: '0.4' },
          '50%': { opacity: '1' },
        },
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'cursor-blink': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
      },
      animation: {
        'pulse-dot': 'pulse-dot 2s infinite',
        float: 'float 5s ease-in-out infinite',
        'float-slow': 'float 4s ease-in-out infinite',
        'slow-rotate': 'slow-rotate 60s linear infinite',
        'bounce-dot': 'bounce-dot 1.4s ease-in-out infinite',
        breathing: 'breathing 2s ease-in-out infinite',
        'fade-in-up': 'fade-in-up 0.4s ease-out',
        shimmer: 'shimmer 2s infinite linear',
        'cursor-blink': 'cursor-blink 1s step-end infinite',
      },
    },
  },
  plugins: [],
}

export default config

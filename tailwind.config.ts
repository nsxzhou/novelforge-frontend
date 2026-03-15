import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Calistoga', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        background: '#FAFAFA',
        foreground: '#0F172A',
        muted: '#F1F5F9',
        'muted-foreground': '#64748B',
        accent: '#0052FF',
        'accent-secondary': '#4D7CFF',
        'accent-foreground': '#FFFFFF',
        border: '#E2E8F0',
        card: '#FFFFFF',
        ring: '#0052FF',
      },
      borderRadius: {
        lg: '12px',
        xl: '16px',
        '2xl': '20px',
      },
      maxWidth: {
        '6xl': '72rem',
      },
      boxShadow: {
        sm: '0 1px 2px rgba(0,0,0,0.03)',
        DEFAULT: '0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.03)',
        md: '0 4px 6px rgba(0,0,0,0.04)',
        lg: '0 10px 15px rgba(0,0,0,0.05)',
        accent: '0 4px 12px rgba(0,82,255,0.10)',
        'accent-lg': '0 8px 20px rgba(0,82,255,0.12)',
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
      },
      animation: {
        'pulse-dot': 'pulse-dot 2s infinite',
        float: 'float 5s ease-in-out infinite',
        'float-slow': 'float 4s ease-in-out infinite',
        'slow-rotate': 'slow-rotate 60s linear infinite',
      },
    },
  },
  plugins: [],
}

export default config

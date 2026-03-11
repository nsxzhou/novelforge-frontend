import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Outfit', 'sans-serif'],
      },
      colors: {
        background: '#FFFFFF',
        foreground: '#111827',
        primary: '#3B82F6',
        secondary: '#10B981',
        accent: '#F59E0B',
        muted: '#F3F4F6',
        border: '#E5E7EB',
      },
      borderRadius: {
        md: '6px',
        lg: '8px',
      },
      maxWidth: {
        '8xl': '90rem',
      },
    },
  },
  plugins: [],
}

export default config

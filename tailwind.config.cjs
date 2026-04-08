module.exports = {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          900: '#0b0f14',
          800: '#121824',
          700: '#1a2231',
          600: '#2a3447',
          500: '#3a465f'
        },
        mint: {
          500: '#10b981',
          400: '#34d399',
          300: '#6ee7b7'
        },
        amber: {
          500: '#f59e0b'
        },
        rose: {
          500: '#ef4444'
        }
      },
      fontFamily: {
        display: ['"Sora"', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular']
      },
      boxShadow: {
        soft: '0 24px 60px rgba(6, 10, 16, 0.45)'
      }
    }
  },
  plugins: []
};


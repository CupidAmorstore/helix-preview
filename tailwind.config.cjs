// HELIX design tokens. Dark-first; colours chosen for WCAG AA contrast on the ink surfaces.
module.exports = {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          900: '#0A0E15', // app background
          800: '#121923', // cards
          700: '#19222F', // raised controls
          600: '#253142', // lines
          500: '#3A465F'
        },
        // muted text tuned for contrast on ink (old slate-500 #64748b failed AA)
        slate: {
          500: '#8E9BB0',
          600: '#7A879C'
        },
        helix: {
          300: '#7FD9EE',
          400: '#4CC9E8', // brand accent / primary actions
          500: '#2BB2D4'
        },
        mint: {
          500: '#10b981',
          400: '#35C48F',
          300: '#6ee7b7'
        },
        up: '#35C48F',
        down: '#F26E6E',
        paper: '#E9A33C',
        amber: {
          500: '#f59e0b'
        },
        rose: {
          500: '#ef4444'
        }
      },
      fontFamily: {
        display: ['"Instrument Sans"', 'system-ui', '-apple-system', '"Segoe UI"', 'Roboto', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace']
      },
      boxShadow: {
        soft: '0 24px 60px rgba(6, 10, 16, 0.45)'
      }
    }
  },
  plugins: []
};

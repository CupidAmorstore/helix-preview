// HELIX design tokens. Dark-first; colours chosen for WCAG AA contrast on the ink surfaces.
module.exports = {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // "Ledger" system v2: warm ink + ivory type, one calm accent. Checked for WCAG AA on ink-900.
        white: '#F3EFE6', // ivory: primary text and primary actions
        ink: {
          900: '#0F0F0D', // app background
          800: '#161613', // raised surfaces (sheets, inputs)
          700: '#201F1B', // controls
          600: '#2E2D28', // hairlines
          500: '#46443D'
        },
        slate: {
          100: '#ECE8DE',
          200: '#DAD5C9',
          300: '#C3BDB0',
          400: '#A6A093',
          500: '#928C7F',
          600: '#888274'
        },
        helix: {
          300: '#D3DBFF',
          400: '#B6C3FF', // accent: links, focus, selected state
          500: '#94A3F2'
        },
        mint: {
          500: '#10b981',
          400: '#35C48F',
          300: '#6ee7b7'
        },
        up: '#4CC38A',
        down: '#F07A6A',
        paper: '#E3A94B',
        amber: {
          500: '#f59e0b'
        },
        rose: {
          500: '#ef4444'
        }
      },
      fontFamily: {
        display: ['"Instrument Sans"', 'system-ui', '-apple-system', '"Segoe UI"', 'Roboto', 'sans-serif'],
        // figures use the text face with tabular numerals (see styles.css); real code uses font-code
        mono: ['"Instrument Sans"', 'system-ui', 'sans-serif'],
        code: ['"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace']
      },
      boxShadow: {
        soft: '0 24px 60px rgba(6, 10, 16, 0.45)'
      }
    }
  },
  plugins: []
};

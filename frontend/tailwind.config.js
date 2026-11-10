export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Original keys preserved for existing components
        primary:  'var(--primary, #0F6E56)',
        'primary-dark': 'var(--primary-dark, #085041)',
        'primary-light': 'var(--primary-light, #E6F5F0)',
        sidebar:  'var(--sidebar, #0A2E24)',
        surface:  '#F7F8F7',
        border:   '#E8EAE8',
        'text-main': '#141A14',
        'text-sub':  '#4A544A',
        'text-dim':  '#9EA89E',
        
        // Full Grove Design System Ramp
        grove: {
          50: 'var(--grove-50, #E6F5F0)',
          100: 'var(--grove-100, #83E001)',
          200: 'var(--grove-200, #5DBFA0)',
          300: 'var(--grove-300, #1D9E75)',
          500: 'var(--grove-500, #0F6E56)',
          700: 'var(--grove-700, #085041)',
          900: 'var(--grove-900, #0A2E24)',
          950: 'var(--grove-950, #061A15)',
        },
        
        // Semantic Surfaces & Status Colors
        layout: {
          page: '#F7F8F7',
          card: '#FFFFFF',
        },
        status: {
          review: { bg: '#FEF3E2', text: '#92500A' },
          progress: { bg: '#EEF2FF', text: '#3730A3' },
          closed: { bg: '#F3F4F3', text: '#4A544A' },
        }
      },
      fontFamily: {
        sans: ['DM Sans', 'Inter', 'sans-serif'],
      },
      boxShadow: {
        // Custom soft shadows for the floating, borderless look
        'soft': '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.03)',
      },
      keyframes: {
        shimmer: {
          '0%':   { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },
      },
      animation: {
        shimmer: 'shimmer 1.8s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
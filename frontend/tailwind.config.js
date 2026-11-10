// Keep tenant accents independent from the neutral light/dark palette.
const token = (name) => ({ opacityValue }) => opacityValue === undefined
  ? `var(--${name})`
  : `color-mix(in srgb, var(--${name}) calc(${opacityValue} * 100%), transparent)`
const neutral = Object.fromEntries([50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950].map(n => [n, token(`neutral-${n}`)]))

export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: token('primary'), 'primary-dark': token('primary-dark'),
        'primary-light': token('primary-light'), 'primary-ink': token('primary-text'),
        'on-primary': token('on-primary'), sidebar: token('sidebar'),
        surface: token('surface'), border: token('border'),
        'text-main': token('text-main'), 'text-sub': token('text-sub'), 'text-dim': token('text-dim'),
        layout: { page: token('page'), card: token('card') },
        grove: Object.fromEntries([50, 100, 200, 300, 500, 700, 900, 950].map(n => [n, token(`grove-${n}`)])),
        status: Object.fromEntries(['review', 'progress', 'closed', 'danger', 'success'].map(name => [name, { bg: token(`${name}-bg`), text: token(`${name}-text`) }])),
        gray: neutral, slate: neutral, zinc: neutral, neutral,
      },
      fontFamily: { sans: ['DM Sans Variable', 'DM Sans', 'sans-serif'] },
      boxShadow: { soft: 'var(--shadow-soft)', glass: 'var(--shadow-soft)' },
      keyframes: { shimmer: { '0%': { backgroundPosition: '200% 0' }, '100%': { backgroundPosition: '-200% 0' } } },
      animation: { shimmer: 'shimmer 1.8s ease-in-out infinite' },
    },
  },
  plugins: [],
}

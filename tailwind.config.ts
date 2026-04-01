import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{js,ts,jsx,tsx}', './lib/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      boxShadow: {
        glow: '0 24px 80px rgba(0, 128, 192, 0.18), 0 0 0 1px rgba(34, 217, 255, 0.14)',
        card: '0 18px 42px rgba(0, 0, 0, 0.34)',
      },
      colors: {
        brand: {
          blue: '#0080c0',
          sky: '#30b0e0',
          cyan: '#22d9ff',
          graphite: '#64676b',
          slate: '#93979c',
          cloud: '#f0f2f3',
        },
        surface: {
          DEFAULT: '#030b17',
          panel: '#101a2a',
          soft: '#1a2534',
        },
      },
      backgroundImage: {
        'hero-glow':
          'radial-gradient(circle at top, rgba(34, 217, 255, 0.18), transparent 44%), radial-gradient(circle at right, rgba(0, 128, 192, 0.14), transparent 34%)',
        'section-stripe':
          'linear-gradient(90deg, rgba(0,128,192,0.12) 0%, transparent 30%, transparent 70%, rgba(34,217,255,0.1) 100%)',
      },
      fontFamily: {
        sans: ['var(--font-body)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        heading: ['var(--font-heading)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;

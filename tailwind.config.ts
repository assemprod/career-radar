import type { Config } from 'tailwindcss';
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#152332', muted: '#687c8a', teal: '#0e887c', mist: '#f4f8f8', line: '#e2eaea',
      },
      boxShadow: {
        card: '0 18px 65px rgba(27,49,55,.045)',
      },
    },
  },
  plugins: [],
};
export default config;

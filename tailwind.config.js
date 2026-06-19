/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  darkMode: 'media',
  theme: {
    extend: {
      colors: {
        status: {
          active: '#22C55E',
          soon: '#EAB308',
          expiring: '#F97316',
          expired: '#EF4444',
          none: '#6B7280',
        },
      },
    },
  },
  plugins: [],
};

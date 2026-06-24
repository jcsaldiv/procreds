/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  darkMode: 'media',
  theme: {
    extend: {
      colors: {
        status: {
          active: '#15803D',
          soon: '#B45309',
          expiring: '#C2410C',
          expired: '#B91C1C',
          none: '#374151',
        },
      },
      fontSize: {
        'heading': ['24px', { lineHeight: '32px', letterSpacing: '-0.3px' }],
        'subheading': ['20px', { lineHeight: '28px', letterSpacing: '-0.2px' }],
      },
    },
  },
  plugins: [],
};

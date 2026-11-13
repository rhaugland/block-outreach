/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        dark: {
          bg: '#0E0B16',
          card: '#221D30',
          elevated: '#2C2640',
        },
        purple: {
          DEFAULT: '#9B6DFF',
          soft: 'rgba(155, 109, 255, 0.10)',
          glow: 'rgba(155, 109, 255, 0.35)',
          muted: '#7A5AC9',
          lavender: '#C4A8FF',
        },
        text: {
          primary: '#E8E4F0',
          soft: '#9A93A8',
          dim: '#6B6580',
        },
      },
      fontFamily: {
        display: ['Bricolage Grotesque', 'sans-serif'],
        body: ['Instrument Sans', 'system-ui', 'sans-serif'],
      },
      borderColor: {
        rule: 'rgba(155, 109, 255, 0.15)',
      },
    },
  },
  plugins: [],
}

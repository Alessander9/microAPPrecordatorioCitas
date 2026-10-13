/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        navy: {
          50: '#F0F4F8',
          100: '#D9E2EC',
          200: '#BCCCDC',
          300: '#9FB3C8',
          400: '#627D98',
          500: '#334E68',
          600: '#1E3E6B',
          700: '#142C4E',
          800: '#0B1F3A', // Primary Navy
          900: '#061224',
          950: '#030914',
        },
        gold: {
          50: '#FDFBF7',
          100: '#FAF4E8',
          200: '#F2E4C4',
          300: '#E9D29F',
          400: '#DFC06B',
          500: '#C9A24B', // Accent Gold
          600: '#A88234',
          700: '#876525',
          800: '#664B1A',
          900: '#4D3712',
        },
      },
      fontFamily: {
        sans: [
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'Helvetica',
          'Arial',
          'sans-serif',
        ],
      },
    },
  },
  plugins: [],
}

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        rounded: ['"M PLUS Rounded 1c"', '"Hiragino Maru Gothic ProN"', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

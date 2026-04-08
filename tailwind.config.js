/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f5ff',
          100: '#d6e4ff',
          200: '#adc6ff',
          300: '#85b5ff',
          400: '#597ef7',
          500: '#2f54eb',
          600: '#1d39c4',
          700: '#10239e',
          800: '#061178',
          900: '#030852',
        },
      },
    },
  },
  plugins: [],
  // 避免与 Ant Design 冲突
  corePlugins: {
    preflight: false,
  },
}

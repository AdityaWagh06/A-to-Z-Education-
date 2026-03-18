/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#5A4BDA',
        accent: '#22C55E',
        highlight: '#F59E0B',
        background: '#F8FAFC',
      },
      borderRadius: {
        'card': '16px',
      }
    },
  },
  plugins: [],
}

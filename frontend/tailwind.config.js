/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#FF6A00',
        'primary-light': '#FFE5D6',
        'primary-hover': '#FF8533',
      },
    },
  },
  plugins: [],
}

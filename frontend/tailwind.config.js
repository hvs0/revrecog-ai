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
          50: '#EBF0F9',
          100: '#D6E1F3',
          200: '#ADC3E7',
          300: '#85A5DB',
          400: '#5C87CF',
          500: '#3369C3',
          600: '#29549C',
          700: '#1F3F75',
          800: '#1F3864',
          900: '#142A4E',
          950: '#0A1527',
        },
        accent: {
          50: '#FFF8E1',
          100: '#FFECB3',
          200: '#FFE082',
          300: '#FFD54F',
          400: '#FFCA28',
          500: '#FFC107',
          600: '#FFB300',
          700: '#FFA000',
          800: '#FF8F00',
          900: '#FF6F00',
        },
      },
    },
  },
  plugins: [],
};

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx}', './components/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          blue: '#1e88e5',
          ink: '#14325f',
          yellow: '#ffc93c',
          pink: '#ff7eb6',
          soft: '#f0f7ff',
          line: '#d6e6f8',
        },
      },
      fontFamily: {
        display: ['"Baloo Bhaijaan 2"', 'Tajawal', 'sans-serif'],
        body: ['Tajawal', 'Tahoma', 'sans-serif'],
      },
      borderRadius: { xl2: '18px' },
    },
  },
  plugins: [],
};

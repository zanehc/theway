import type { Config } from "tailwindcss";

export default {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./app/**/*.{client,server}.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // 교회 카페 테마 색상
        'wine': {
          50: '#fdf2f2',
          100: '#fde8e8',
          200: '#fbd5d5',
          300: '#f8b4b4',
          400: '#f98080',
          500: '#f05252',
          600: '#e02424',
          700: '#c81e1e',
          800: '#9b1c1c',
          900: '#771d1d',
        },
        'ivory': {
          50: '#fefefe',
          100: '#fefefe',
          200: '#fdfcfb',
          300: '#fbf9f6',
          400: '#f7f3ed',
          500: '#f2ede4',
          600: '#e8dfd2',
          700: '#d4c5b3',
          800: '#b8a593',
          900: '#9a8a7a',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 2px 15px -3px rgba(0, 0, 0, 0.07), 0 10px 20px -2px rgba(0, 0, 0, 0.04)',
        'medium': '0 4px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
      },
      borderRadius: {
        'xl': '1rem',
        '2xl': '1.5rem',
      }
    },
  },
  plugins: [],
} satisfies Config;

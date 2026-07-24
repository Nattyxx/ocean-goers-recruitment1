/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'Poppins', 'system-ui', 'sans-serif'],
        display: ['Poppins', 'Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        ocean: {
          50: '#f0f7fb',
          100: '#d9ebf5',
          200: '#b3d7ec',
          300: '#7ab8de',
          400: '#4193c9',
          500: '#1a6ba0',
          600: '#0f4c75',
          700: '#0a3a5c',
          800: '#0a2a4a',
          900: '#06203c',
          950: '#03142a',
        },
        gold: {
          50: '#fefce8',
          100: '#fef9c3',
          200: '#fef08a',
          300: '#fde047',
          400: '#facc15',
          500: '#eab308',
          600: '#ca8a04',
          700: '#a16207',
          800: '#854d0e',
          900: '#713f12',
        },
      },
      boxShadow: {
        glass: '0 8px 32px rgba(10, 42, 74, 0.12)',
        'glass-lg': '0 20px 60px rgba(10, 42, 74, 0.18)',
        gold: '0 4px 20px rgba(250, 204, 21, 0.35)',
      },
      backdropBlur: {
        xs: '2px',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in-fast': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(40px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-12px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition: '1000px 0' },
        },
        'wave': {
          '0%': { transform: 'translateX(0) translateZ(0) scaleY(1)' },
          '50%': { transform: 'translateX(-25%) translateZ(0) scaleY(0.55)' },
          '100%': { transform: 'translateX(-50%) translateZ(0) scaleY(1)' },
        },
        'count-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.6s ease-out forwards',
        'fade-in-fast': 'fade-in-fast 0.3s ease-out forwards',
        'slide-up': 'slide-up 0.7s ease-out forwards',
        'scale-in': 'scale-in 0.3s ease-out forwards',
        float: 'float 6s ease-in-out infinite',
        shimmer: 'shimmer 2s linear infinite',
        wave: 'wave 8s ease-in-out infinite',
        'count-up': 'count-up 0.5s ease-out forwards',
      },
    },
  },
  plugins: [],
};

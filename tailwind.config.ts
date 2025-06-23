import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        'abco-navy': '#081827',
        'electric-blue': '#149DEA',
        'electric-glow': '#1EB8FF',
        'deep-navy': '#0A1E33',
        'dark-bg': '#020B18',
        'surface-elevated': '#11263F',
        'border-subtle': '#1B4674',
        'text-primary': '#F0F6FC',
        'text-secondary': '#A0B4CC',
      },
      fontFamily: {
        'poppins': ['Poppins', 'sans-serif'],
        'inter': ['Inter', 'sans-serif'],
        'montserrat': ['Montserrat', 'sans-serif'],
      },
      animation: {
        'fade-in-up': 'fadeInUp 0.6s ease-out',
        'pulse-effect': 'pulseEffect 8s infinite alternate',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
};

export default config; 
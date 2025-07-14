import type { Config } from "tailwindcss";
import typography from '@tailwindcss/typography';
import tailwindcssAnimate from 'tailwindcss-animate';

const config: Config = {
    darkMode: ["class"],
    content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  safelist: [
    // Ensure these dynamic classes survive purge
    'bg-electric-blue/20',
    'text-electric-blue',
    'ring-electric-blue/30',
    'bg-red-600/20',
    'text-red-600',
    'ring-red-600/30',
    'text-red-500',
    'animate-ping',
    'animate-pulse',
    'animate-fade-in-up',
    // Resizable sidebar animations
    'sidebar-mobile-enter',
    'sidebar-mobile-exit',
    'slideInLeft',
    'slideOutLeft',
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
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			}
  		},
  		fontFamily: {
  			poppins: [
  				'Poppins',
  				'sans-serif'
  			],
  			inter: [
  				'Inter',
  				'sans-serif'
  			],
  			montserrat: [
  				'Montserrat',
  				'sans-serif'
  			]
  		},
  		animation: {
  			'fade-in-up': 'fadeInUp 0.6s ease-out',
  			'pulse-effect': 'pulseEffect 8s infinite alternate'
  		},
  		backgroundImage: {
  			'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
  			'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))'
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		}
  	}
  },
  plugins: [typography, tailwindcssAnimate],
};

export default config; 
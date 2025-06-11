import type { Config } from "tailwindcss";

export default {
    darkMode: ["class"],
    content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    screens: {
      'xs': '475px',
      // Other breakpoints are automatically included from Tailwind defaults
    },
  	extend: {
  		colors: {
  			background: 'var(--background)',
  			foreground: 'var(--foreground)'
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0) rotate(0deg)' },
          '25%': { transform: 'translateY(-10px) rotate(1deg)' },
          '50%': { transform: 'translateY(0) rotate(0deg)' },
          '75%': { transform: 'translateY(10px) rotate(-1deg)' },
        },
        pulse: {
          '0%, 100%': { opacity: '0.2' },
          '50%': { opacity: '0.3' },
        },
        'glow-pulse': {
          '0%, 100%': { 
            opacity: '0.5',
            boxShadow: '0 0 2px #38bdf8, 0 0 6px #38bdf8',
            transform: 'scale(0.98)'
          },
          '50%': { 
            opacity: '0.7',
            boxShadow: '0 0 2px #38bdf8, 0 0 10px #38bdf8',
            transform: 'scale(1.02)'
          }
        }
      },
      animation: {
        float: 'float 8s ease-in-out infinite',
        pulse: 'pulse 4s ease-in-out infinite',
        'glow-pulse': 'glow-pulse 3s ease-in-out infinite'
      },
      backgroundImage: {
        'stars': 'radial-gradient(1px 1px at 25px 5px, rgba(255, 255, 255, 0.15), rgba(0, 0, 0, 0)), radial-gradient(1px 1px at 50px 25px, rgba(255, 255, 255, 0.1), rgba(0, 0, 0, 0)), radial-gradient(1px 1px at 125px 20px, rgba(255, 255, 255, 0.15), rgba(0, 0, 0, 0)), radial-gradient(1.5px 1.5px at 50px 75px, rgba(255, 255, 255, 0.15), rgba(0, 0, 0, 0)), radial-gradient(2px 2px at 15px 125px, rgba(255, 255, 255, 0.1), rgba(0, 0, 0, 0)), radial-gradient(2.5px 2.5px at 100px 150px, rgba(255, 255, 255, 0.15), rgba(0, 0, 0, 0))',
      },
  	}
  },
  plugins: [
    require("tailwindcss-animate"), 
    require('tailwind-scrollbar'),
    function({ addUtilities }: any) {
      const newUtilities = {
        '.touch-callout-none': {
          '-webkit-touch-callout': 'none',
        },
      }
      addUtilities(newUtilities)
    }
  ],
} satisfies Config;

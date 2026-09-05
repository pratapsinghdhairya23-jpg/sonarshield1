/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        abyss: {
          950: '#050b14',
          900: '#0a1220',
          800: '#0f1c2e',
          700: '#152840',
          600: '#1c3450',
        },
        cyan: {
          glow: '#22e5e0',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
        sans: ['Inter', 'ui-sans-serif', 'system-ui'],
      },
      boxShadow: {
        glow: '0 0 20px rgba(34, 229, 224, 0.25)',
      },
      backgroundImage: {
        'sonar-grid': 'linear-gradient(rgba(34,229,224,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(34,229,224,0.06) 1px, transparent 1px)',
      },
    },
  },
  plugins: [],
}

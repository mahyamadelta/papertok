import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#0a0a0f",
        surface: "#111118",
        card: "#16161f",
        border: "#2a2a3a",
        "neon-pink": "#ff2d78",
        "neon-purple": "#a855f7",
        "neon-blue": "#3b82f6",
        "accent-pink": "#ff2d78",
        "accent-purple": "#c026d3",
        "text-primary": "#f0f0f8",
        "text-secondary": "#8b8ba8",
        "text-muted": "#5a5a7a",
      },
      fontFamily: {
        sans: ["-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
      },
      backgroundImage: {
        "gradient-neon":
          "linear-gradient(135deg, #ff2d78 0%, #a855f7 50%, #3b82f6 100%)",
        "gradient-card":
          "linear-gradient(180deg, rgba(10,10,15,0) 0%, rgba(10,10,15,0.95) 70%)",
        "gradient-fun-fact":
          "linear-gradient(135deg, #7c3aed 0%, #a21caf 100%)",
      },
      animation: {
        "pulse-neon": "pulse-neon 2s ease-in-out infinite",
        "slide-up": "slide-up 0.3s ease-out",
        "fade-in": "fade-in 0.4s ease-out",
      },
      keyframes: {
        "pulse-neon": {
          "0%, 100%": { boxShadow: "0 0 8px #ff2d78, 0 0 20px #ff2d78" },
          "50%": { boxShadow: "0 0 16px #ff2d78, 0 0 40px #ff2d78" },
        },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(20px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};

export default config;

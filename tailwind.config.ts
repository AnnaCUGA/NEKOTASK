import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        noche: {
          DEFAULT: "#121212",
          900: "#0d0c12",
          800: "#17161e",
          700: "#1e1c27",
          600: "#2a2736",
          500: "#3a3649",
        },
        violeta: { DEFAULT: "#a78bfa", fuerte: "#8b5cf6", suave: "#c4b5fd" },
        rosa: { DEFAULT: "#f472b6", fuerte: "#ec4899", suave: "#f9a8d4" },
        cian: { DEFAULT: "#67e8f9", suave: "#a5f3fc" },
        croqueta: "#e8a85b",
        tinta: "#2b2233",
      },
      fontFamily: {
        titulo: ["var(--font-titulo)", "system-ui", "sans-serif"],
        cuerpo: ["var(--font-cuerpo)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        neon: "0 0 0 1px rgba(167,139,250,.35), 0 0 24px -6px rgba(167,139,250,.45)",
        "neon-rosa": "0 0 0 1px rgba(244,114,182,.35), 0 0 24px -6px rgba(244,114,182,.45)",
      },
      keyframes: {
        meneo: {
          "0%,100%": { transform: "rotate(0deg)" },
          "25%": { transform: "rotate(-10deg)" },
          "75%": { transform: "rotate(10deg)" },
        },
      },
      animation: { meneo: "meneo .5s ease-in-out" },
    },
  },
  plugins: [],
};

export default config;

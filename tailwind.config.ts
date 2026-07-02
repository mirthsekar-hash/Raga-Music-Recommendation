import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        spotify: {
          black: "#000000",
          base: "#121212",
          surface: "#181818",
          highlight: "#282828",
          green: "#1DB954",
          "green-hover": "#1ed760",
          subtext: "#b3b3b3",
          "subtext-dim": "#a7a7a7",
        },
        raga: {
          green: "#1DB954",
          "green-hover": "#1ed760",
          dark: "#121212",
          surface: "#181818",
          elevated: "#282828",
          muted: "#b3b3b3",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      fontSize: {
        display: ["3.5rem", { lineHeight: "1.05", letterSpacing: "-0.03em" }],
        headline: ["2rem", { lineHeight: "1.2", letterSpacing: "-0.02em" }],
      },
      boxShadow: {
        glow: "0 0 40px rgba(29, 185, 84, 0.15)",
        card: "0 8px 24px rgba(0, 0, 0, 0.5)",
      },
      backgroundImage: {
        "hero-spotify":
          "linear-gradient(180deg, #1a3d2e 0%, #121212 45%, #000000 100%)",
      },
    },
  },
  plugins: [],
};

export default config;

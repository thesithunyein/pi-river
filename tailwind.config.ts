import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        river: {
          bg: "#070A12",
          bg1: "#0D1220",
          bg2: "#131B2E",
          bg3: "#1A2540",
          line: "rgba(120,140,180,0.12)",
          cyan: "#22D3EE",
          magenta: "#EC4899",
          violet: "#8B5CF6",
          green: "#34D399",
          red: "#F87171",
          gold: "#FBBF24",
          white: "#F1F5F9",
          grey: "#7B8BA0",
          felt: "#0A3428",
          feltGlow: "#14503C",
        },
      },
      fontFamily: {
        display: ["Fredoka", "Nunito", "sans-serif"],
        body: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;

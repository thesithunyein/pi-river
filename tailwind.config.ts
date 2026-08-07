import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        mi: {
          bg: "rgb(var(--mi-bg) / <alpha-value>)",
          bg2: "rgb(var(--mi-bg-2) / <alpha-value>)",
          surface: "rgb(var(--mi-surface) / <alpha-value>)",
          line: "rgb(var(--mi-line) / <alpha-value>)",
          purple: "rgb(var(--mi-purple) / <alpha-value>)",
          orange: "rgb(var(--mi-orange) / <alpha-value>)",
          gold: "rgb(var(--mi-gold) / <alpha-value>)",
          blue: "rgb(var(--mi-blue) / <alpha-value>)",
          muted: "rgb(var(--mi-muted) / <alpha-value>)",
          text: "rgb(var(--mi-text) / <alpha-value>)",
          success: "rgb(var(--mi-success) / <alpha-value>)",
          danger: "rgb(var(--mi-danger) / <alpha-value>)",
          felt: "rgb(var(--mi-felt) / <alpha-value>)",
          feltEdge: "rgb(var(--mi-felt-edge) / <alpha-value>)",
        },
        river: {
          bg: "rgb(var(--mi-bg) / <alpha-value>)",
          bg1: "rgb(var(--mi-bg-2) / <alpha-value>)",
          bg2: "rgb(var(--mi-surface) / <alpha-value>)",
          bg3: "rgb(35 31 55 / <alpha-value>)",
          line: "rgb(var(--mi-line) / <alpha-value>)",
          cyan: "rgb(var(--mi-blue) / <alpha-value>)",
          magenta: "rgb(var(--mi-orange) / <alpha-value>)",
          violet: "rgb(var(--mi-purple) / <alpha-value>)",
          green: "rgb(var(--mi-success) / <alpha-value>)",
          red: "rgb(var(--mi-danger) / <alpha-value>)",
          gold: "rgb(var(--mi-gold) / <alpha-value>)",
          white: "rgb(var(--mi-text) / <alpha-value>)",
          grey: "rgb(var(--mi-muted) / <alpha-value>)",
          felt: "rgb(var(--mi-felt) / <alpha-value>)",
          feltGlow: "rgb(var(--mi-felt-edge) / <alpha-value>)",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "var(--font-sans)", "system-ui", "sans-serif"],
        body: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      backgroundImage: {
        "mi-shell":
          "radial-gradient(circle at top, rgb(var(--mi-purple) / 0.18), transparent 36%), radial-gradient(circle at bottom right, rgb(var(--mi-orange) / 0.14), transparent 28%), linear-gradient(180deg, rgb(var(--mi-bg-2)), rgb(var(--mi-bg)))",
        "mi-cta":
          "linear-gradient(135deg, rgb(var(--mi-purple)), rgb(var(--mi-orange)) 56%, rgb(var(--mi-gold)))",
      },
      boxShadow: {
        "mi-panel":
          "inset 0 1px 0 rgba(255,255,255,0.08), 0 24px 64px rgba(0,0,0,0.35)",
        "mi-glow":
          "0 18px 42px rgba(123,92,255,0.18), 0 6px 18px rgba(255,138,61,0.14)",
      },
    },
  },
  plugins: [],
};

export default config;

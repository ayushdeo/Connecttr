// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      colors: {
        // All backed by CSS variables — automatically flip between light & dark.
        // Opacity modifiers (e.g. bg-ink/50) work because values are raw RGB triplets.
        "royal-amethyst": "rgb(var(--primary) / <alpha-value>)",
        "midnight-plum":  "rgb(var(--surface-2) / <alpha-value>)",
        "soft-violet":    "rgb(var(--muted) / <alpha-value>)",
        "lilac-mist":     "rgb(var(--lilac) / <alpha-value>)",
        "ink":            "rgb(var(--bg) / <alpha-value>)",
        "slate":          "rgb(var(--surface) / <alpha-value>)",
        "mist":           "rgb(var(--fg) / <alpha-value>)",
        // "overlay" replaces bare `white` in border-white/N and hover:bg-white/N.
        // Dark mode → white overlays. Light mode → muted purple overlays.
        "overlay":        "rgb(var(--overlay) / <alpha-value>)",
      },
      boxShadow: {
        "glow-sm":  "0 0 12px rgb(var(--primary) / 0.25)",
        "glow":     "0 0 24px rgb(var(--primary) / 0.30)",
        "glow-lg":  "0 0 40px rgb(var(--primary) / 0.35)",
      },
    },
  },
  plugins: [],
};

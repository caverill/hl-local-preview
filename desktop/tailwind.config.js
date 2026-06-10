import daisyui from "daisyui";

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"DM Sans"', "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "monospace"],
      },
      letterSpacing: {
        label: "0.12em",
      },
      boxShadow: {
        glass: "0 8px 32px rgba(0, 0, 0, 0.24)",
      },
    },
  },
  plugins: [daisyui],
  daisyui: {
    themes: ["light"],
  },
};

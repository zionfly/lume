/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        lume: {
          50: "#fef9ef",
          100: "#fdf0d5",
          200: "#fbe0ab",
          300: "#f8c76f",
          400: "#f5a623",
          500: "#e8940d",
          600: "#c97508",
          700: "#a7570b",
          800: "#884510",
          900: "#703a10",
        },
        // Claude-inspired warm palette
        surface: {
          0: "#f5f0e8",   // warm cream background
          1: "#ebe5d9",   // sidebar
          2: "#e0d9cb",   // card / input bg
          3: "#d4ccbc",   // border
          4: "#c5bca9",   // strong border
        },
        // Dark mode surfaces (for future toggle)
        "surface-dark": {
          0: "#2f2b26",
          1: "#3a3530",
          2: "#46413a",
          3: "#524c44",
          4: "#5e574e",
        },
        sand: {
          50: "#fdfcfa",
          100: "#f9f6f0",
          200: "#f0ebe0",
          300: "#e0d8c8",
          400: "#c8bda8",
          500: "#a89880",
          600: "#8a7a64",
          700: "#6e604c",
          800: "#564a3a",
          900: "#3e362a",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "sans-serif",
        ],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
    },
  },
  plugins: [],
};

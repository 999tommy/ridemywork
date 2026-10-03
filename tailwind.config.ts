import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#07120f",
        forest: "#0d3028",
        palm: "#138a61",
        mint: "#c9f7de",
        sun: "#f4bd4b",
        cream: "#f6f5ee",
        mist: "#e8eee8",
        graphite: "#65736d"
      },
      boxShadow: {
        soft: "0 24px 80px rgba(7, 18, 15, 0.16)",
        glow: "0 28px 90px rgba(19, 138, 97, 0.28)",
        "glow-sun": "0 28px 90px rgba(244, 189, 75, 0.22)"
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))"
      }
    }
  },
  plugins: []
};

export default config;

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
        ink: "#071a2e",
        mist: "#f4f7fb",
        field: "#e6edf5",
        forest: "#06233f",
        moss: "#c6d4e4",
        copper: "#ff5a00",
        cream: "#ffffff",
      },
      boxShadow: {
        soft: "0 18px 45px rgba(7, 26, 46, 0.1)",
        panel: "0 16px 35px rgba(7, 26, 46, 0.08)",
      },
    },
  },
  plugins: [],
};

export default config;

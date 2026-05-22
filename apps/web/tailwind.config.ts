import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/lib/**/*.{ts,tsx}",
    "./tests/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: "#071D49",
        orange: "#FF7A1A",
        lightgray: "#F3F4F6",
        darkblue: "#0F2345",
        white: "#FFFFFF",
      },
    },
  },
};

export default config;

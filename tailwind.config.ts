import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "liquid-abyss": "#012624",
        "liquid-deep": "#011d1c",
        "liquid-kelp": "#003734",
        "liquid-mist": "#edfffe",
        platinum: "#ffffff",
        "silver-mist": "#bbc7c6",
        ash: "#f2f2f2",
        "slate-deep": "#707777",
        "lavender-phosphor": "#fde9ff",
        "bioluminescent-teal": "#00827c",
        "aurora-aqua": "#cbfffc",
      },
      fontFamily: {
        matter: [
          "'Satoshi'",
          "'Plus Jakarta Sans'",
          "-apple-system",
          "BlinkMacSystemFont",
          "sans-serif",
        ],
        mono: [
          "'JetBrains Mono'",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "monospace",
        ],
      },
      borderRadius: {
        card: "16px",
        small: "6px",
        btn: "6px",
      },
      backgroundImage: {
        "aurora-gradient":
          "linear-gradient(90deg, rgb(203, 255, 252) 0%, rgb(237, 255, 254) 26.25%, rgb(255, 253, 250) 47.57%, rgb(250, 209, 255) 88.96%)",
        "bioluminescent-gradient":
          "linear-gradient(90deg, rgb(0, 130, 124) 0%, rgb(203, 255, 252) 100%)",
      },
    },
  },
  plugins: [],
} satisfies Config;

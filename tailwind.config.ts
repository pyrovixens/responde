import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        dispatch: {
          950: "#070A0F",
          900: "#0B0F17",
          850: "#101622",
          800: "#161F2E",
          700: "#222F44",
          600: "#32435E",
          500: "#4B6082",
          400: "#748AA8",
          300: "#A3B4CB",
          200: "#CFD9E6",
          100: "#EAF0F6",
          50: "#F5F8FA",
        },
        emergency: {
          50: "#FEF2F2",
          100: "#FEE2E2",
          500: "#EF4444",
          600: "#DC2626",
          700: "#B91C1C",
          800: "#991B1B",
          900: "#7F1D1D",
          950: "#450A0A",
        },
        warning: {
          50: "#FFFBEB",
          100: "#FEF3C7",
          500: "#F59E0B",
          600: "#D97706",
          700: "#B45309",
          800: "#92400E",
          900: "#78350F",
        },
        success: {
          50: "#ECFDF5",
          100: "#D1FAE5",
          500: "#10B981",
          600: "#059669",
          700: "#047857",
          800: "#065F46",
          900: "#064E3B",
        },
        tactical: {
          blue: "#2563EB",
          cyan: "#0891B2",
          amber: "#D97706",
          red: "#DC2626",
          green: "#059669",
          purple: "#7C3AED",
        }
      },
      fontFamily: {
        mono: [
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Monaco",
          "Consolas",
          "Liberation Mono",
          "Courier New",
          "monospace",
        ],
      },
      keyframes: {
        pulseFast: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.3" },
        },
        alertFlash: {
          "0%, 100%": { backgroundColor: "rgba(220, 38, 38, 0.2)" },
          "50%": { backgroundColor: "rgba(220, 38, 38, 0.6)" },
        },
      },
      animation: {
        "pulse-fast": "pulseFast 1s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "alert-flash": "alertFlash 1.2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
} satisfies Config;

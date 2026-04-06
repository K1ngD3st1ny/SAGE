/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        mac: {
          bg: "#ececec",
          wall: "#f6f6f6",
          surface: "#ffffff",
          sidebar: "#f2f2f7",
          border: "#d1d1d6",
          divider: "#e5e5ea",
          text: "#1d1d1f",
          secondary: "#6e6e73",
          tertiary: "#aeaeb2",
          hover: "#e8e8ed",
        },
        tl: { red: "#ff5f57", yellow: "#febc2e", green: "#28c840" },
        apple: {
          blue: "#007aff",
          orange: "#ff9500",
          green: "#34c759",
          purple: "#af52de",
          pink: "#ff2d55",
          teal: "#5ac8fa",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "system-ui",
          "sans-serif",
        ],
        mono: ["JetBrains Mono", "SF Mono", "Menlo", "monospace"],
      },
      borderRadius: {
        window: "12px",
      },
      boxShadow: {
        window:
          "0 22px 70px rgba(0,0,0,0.15), 0 8px 28px rgba(0,0,0,0.08), 0 0 0 0.5px rgba(0,0,0,0.06)",
        card: "0 0.5px 1px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.06)",
        "card-hover": "0 3px 12px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.05)",
        "card-active":
          "0 8px 28px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)",
        inset: "inset 0 1px 4px rgba(0,0,0,0.08)",
        ring: "0 0 0 3px rgba(0,122,255,0.3)",
      },
      animation: {
        "fade-in": "fadeIn 0.4s cubic-bezier(0.16,1,0.3,1)",
        "slide-up": "slideUp 0.4s cubic-bezier(0.16,1,0.3,1)",
        "slide-in-left": "slideInLeft 0.35s cubic-bezier(0.16,1,0.3,1)",
        "scale-in": "scaleIn 0.3s cubic-bezier(0.16,1,0.3,1)",
        "pulse-dot": "pulseDot 2s ease-in-out infinite",
        "pulse-ring": "pulseRing 2s cubic-bezier(0.4,0,0.6,1) infinite",
        shimmer: "shimmer 2s linear infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideInLeft: {
          "0%": { opacity: "0", transform: "translateX(-12px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        pulseDot: {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.5", transform: "scale(1.5)" },
        },
        pulseRing: {
          "0%": { transform: "scale(1)", opacity: "0.8" },
          "50%": { transform: "scale(1.05)", opacity: "0.4" },
          "100%": { transform: "scale(1)", opacity: "0.8" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
    },
  },
  plugins: [],
};

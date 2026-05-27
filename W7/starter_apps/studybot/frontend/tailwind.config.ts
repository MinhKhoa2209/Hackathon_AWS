import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Brand primaries
        violet: {
          50:  "#f5f3ff",
          100: "#ede9fe",
          200: "#ddd6fe",
          300: "#c4b5fd",
          400: "#a78bfa",
          500: "#8b5cf6",
          600: "#7c3aed",
          700: "#6d28d9",
          800: "#5b21b6",
          900: "#4c1d95",
        },
        // Cyan accent for AI actions
        cyan: {
          50:  "#ecfeff",
          100: "#cffafe",
          200: "#a5f3fc",
          300: "#67e8f9",
          400: "#22d3ee",
          500: "#06b6d4",
          600: "#0891b2",
          700: "#0e7490",
        },
        // Dark surfaces
        deep: {
          DEFAULT: "#0b0f1a",
          50:  "#f0f4ff",
          100: "#e1e8ff",
          200: "#c3d1ff",
          300: "#98a8d4",
          400: "#6b7a99",
          500: "#4a5568",
          600: "#2d3748",
          700: "#1a2035",
          800: "#131929",
          900: "#0b0f1a",
          950: "#060a12",
        },
        // Light mode surfaces
        surface: {
          DEFAULT: "#ffffff",
          50:  "#f8faff",
          100: "#f0f4ff",
          200: "#e5eaf5",
        },
        // Legacy alias for any remaining study-* classes
        study: {
          50:  "#f5f3ff",
          100: "#ede9fe",
          500: "#8b5cf6",
          600: "#7c3aed",
          700: "#6d28d9",
        },
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["Fira Code", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      boxShadow: {
        soft:        "0 18px 45px -28px rgba(15, 23, 42, 0.45)",
        "glow-violet":"0 0 24px 0 rgba(124, 58, 237, 0.35)",
        "glow-cyan":  "0 0 24px 0 rgba(6, 182, 212, 0.35)",
        "glow-sm":    "0 0 12px 0 rgba(124, 58, 237, 0.25)",
        "card-dark":  "0 4px 24px 0 rgba(0,0,0,0.45), 0 1px 4px 0 rgba(0,0,0,0.3)",
        "card-light": "0 2px 16px 0 rgba(99,102,241,0.08), 0 1px 4px 0 rgba(0,0,0,0.06)",
        "lift":       "0 8px 32px -4px rgba(0,0,0,0.5)",
        inner:        "inset 0 1px 0 rgba(255,255,255,0.06)",
      },
      backgroundImage: {
        "gradient-violet": "linear-gradient(135deg, #7c3aed, #4f46e5)",
        "gradient-cyan":   "linear-gradient(135deg, #06b6d4, #0891b2)",
        "gradient-ai":     "linear-gradient(135deg, #7c3aed 0%, #06b6d4 100%)",
        "gradient-success":"linear-gradient(135deg, #10b981, #059669)",
        "gradient-error":  "linear-gradient(135deg, #ef4444, #dc2626)",
        "bg-dark":         "radial-gradient(ellipse 80% 60% at 50% 0%, #1a1040 0%, #0b0f1a 60%)",
        "bg-light":        "radial-gradient(ellipse 80% 60% at 50% 0%, #f0e8ff 0%, #f8faff 60%)",
        "glass-border":    "linear-gradient(135deg, rgba(255,255,255,0.15), rgba(255,255,255,0.03))",
      },
      borderRadius: {
        xl2: "1rem",
        xl3: "1.25rem",
      },
      keyframes: {
        // Floating animation for upload icon
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%":      { transform: "translateY(-8px)" },
        },
        // Shimmer loading skeleton
        shimmer: {
          "0%":   { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        // Slide up fade in for cards
        "slide-up": {
          "0%":   { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        // Slide in from right (toast)
        "slide-in-right": {
          "0%":   { opacity: "0", transform: "translateX(100%)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        // Slide out to right (toast dismiss)
        "slide-out-right": {
          "0%":   { opacity: "1", transform: "translateX(0)" },
          "100%": { opacity: "0", transform: "translateX(100%)" },
        },
        // Pulse dot for "connected" status
        "pulse-dot": {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%":      { opacity: "0.5", transform: "scale(0.8)" },
        },
        // Bounce scale for correct answer
        "bounce-in": {
          "0%":   { transform: "scale(0.7)", opacity: "0" },
          "60%":  { transform: "scale(1.1)" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        // Shake for wrong answer
        shake: {
          "0%, 100%": { transform: "translateX(0)" },
          "15%":      { transform: "translateX(-6px)" },
          "30%":      { transform: "translateX(6px)" },
          "45%":      { transform: "translateX(-4px)" },
          "60%":      { transform: "translateX(4px)" },
          "75%":      { transform: "translateX(-2px)" },
        },
        // Typing dots
        "dot-bounce": {
          "0%, 60%, 100%": { transform: "translateY(0)" },
          "30%":           { transform: "translateY(-6px)" },
        },
        // Progress bar fill
        "progress-fill": {
          "0%":   { width: "0%" },
          "100%": { width: "var(--progress-width, 100%)" },
        },
        // Spin for loading
        spin: {
          "0%":   { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        // Fade in
        "fade-in": {
          "0%":   { opacity: "0" },
          "100%": { opacity: "1" },
        },
        // Scale in (toast icon)
        "scale-in": {
          "0%":   { transform: "scale(0)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        // Rotating gradient border
        "rotate-gradient": {
          "0%":   { "--angle": "0deg" } as Record<string, string>,
          "100%": { "--angle": "360deg" } as Record<string, string>,
        },
        // Gradient text shimmer
        "text-shimmer": {
          "0%":   { backgroundPosition: "0% 50%" },
          "50%":  { backgroundPosition: "100% 50%" },
          "100%": { backgroundPosition: "0% 50%" },
        },
      },
      animation: {
        float:           "float 3s ease-in-out infinite",
        shimmer:         "shimmer 2s linear infinite",
        "slide-up":      "slide-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "slide-in-right":"slide-in-right 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "slide-out-right":"slide-out-right 0.3s cubic-bezier(0.7, 0, 0.84, 0) forwards",
        "pulse-dot":     "pulse-dot 2s ease-in-out infinite",
        "bounce-in":     "bounce-in 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        shake:           "shake 0.5s cubic-bezier(0.36, 0.07, 0.19, 0.97) forwards",
        "dot-bounce":    "dot-bounce 1.2s ease-in-out infinite",
        "progress-fill": "progress-fill 0.6s ease-out forwards",
        "fade-in":       "fade-in 0.3s ease-out forwards",
        "scale-in":      "scale-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "text-shimmer":  "text-shimmer 4s ease infinite",
        spin:            "spin 1s linear infinite",
      },
      transitionTimingFunction: {
        spring: "cubic-bezier(0.16, 1, 0.3, 1)",
      },
      transitionDuration: {
        250: "250ms",
        350: "350ms",
        400: "400ms",
      },
    },
  },
  plugins: [],
} satisfies Config;

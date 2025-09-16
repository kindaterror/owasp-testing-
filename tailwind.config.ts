import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./client/index.html", "./client/src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        chart: {
          "1": "hsl(var(--chart-1))",
          "2": "hsl(var(--chart-2))",
          "3": "hsl(var(--chart-3))",
          "4": "hsl(var(--chart-4))",
          "5": "hsl(var(--chart-5))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        // Ilaw ng Bayan Learning Institute Brand Colors
        ilaw: {
          gold: "#F4B400",           // Goldenrod Yellow
          navy: "#1A237E",           // Deep Navy Blue
          white: "#FDFDFD",          // Soft White
          gray: "#333333",           // Charcoal Gray
          amber: "#FFA000",          // Warm Amber
        },
        // Additional brand color variations
        brand: {
          primary: "#F4B400",        // Goldenrod Yellow
          secondary: "#1A237E",      // Deep Navy Blue
          accent: "#FFA000",         // Warm Amber
          light: "#FDFDFD",          // Soft White
          dark: "#333333",           // Charcoal Gray
          // Tonal variations
          gold: {
            50: "#FFFDE7",
            100: "#FFF9C4",
            200: "#FFF59D",
            300: "#FFF176",
            400: "#FFEE58",
            500: "#F4B400",           // Main Goldenrod
            600: "#FFD600",
            700: "#FFC107",
            800: "#FF8F00",
            900: "#FF6F00",
          },
          navy: {
            50: "#E8EAF6",
            100: "#C5CAE9",
            200: "#9FA8DA",
            300: "#7986CB",
            400: "#5C6BC0",
            500: "#1A237E",           // Main Navy
            600: "#3F51B5",
            700: "#303F9F",
            800: "#283593",
            900: "#1A237E",
          },
        },
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
        // Ilaw ng Bayan custom animations
        "torch-glow": {
          "0%, 100%": {
            boxShadow: "0 0 20px rgba(244, 180, 0, 0.5)",
          },
          "50%": {
            boxShadow: "0 0 30px rgba(244, 180, 0, 0.8)",
          },
        },
        "book-flip": {
          "0%": {
            transform: "rotateY(0deg)",
          },
          "100%": {
            transform: "rotateY(-180deg)",
          },
        },
        "shine": {
          "0%": {
            transform: "translateX(-100%)",
          },
          "100%": {
            transform: "translateX(100%)",
          },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        // Ilaw ng Bayan custom animations
        "torch-glow": "torch-glow 2s ease-in-out infinite",
        "book-flip": "book-flip 0.8s ease-in-out",
        "shine": "shine 2s ease-in-out infinite",
      },
      // Custom utilities for Ilaw ng Bayan
      fontFamily: {
        'ilaw': ['Inter', 'system-ui', 'sans-serif'],
        'heading': ['Merriweather', 'serif'],
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      },
      boxShadow: {
        'ilaw': '0 4px 14px 0 rgba(244, 180, 0, 0.25)',
        'navy': '0 4px 14px 0 rgba(26, 35, 126, 0.25)',
        'book': '0 10px 25px rgba(26, 35, 126, 0.15)',
      },
    },
  },
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
} satisfies Config;
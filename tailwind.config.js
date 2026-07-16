/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        atseen: {
          bg: "#06080B",
          "bg-2": "#0A0C0F",
          surface: "rgba(255,255,255,0.03)",
          "surface-2": "rgba(255,255,255,0.05)",
          line: "rgba(255,255,255,0.08)",
          text: "#F3F4F6",
          muted: "#9CA3AF",
          dim: "#6B7280",
          blue: "#8AB8FF",
          "blue-strong": "#5E9BFF",
          success: "#6ECF97",
          danger: "#F17878",
          warning: "#F0B764",
        },
        brand: {
          dark: "#06080B",
          primary: "#5E9BFF",
          secondary: "#8AB8FF",
          slate: "#0B0E13",
          mist: "#D8E4F7",
        },
      },
      boxShadow: {
        glow: "0 20px 60px rgba(94, 155, 255, 0.18)",
      },
      backgroundImage: {
        hero: "radial-gradient(circle at top, rgba(138, 184, 255, 0.18), transparent 38%), linear-gradient(135deg, #06080B 0%, #0A0C0F 55%, #101722 100%)",
      },
    },
  },
  plugins: [],
};

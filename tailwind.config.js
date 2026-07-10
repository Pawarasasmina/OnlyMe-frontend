/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          dark: "#09111f",
          primary: "#ff6b35",
          secondary: "#ffd166",
          slate: "#0f1b2d",
          mist: "#dce7f5",
        },
      },
      boxShadow: {
        glow: "0 20px 60px rgba(255, 107, 53, 0.25)",
      },
      backgroundImage: {
        hero: "radial-gradient(circle at top, rgba(255, 209, 102, 0.28), transparent 38%), linear-gradient(135deg, #09111f 0%, #0f1b2d 45%, #13243d 100%)",
      },
    },
  },
  plugins: [],
};

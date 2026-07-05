/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ksblack: "#0A0A0A",
        kswhite: "#F5F5F5",
        ksgold: "#C9A227",
        ksgoldlight: "#E4C766",
        ksgunmetal: "#2B2E33",
        ksline: "#3A3A3A",
      },
      fontFamily: {
        display: ["'Bebas Neue'", "'Anton'", "sans-serif"],
        body: ["'Inter'", "sans-serif"],
      },
      letterSpacing: {
        widest2: "0.25em",
      },
    },
  },
  plugins: [],
};

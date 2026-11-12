/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: { extend: { colors: {
    navy: "#172B3A", teal: "#287C78", ivory: "#F6F5F0",
    lavender: "#E9E5F5", amber: "#D5A66D"
  } } },
  plugins: []
};

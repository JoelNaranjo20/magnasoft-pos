/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
        "../shared/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: "class",
    theme: {
        extend: {
            colors: {
                "primary": "#0d7ff2",
                "background-light": "#f1f5f9", // slate-100
                "background-dark": "#0f172a",  // slate-900
                "surface-light": "#ffffff",
                "surface-dark": "#1e293b",     // slate-800
            },
            fontFamily: {
                "display": ["Inter", "sans-serif"]
            },
            borderRadius: {
                "DEFAULT": "0.25rem",
                "lg": "0.5rem",
                "xl": "0.75rem",
                "full": "9999px"
            },
        },
    },
    plugins: [],
}

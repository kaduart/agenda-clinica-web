/** @type {import('tailwindcss').Config} */
export default {
    content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
    theme: {
        extend: {
            // Identidade do ERP Fono Inova (mesmos tokens do redesign do ERP)
            colors: {
                fi: {
                    bg: "#f4f7f6",
                    surface: "#ffffff",
                    ink: "#1b2a26",
                    muted: "#5b6b66",
                    line: "#dde5e2",
                    accent: "#0f7a5c",
                    soft: "#e7f4ef",
                    deep: "#0a5a44",
                },
            },
            fontFamily: {
                head: ["Manrope", "system-ui", "sans-serif"],
                sans: ["IBM Plex Sans", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
            },
        },
    },
    plugins: [],
};

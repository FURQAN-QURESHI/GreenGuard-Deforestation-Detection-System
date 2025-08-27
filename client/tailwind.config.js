/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                'gg-primary': '#16a34a',
                'gg-dark': '#14532d',
            }
        },
    },
    plugins: [],
}

/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['Heebo', 'Inter', 'system-ui', 'sans-serif'],
            },
            colors: {
                // We can define custom colors here if needed, but Tailwind's default palette is usually enough.
                // We'll use slate-100 for bg, cyan-500/teal-500 for gradients.
            }
        },
    },
    plugins: [],
}

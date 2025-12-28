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
                brand: {
                    bg: 'var(--bg-main)',
                    card: 'var(--bg-card)',
                    text: 'var(--text-primary)',
                    muted: 'var(--text-secondary)',
                    accent: 'var(--primary-accent)',
                }
            }
        },
    },
    plugins: [],
}

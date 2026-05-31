/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'chat-bg': 'var(--chat-bg)',
        'chat-surface': 'var(--chat-surface)',
        'chat-border': 'var(--chat-border)',
        'chat-accent': 'var(--chat-accent)',
        'chat-accent-hover': 'var(--chat-accent-hover)',
        'chat-text-primary': 'var(--chat-text-primary)',
        'chat-text-secondary': 'var(--chat-text-secondary)',
      },
      fontFamily: {
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', "Liberation Mono", "Courier New", 'monospace'],
        sans: ['ui-sans-serif', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}

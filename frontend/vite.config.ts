import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // Relative base path for seamless GitHub Pages hosting
  server: {
    port: 5173,
    host: true,
  },
})

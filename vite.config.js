import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// ✅ Configuração ideal para deploy no Firebase Hosting
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist',
  },
  server: {
    port: 5173,
    open: true,
  },
})

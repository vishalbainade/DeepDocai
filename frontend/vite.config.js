import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'https://jurinex-backend-120280829617.asia-south1.run.app',
        changeOrigin: true,
      },
    },
  },
})


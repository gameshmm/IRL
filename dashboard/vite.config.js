import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // API REST e auth
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false
      },
      // SSE de sinal e status (usados pelo player e pelo overlay)
      '/signal': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false
      },
      // Overlay estático
      '/overlay': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false
      },
      // HLS streams (node-media-server na porta 8000)
      // Proxy via Vite resolve CORS e evita construir URL com porta diferente
      '/live': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false
      }
    }
  }
})

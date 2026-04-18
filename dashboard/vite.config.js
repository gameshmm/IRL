import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // API REST, auth, logs SSE e status SSE
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
        // Garante que SSE (text/event-stream) não seja bufferizado
        configure: (proxy) => {
          proxy.on('proxyRes', (proxyRes) => {
            if (proxyRes.headers['content-type']?.includes('text/event-stream')) {
              proxyRes.headers['x-accel-buffering'] = 'no';
            }
          });
        }
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
      '/live': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false
      }
    }
  }
})

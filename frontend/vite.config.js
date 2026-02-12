import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Optimization: Split vendor chunk
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom', 'axios', 'framer-motion'],
          recharts: ['recharts'],
          lucide: ['lucide-react']
        }
      }
    },
    // Warning limit increase
    chunkSizeWarningLimit: 1000
  },
  server: {
    host: true, // Listen on all addresses for local network testing (mobile)
    port: 5173
  }
})

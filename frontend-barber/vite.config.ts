import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: 'react-vendor',
              test: /node_modules[\\/](react|react-dom|react-router-dom|scheduler)[\\/]/,
              priority: 40,
            },
            {
              name: 'motion-vendor',
              test: /node_modules[\\/]framer-motion[\\/]/,
              priority: 30,
            },
            {
              name: 'charts-vendor',
              test: /node_modules[\\/]recharts[\\/]/,
              priority: 30,
              entriesAware: true,
            },
            {
              name: 'payment-vendor',
              test: /node_modules[\\/]@mercadopago[\\/]/,
              priority: 30,
              entriesAware: true,
            },
            {
              name: 'vendor',
              test: /node_modules[\\/]/,
              priority: 10,
            },
          ],
        },
      },
    },
  },
  server: {
    proxy: {
      '/auth': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      }
    }
  }
})

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import path from 'path'

const apiBaseUrl = process.env.VITE_API_BASE_URL || 'http://localhost:9000/api'
const apiServerTarget = apiBaseUrl.endsWith('/api')
  ? apiBaseUrl.slice(0, -4)
  : apiBaseUrl

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: process.env.VITE_PORT || 3000,
    proxy: {
      '/api': {
        target: apiServerTarget,
        changeOrigin: true,
      },
    },
  },
})

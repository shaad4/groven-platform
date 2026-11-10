import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'

export default defineConfig({
  plugins: [react(), basicSsl()],

  server: {
    host: true,
    port: 5173,

    allowedHosts: [
      'lvh.me',
      '.lvh.me',
    ],

    headers: {
      'Cross-Origin-Opener-Policy': 'unsafe-none',
      'Cross-Origin-Embedder-Policy': 'unsafe-none',
    },

    proxy: {
      '/api': {
        target: 'https://api.lvh.me:8443',  
        changeOrigin: true,
        secure: false,  
      },
      '/manifest.json': {
        target: 'https://api.lvh.me:8443/api/tenants/manifest.json',
        changeOrigin: false,
        secure: false,
      }
    },
  },
})
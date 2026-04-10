import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  server: { port: 5174 },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['vela.jpg', 'vela-192.png', 'vela-512.png', 'apple-touch-icon.png'],
      manifest: {
        name: 'VelaFit',
        short_name: 'VelaFit',
        description: 'Fitness that fits your life.',
        version: '1.1.0',
        theme_color: '#1a3a2a',
        background_color: '#faf8f4',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/dashboard',
        icons: [
          {
            src: '/vela-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/vela-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/vela-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      },
      workbox: {
        cacheId: 'velafit-v2',
        globPatterns: ['**/*.{js,css,html,ico,png,jpg,svg}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/nrlqgxsusnxarajofasd\.supabase\.co\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-cache',
              expiration: { maxEntries: 50, maxAgeSeconds: 300 }
            }
          }
        ]
      }
    })
  ]
})

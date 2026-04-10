import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  server: { port: 5174 },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: { enabled: false },
      includeAssets: ['vela.jpg', 'vela-192.png', 'vela-512.png', 'apple-touch-icon.png'],
      workbox: {
        globPatterns: [],
        runtimeCaching: [],
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
      },
      manifest: {
        name: 'VelaFit',
        short_name: 'VelaFit',
        description: 'Fitness that fits your life.',
        theme_color: '#1a3a2a',
        background_color: '#faf8f4',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/dashboard',
        icons: [
          { src: '/vela-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/vela-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/vela-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      }
    })
  ]
})

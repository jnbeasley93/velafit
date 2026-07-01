import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// NOTE: vite-plugin-pwa was removed. It registered its own service worker
// (sw.js) at scope '/', which collided with OneSignal's push worker and made
// iOS requestPermission() hang. The app never used offline caching
// (globPatterns/runtimeCaching were empty), so dropping the PWA service worker
// removes no functionality. Installability is preserved via the static
// public/manifest.webmanifest linked in index.html, and OneSignal's worker at
// '/onesignal/' is now the ONLY service worker the app registers.
export default defineConfig({
  server: { port: 5174 },
  plugins: [
    react(),
  ]
})

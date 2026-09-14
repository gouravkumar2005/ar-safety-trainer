import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import basicSsl from '@vitejs/plugin-basic-ssl'

// SIH26041 — AR Safety Trainer
// Dev server binds to 0.0.0.0 so you can open it on a phone on the same
// Wi-Fi (needed to test the AR "view in your space" button on Android
// Chrome). It's also served over HTTPS (self-signed, browser will warn —
// tap through "Advanced > Proceed") because Web Crypto (crypto.subtle,
// used throughout src/utils/ledger.js) only runs in a "secure context",
// and a plain http://<lan-ip> URL doesn't count as one, only https:// and
// localhost do. Without this, certificates/verification would silently
// break specifically when testing on a phone over LAN, while still
// appearing to work on the PC (which was hitting localhost).
export default defineConfig({
  server: {
    host: true,
    port: 5173,
  },
  plugins: [
    basicSsl(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'AR Safety Trainer — Jharkhand Mines & Manufacturing',
        short_name: 'AR Safety Trainer',
        description: 'AR-based vocational training & certification for industrial safety',
        theme_color: '#0b5fff',
        background_color: '#0b0f17',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
        ],
      },
      workbox: {
        // Cache the app shell + 3D models so training works with no signal
        // underground / on a mine site, per the PS's offline requirement.
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
        maximumFileSizeToCacheInBytes: 20 * 1024 * 1024, // glb models can be large
        runtimeCaching: [
          {
            urlPattern: /\/models\/.*\.glb$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'ar-models',
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],
      },
    }),
  ],
})

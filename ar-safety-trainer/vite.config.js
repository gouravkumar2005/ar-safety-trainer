import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import basicSsl from '@vitejs/plugin-basic-ssl'

// SIH26041 — AR Safety Trainer. One codebase, two build targets:
//
//   npm run build           -> website / PWA (default mode)
//   npm run build:android   -> the same app for the Android APK (--mode android)
//
// The Android build leaves out the service worker: everything is already
// bundled inside the APK, and a service worker there would only risk
// serving a stale copy of the app after an update.
//
// Dev server binds to 0.0.0.0 so you can open it on a phone on the same
// Wi-Fi. It's also served over HTTPS (self-signed, browser will warn —
// tap through "Advanced > Proceed") because Web Crypto (crypto.subtle,
// used throughout src/core/ledger.js) only runs in a "secure context",
// and a plain http://<lan-ip> URL doesn't count as one, only https:// and
// localhost do. (The Android app gets a secure context from Capacitor's
// https://localhost scheme — see capacitor.config.json.)

// Keep a year of cache for large, rarely-changing assets.
const LONG_CACHE = { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 }

function pwaPlugin() {
  return VitePWA({
    registerType: 'autoUpdate',
    includeAssets: ['favicon.svg'],
    manifest: {
      name: 'AR Safety Trainer — Jharkhand Mines & Manufacturing',
      short_name: 'AR Safety Trainer',
      description: 'AR-based vocational training & certification for industrial safety',
      theme_color: '#0b3d91',
      background_color: '#ffffff',
      display: 'standalone',
      start_url: '/',
      icons: [
        { src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
      ],
    },
    workbox: {
      // Cache the app shell + 3D models + on-device ML models so training
      // works with no signal underground / on a mine site, per the PS's
      // offline requirement.
      globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
      globIgnores: ['mediapipe/**'], // cached on first use instead (below)
      maximumFileSizeToCacheInBytes: 20 * 1024 * 1024, // glb models can be large
      runtimeCaching: [
        {
          urlPattern: /\/models\/.*\.glb$/,
          handler: 'CacheFirst',
          options: { cacheName: 'ar-models', expiration: LONG_CACHE },
        },
        {
          urlPattern: /\/mediapipe\//,
          handler: 'CacheFirst',
          options: { cacheName: 'ml-models', expiration: LONG_CACHE },
        },
      ],
    },
  })
}

// In development, /api/* is forwarded to the accounts server running
// locally (cd ../server && npm run dev), so the app can call it on its own
// origin with no CORS or mixed-content issues.
const API_PROXY = { '/api': 'http://localhost:8787' }

export default defineConfig(({ mode }) => {
  const isAndroid = mode === 'android'
  return {
    server: {
      host: true,
      port: 5173,
      proxy: API_PROXY,
    },
    preview: {
      proxy: API_PROXY,
    },
    plugins: isAndroid ? [] : [basicSsl(), pwaPlugin()],
  }
})

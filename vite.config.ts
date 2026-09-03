import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vite'

// Served from a GitHub Pages project subpath (https://<user>.github.io/liftlog/),
// so every asset URL, the service worker scope, and the manifest start_url all
// have to agree on that prefix — a subpath mismatch is the classic way to get a
// PWA that loads but refuses to install or go offline.
const BASE = '/liftlog/'

// https://vite.dev/config/
export default defineConfig({
  base: BASE,
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'LiftLog',
        short_name: 'LiftLog',
        description: 'Personal workout tracker — log a set faster than a spreadsheet.',
        theme_color: '#f2dcc0',
        background_color: '#f2dcc0',
        display: 'standalone',
        orientation: 'portrait',
        scope: BASE,
        start_url: BASE,
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Precache the full app shell so the app opens and can log a set
        // with zero network, per the offline requirement in the spec.
        globPatterns: ['**/*.{js,css,html,png,svg,ico,woff2}'],
        cleanupOutdatedCaches: true,
      },
      devOptions: {
        // Off in `npm run dev`. A root-scoped dev service worker can serve
        // index.html at `/` without the /liftlog/ prefix, so the app JS
        // fails to load and the screen stays blank. Offline checks use
        // `vite preview` against the production build instead.
        enabled: false,
      },
    }),
  ],
})

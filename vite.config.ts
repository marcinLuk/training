import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      strategies: 'generateSW',
      // The app registers the service worker from code (it applies an update only on the plan list).
      registerType: 'prompt',
      injectRegister: false,
      // Basic auth sits in front of the app, so Chrome must send credentials with the manifest request.
      useCredentials: true,
      manifest: {
        name: 'Trening',
        short_name: 'Trening',
        description:
          'Aplikacja prowadzi przez trening krok po kroku: bieżące ćwiczenie, serie do zrobienia i przerwa.',
        id: '/',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        lang: 'pl',
        dir: 'ltr',
        background_color: '#121314',
        theme_color: '#121314',
        icons: [
          { src: 'icons/pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icons/maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // The default patterns skip fonts and images. The font licence .txt files stay out.
        globPatterns: ['**/*.{js,css,html,woff2,svg,png,webmanifest}'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.ts'],
  },
})

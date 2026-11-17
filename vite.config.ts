import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vite'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['brewlog-mark.svg'],
      manifest: {
        name: 'Brewlog',
        short_name: 'Brewlog',
        description: 'A personal journal for specialty coffee.',
        lang: 'en',
        dir: 'ltr',
        theme_color: '#F5F1E9',
        background_color: '#F5F1E9',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: '/brewlog-mark.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2,webmanifest}'],
        navigateFallback: 'index.html',
      },
    }),
  ],
})

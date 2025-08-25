import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'icons/icon-180.png',
        'icons/icon-192.png',
        'icons/icon-512.png'
      ],
      manifest: {
        name: 'School OS',
        short_name: 'School OS',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#0ea5e9',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-180.png', sizes: '180x180', type: 'image/png' }
        ]
      },
      workbox: {
        // Increase precache limit so large PNGs don't fail the build
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        // Precache core assets; images are handled via runtimeCaching
        globPatterns: ['**/*.{js,css,html,ico,svg}'],
        runtimeCaching: [
          // Cache local images (png/jpg/webp…) on first use
          {
            urlPattern: ({ url }) =>
              url.origin === self.location.origin &&
              /\.(png|jpg|jpeg|webp|gif)$/i.test(url.pathname),
            handler: 'CacheFirst',
            options: {
              cacheName: 'local-images',
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 }
            }
          },
          // Cache Supabase public bucket images
          {
            urlPattern: /^https:\/\/.*supabase\.co\/storage\/v1\/object\/public\/(avatars|lunch-images)\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'supabase-public-images',
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 }
            }
          },
          // API requests should not be cached (avoid stale writes)
          {
            urlPattern: /^https:\/\/.*supabase\.co\/rest\/v1\/.*/i,
            handler: 'NetworkOnly'
// vite.config.js  — DROP-IN (safe build)
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 1000,
  },
})

          }
        ]
      }
    })
  ]
})


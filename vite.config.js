// vite.config.cjs — CommonJS, safe on Netlify
const { defineConfig } = require('vite')
const react = require('@vitejs/plugin-react')

// No root/base tricks; plain setup so Netlify can’t get confused.
module.exports = defineConfig({
  plugins: [react()],
  base: '/',                 // important for SPA on Netlify
  publicDir: 'public',
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 1000,
    // No custom rollupOptions.input — let Vite auto-detect index.html
  },
  server: {
    host: true,
    port: 5173,
    strictPort: true,
  },
  preview: {
    port: 4173,
    strictPort: true,
  },
})


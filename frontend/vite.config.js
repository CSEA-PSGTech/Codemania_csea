import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // React core - shared by all pages
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          // Three.js isolated - only loaded on Home page
          three: ['three'],
          // OGL isolated - only loaded on login/admin pages
          ogl: ['ogl'],
        }
      }
    },
    minify: 'esbuild',
    chunkSizeWarningLimit: 600,
    // Enable CSS code splitting
    cssCodeSplit: true,
  }
})

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './',
  test: {
    setupFiles: ['./src/test/setup.ts']
  },
  build: {
    rollupOptions: {
      output: {
        // App code changes on every deploy; these vendor libs change far less often.
        // Splitting them into their own chunks means returning players re-download
        // only the small app chunk instead of invalidating the whole bundle's cache.
        manualChunks: {
          vendor: ['react', 'react-dom'],
          motion: ['framer-motion'],
          supabase: ['@supabase/supabase-js'],
          icons: ['lucide-react']
        }
      }
    }
  }
})

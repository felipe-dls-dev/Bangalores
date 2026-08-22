import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './',
  test: {
    setupFiles: ['./src/test/setup.ts'],
    // balance-sim.test.ts plays full campaigns for every hero class (minutes, not
    // milliseconds) -- it's a standalone balance-tuning tool, not a regression test,
    // so it's excluded from the default `npm test` run. Invoke it explicitly with
    // `npm run test:balance` when tuning class/enemy numbers.
    exclude: ['**/node_modules/**', '**/dist/**', '**/cypress/**', '**/.{idea,git,cache,output,temp}/**', 'scripts/balance-sim.test.ts']
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

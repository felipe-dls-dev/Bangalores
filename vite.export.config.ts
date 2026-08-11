import { defineConfig } from 'vite'

export default defineConfig({
  build:{
    ssr:'scripts/export-card-data.ts',
    outDir:'tmp/card-export-build',
    emptyOutDir:true,
    rollupOptions:{output:{entryFileNames:'export-card-data.mjs'}}
  }
})

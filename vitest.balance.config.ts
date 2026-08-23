import { defineConfig } from 'vite'

// Dedicated config for `npm run test:balance` -- balance-sim.test.ts is excluded from the
// default `npm test` run (see vite.config.ts) because it plays full campaigns for every hero
// class (minutes, not milliseconds). This config has no such exclusion, so the file is
// reachable when targeted explicitly.
export default defineConfig({
  test: {
    setupFiles: ['./src/test/setup.ts'],
    testTimeout: 2400000
  }
})

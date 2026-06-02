import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    exclude: ['src/main/db/migrations.test.ts', 'src/main/db/index.test.ts'],
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src/renderer/src'),
    },
  },
})

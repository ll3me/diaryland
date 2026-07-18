import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      'astro:content': new URL('./tests/mocks/astro-content.ts', import.meta.url).pathname,
    },
  },
  test: {
    include: ['tests/**/*.test.ts'],
  },
})

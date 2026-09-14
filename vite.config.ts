import { defineConfig } from 'vite'

export default defineConfig({
  base: '/last-night-of-aetheria-grok-bot/',
  server: {
    host: true,
    port: 4731,
    strictPort: true,
  },
  preview: {
    host: true,
    port: 4731,
    strictPort: true,
  },
  build: {
    target: 'es2022',
  },
})

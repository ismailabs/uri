import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    // Never inline assets as data: URIs, so the CSP can stay strict.
    assetsInlineLimit: 0,
  },
  test: { environment: 'node', include: ['tests/**/*.test.ts'] },
});

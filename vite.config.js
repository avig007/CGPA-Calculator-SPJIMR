import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

// MOCK_CLOUD=1 swaps the Firebase layer for a local test double (used by the tests only).
const mock = process.env.MOCK_CLOUD === '1';

export default defineConfig({
  // Relative base works on GitHub Pages, Vercel and any static host.
  base: './',
  root: '.',
  resolve: {
    alias: mock ? [{ find: /^\.\/cloud\.js$/, replacement: fileURLToPath(new URL('./test/cloud.mock.js', import.meta.url)) }] : [],
  },
  build: {
    outDir: mock ? 'dist-test' : 'dist',
  },
});

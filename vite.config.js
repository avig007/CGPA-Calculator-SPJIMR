import { defineConfig } from 'vite';

export default defineConfig({
  // Relative base works on GitHub Pages, Vercel and any static host.
  base: './',
  root: '.',
  build: {
    outDir: 'dist',
  },
});

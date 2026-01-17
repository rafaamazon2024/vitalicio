
import { defineConfig } from 'vite';

export default defineConfig({
  root: './',
  build: {
    outDir: 'dist',
    minify: 'esbuild',
    sourcemap: false
  },
  server: {
    port: 3000
  }
});

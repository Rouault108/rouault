import path from 'node:path';
import { defineConfig } from 'vite';
import { resolveBuildLabel } from './build/metadata/build-metadata.js';

const buildLabel = resolveBuildLabel();

export default defineConfig({
  define: {
    __ROUAULT_BUILD_LABEL__: buildLabel === undefined ? 'undefined' : JSON.stringify(buildLabel),
  },
  publicDir: false,
  resolve: {
    alias: {
      '@': path.resolve(process.cwd(), 'src'),
    },
  },
  build: {
    target: 'es2022',
    outDir: '.generated/client',
    emptyOutDir: true,
    manifest: true,
    rollupOptions: {
      input: {
        client: path.resolve(process.cwd(), 'src/client.ts'),
        style: path.resolve(process.cwd(), 'src/assets/css/main.css'),
      },
      output: {
        entryFileNames: 'client-assets/[name]-[hash].js',
        chunkFileNames: 'client-assets/[name]-[hash].js',
        assetFileNames: 'client-assets/[name]-[hash][extname]',
      },
    },
  },
});
import path from 'node:path';
import { defineConfig } from 'vite';
import { resolveProductionBuildMetadata } from './build/metadata/build-metadata.js';

const buildMetadata = resolveProductionBuildMetadata();

export default defineConfig({
  define: {
    __ROUAULT_BUILD_ID__: JSON.stringify(buildMetadata.buildId),
    __ROUAULT_BUILD_LABEL__: JSON.stringify(buildMetadata.buildLabel),
    __ROUAULT_GENERATED_AT__: JSON.stringify(buildMetadata.generatedAt),
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

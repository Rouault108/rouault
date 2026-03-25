import path from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  publicDir: false,
  resolve: {
    alias: {
      '@': path.resolve(process.cwd(), 'src'),
      '@lit-labs/ssr-client': path.resolve(
        process.cwd(),
        'node_modules/.pnpm/node_modules/@lit-labs/ssr-client',
      ),
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
      },
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },
});
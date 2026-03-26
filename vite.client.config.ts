import { execSync } from 'node:child_process';
import path from 'node:path';
import { defineConfig } from 'vite';

const resolveGitHash = (): string => {
  try {
    return execSync('git rev-parse --short HEAD', {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return '';
  }
};

const gitHash = resolveGitHash();

export default defineConfig({
  define: {
    __GIT_HASH__: JSON.stringify(gitHash),
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
      },
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },
});

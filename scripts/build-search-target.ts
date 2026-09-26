import { resolve } from 'node:path';
import { build } from 'vite';

// production入口を切り替えず、同じmodule Workerをminify/emitしてD1でloadする。
await build({
  configFile: false,
  root: resolve('test/fixtures/search/packaged'),
  base: '/__search-packaged/',
  publicDir: false,
  worker: { format: 'es' },
  build: {
    target: 'es2022',
    outDir: resolve('.generated/search-target'),
    emptyOutDir: false,
    manifest: true,
  },
});

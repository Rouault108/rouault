import { readFile } from 'node:fs/promises';
import { defineConfig, mergeConfig } from 'vite';
import preview from './vite.preview.config.js';
import { readVerifiedCspStageOne, renderCspHeaders } from './build/security/csp-report-only.js';
import { createCspReportOnlyMiddleware } from './build/preview/csp-report-only.js';
import { createCspMediaAliasMiddleware } from './build/preview/csp-media-aliases.js';

export default mergeConfig(
  preview,
  defineConfig({
    // 既存配信で観測されたnosniffを隔離serverでも明示し、MIME検証を有効にする。
    preview: { headers: { 'X-Content-Type-Options': 'nosniff' } },
    plugins: [
      {
        name: 'rouault-isolated-csp-report-only',
        async configurePreviewServer(server) {
          // 型だけを信頼せず、現在の出力から生成した値との完全一致を起動ゲートにする。
          const manifest = await readVerifiedCspStageOne(
            server.config.build.outDir,
            '.generated/csp/manifest.json',
          );
          const headers = await readFile('.generated/csp/report-only.headers', 'utf8');
          if (headers !== renderCspHeaders(manifest)) throw new Error('Stale CSP header fragment');
          server.middlewares.use(createCspReportOnlyMiddleware(manifest));
          server.middlewares.use(createCspMediaAliasMiddleware(server.config.root, manifest));
        },
      },
    ],
  }),
);

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import { STATIC_ASSETS_ROOT_ABSOLUTE_PATH } from '../../build/assets/static-font-assets.js';
import { generatedCaseNames, generatedCasesDirectory } from './generated-cases.js';

const generatedCasesPlugin = (): Plugin => ({
  name: 'ui-check-generated-cases',
  apply: 'serve',
  configureServer(server) {
    const caseFiles = new Map(
      generatedCaseNames.map((name) => [
        `/tools/ui-check/cases/${name}.html`,
        path.join(generatedCasesDirectory, `${name}.html`),
      ]),
    );

    server.middlewares.use((request, response, next) => {
      const url = request.url;
      const file = url === undefined ? undefined : caseFiles.get(url.split('?')[0] ?? '');
      // HTMLだけを扱い、inline moduleのproxy requestはViteへ渡す。
      if (
        !file ||
        !url ||
        (request.method !== 'GET' && request.method !== 'HEAD') ||
        url.includes('html-proxy')
      ) {
        next();
        return;
      }

      void (async () => {
        try {
          const html = await readFile(file, 'utf8');
          // 閲覧URLを変換元にすることで相対module・戻りリンクを維持する。
          const transformed = await server.transformIndexHtml(url, html);
          response.statusCode = 200;
          response.setHeader('Content-Type', 'text/html; charset=utf-8');
          response.setHeader('Cache-Control', 'no-cache');
          response.end(request.method === 'HEAD' ? undefined : transformed);
        } catch (error) {
          next(error);
        }
      })();
    });
  },
});

export default defineConfig({
  publicDir: STATIC_ASSETS_ROOT_ABSOLUTE_PATH,
  plugins: [generatedCasesPlugin()],
});

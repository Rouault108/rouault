import { defineConfig, type Connect, type PreviewServer } from 'vite';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { resolveTrailingSlashRewrite } from './shared/navigation/trailing-slash-rewrite.js';
import { resolveDevelopmentSiteUrlContext } from './build/site/site-url-context.js';
import { createStaticCacheControlMiddleware } from './build/preview/static-cache-control.js';

const registerStaticCacheControl = (server: PreviewServer): void => {
  const source = readFileSync(
    path.resolve(server.config.root, server.config.build.outDir, '_headers'),
    'utf8',
  );
  server.middlewares.use(createStaticCacheControlMiddleware(source));
};

const registerTrailingSlashRewrite = (server: PreviewServer): void => {
  const middleware: Connect.NextHandleFunction = (req, _res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      next();
      return;
    }

    if (typeof req.url === 'string') {
      const rewrittenUrl = resolveTrailingSlashRewrite(req.url);
      if (rewrittenUrl !== null) {
        req.url = rewrittenUrl;
      }
    }

    next();
  };

  server.middlewares.use(middleware);
};

export default defineConfig({
  base: `${resolveDevelopmentSiteUrlContext().basePath}/`,
  appType: 'mpa',
  plugins: [
    {
      name: 'rouault-preview-trailing-slash-rewrite',
      configurePreviewServer(server) {
        registerStaticCacheControl(server);
        registerTrailingSlashRewrite(server);
      },
    },
  ],
});

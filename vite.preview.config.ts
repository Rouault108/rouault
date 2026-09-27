import { defineConfig, type Connect, type ViteDevServer } from 'vite';
import { resolveTrailingSlashRewrite } from './shared/navigation/trailing-slash-rewrite.js';
import { resolveDevelopmentSiteUrlContext } from './build/site/site-url-context.js';

const registerTrailingSlashRewrite = (server: ViteDevServer): void => {
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
        registerTrailingSlashRewrite(server);
      },
    },
  ],
});

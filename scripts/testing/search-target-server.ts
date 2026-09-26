import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { Plugin } from 'vite';

/** Stage 2の実artifactをtest専用URLへ公開し、production配信経路は変更しない。 */
export function searchTargetServer(): Plugin {
  const requests = new Map<string, string[]>();
  return {
    name: 'search-target-fixtures',
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const match = /^\/__search-packaged\/(index.html|assets\/[a-zA-Z0-9._-]+)$/u.exec(
          new URL(request.url ?? '/', 'http://localhost').pathname,
        );
        if (!match?.[1]) {
          next();
          return;
        }
        const file = match[1];
        void readFile(resolve('.generated/search-target', file)).then(
          (bytes) => {
            response.setHeader(
              'Content-Type',
              file.endsWith('.html') ? 'text/html' : 'text/javascript',
            );
            response.setHeader(
              'Cache-Control',
              file.endsWith('.html') ? 'no-cache' : 'public, max-age=31536000, immutable',
            );
            response.end(bytes);
          },
          () => {
            response.statusCode = 404;
            response.end();
          },
        );
      });
      server.middlewares.use((request, response, next) => {
        const path = new URL(request.url ?? '/', 'http://localhost').pathname;
        const match =
          /^\/__search-target\/(healthy|store404|storehash|storeonce|storetimeout|index404|navigate)\/(search\/[a-zA-Z0-9._-]+|target-verification.json|requests)$/u.exec(
            path,
          );
        if (!match) {
          next();
          return;
        }
        const scenario = match[1],
          relative = match[2];
        if (!relative) {
          next();
          return;
        }
        const key = `${request.headers['user-agent'] ?? ''}:${String(scenario)}`;
        if (relative === 'requests') {
          response.setHeader('Content-Type', 'application/json');
          response.end(JSON.stringify(requests.get(key) ?? []));
          return;
        }
        const log = requests.get(key) ?? [];
        log.push(relative);
        requests.set(key, log);
        void (async () => {
          try {
            const bytes = await readFile(resolve('.generated/search-foundation', relative));
            const storeFirst =
              relative.startsWith('search/store.') &&
              log.filter((path) => path.startsWith('search/store.')).length === 1;
            if (scenario === 'storeonce' && storeFirst) {
              response.statusCode = 404;
              response.end();
              return;
            }
            if (scenario === 'storetimeout' && storeFirst) {
              const timer = setTimeout(() => response.end(bytes), 16000);
              response.on('close', () => {
                clearTimeout(timer);
              });
              return;
            }
            if (
              (scenario === 'store404' && relative.startsWith('search/store.')) ||
              (scenario === 'index404' && relative.startsWith('search/document.'))
            ) {
              response.statusCode = 404;
              response.end();
              return;
            }
            response.setHeader(
              'Content-Type',
              relative.endsWith('.wasm') ? 'application/wasm' : 'application/json',
            );
            response.setHeader('Cache-Control', 'no-store');
            response.end(
              scenario === 'storehash' && relative.startsWith('search/store.')
                ? Buffer.from('{}')
                : bytes,
            );
          } catch {
            response.statusCode = 404;
            response.end();
          }
        })();
      });
      server.middlewares.use((request, response, next) => {
        const match =
          /^\/__search-target-report\/((?:performance-)?(?:chromium|firefox|webkit))$/u.exec(
            request.url ?? '',
          );
        if (!match || request.method !== 'POST') {
          next();
          return;
        }
        const chunks: Buffer[] = [];
        request.on('data', (chunk: Buffer) => chunks.push(chunk));
        request.on('end', () => {
          void (async () => {
            try {
              const value: unknown = JSON.parse(Buffer.concat(chunks).toString('utf8'));
              const directory = resolve('.generated/search-foundation');
              await mkdir(directory, { recursive: true });
              await writeFile(
                resolve(directory, `target-${String(match[1])}.json`),
                JSON.stringify(value, null, 2) + '\n',
              );
              response.end('ok');
            } catch {
              response.statusCode = 400;
              response.end();
            }
          })();
        });
      });
    },
  };
}

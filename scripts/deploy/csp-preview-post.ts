import https from 'node:https';
import type { ClientRequest, IncomingMessage, RequestOptions } from 'node:http';
import type { PreviewFetch } from './csp-preview-transport.js';

export type PreviewPostRequest = (
  url: URL,
  options: RequestOptions,
  callback: (response: IncomingMessage) => void,
) => ClientRequest;

// deployment作成だけはretryを持たないNode request一回に限定する。redirectもsocket再利用も行わない。
export const previewSinglePost =
  (factory: PreviewPostRequest = https.request): PreviewFetch =>
  (url, init) =>
    new Promise((resolve, reject) => {
      const target = new URL(url);
      if (
        target.origin !== 'https://api.cloudflare.com' ||
        !/^\/client\/v4\/accounts\/[a-f0-9]{32}\/pages\/projects\/rouault\/deployments$/u.test(
          target.pathname,
        ) ||
        target.search ||
        target.hash ||
        target.username ||
        target.password ||
        init.method !== 'POST' ||
        init.redirect !== 'manual' ||
        !(init.body instanceof Uint8Array) ||
        init.body.byteLength > 8 * 1024 * 1024
      ) {
        reject(new Error('[preview-delivery] invalid single POST profile'));
        return;
      }
      const headers = new Headers(init.headers);
      if (
        !/^multipart\/form-data; boundary=[\w-]+$/u.test(headers.get('content-type') ?? '') ||
        !headers.get('authorization')?.startsWith('Bearer ') ||
        [...headers.keys()].some(
          (key) => !['authorization', 'content-type', 'accept', 'accept-encoding'].includes(key),
        )
      ) {
        reject(new Error('[preview-delivery] invalid single POST headers'));
        return;
      }
      const signal = init.signal
        ? AbortSignal.any([init.signal, AbortSignal.timeout(20000)])
        : AbortSignal.timeout(20000);
      if (signal.aborted) {
        reject(new Error('[preview-delivery] deployment POST not started'));
        return;
      }
      const request = factory(
        target,
        {
          method: 'POST',
          agent: false,
          signal,
          headers: {
            ...Object.fromEntries(headers),
            'content-length': String(init.body.byteLength),
          },
        },
        (response) => {
          const chunks: Uint8Array[] = [];
          let length = 0;
          response.on('data', (chunk: Buffer) => {
            length += chunk.length;
            if (length > 8 * 1024 * 1024) {
              response.destroy();
              reject(new Error('[preview-delivery] deployment response limit'));
            } else chunks.push(chunk);
          });
          response.on('aborted', () => {
            reject(new Error('[preview-delivery] deployment response interrupted'));
          });
          response.on('error', () => {
            reject(new Error('[preview-delivery] deployment response uncertain'));
          });
          response.on('end', () => {
            try {
              const resultHeaders = new Headers();
              for (const [name, value] of Object.entries(response.headers))
                if (value !== undefined)
                  for (const item of Array.isArray(value) ? value : [value])
                    resultHeaders.append(name, item);
              resolve(
                new Response(Uint8Array.from(Buffer.concat(chunks)), {
                  status: response.statusCode ?? 500,
                  headers: resultHeaders,
                }),
              );
            } catch {
              reject(new Error('[preview-delivery] invalid deployment response'));
            }
          });
        },
      );
      request.on('error', () => {
        reject(new Error('[preview-delivery] deployment POST outcome unknown'));
      });
      request.on('upgrade', (_response, socket) => {
        socket.destroy();
        reject(new Error('[preview-delivery] unsupported deployment protocol'));
      });
      request.end(init.body);
    });

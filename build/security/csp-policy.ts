import { createHash } from 'node:crypto';

export const CSP_POLICY_VERSION = 'rouault-csp-stage1-v2';
export const CSP_REPORT_ONLY_HEADER = 'Content-Security-Policy-Report-Only';
export type CspDirective =
  | 'default-src'
  | 'script-src'
  | 'script-src-attr'
  | 'style-src'
  | 'style-src-elem'
  | 'style-src-attr'
  | 'img-src'
  | 'font-src'
  | 'media-src'
  | 'connect-src'
  | 'worker-src'
  | 'frame-src'
  | 'object-src'
  | 'base-uri'
  | 'form-action'
  | 'frame-ancestors'
  | 'manifest-src';
export type CspPolicy = Partial<Record<CspDirective, readonly string[]>>;

export const serializeCspPolicy = (policy: CspPolicy): string =>
  Object.entries(policy)
    .map(([name, sources]) => {
      if (
        !sources.length ||
        sources.some((source) => !source || /[\s;,{}]/u.test(source)) ||
        (sources.includes("'none'") && sources.length !== 1)
      )
        throw new Error(`[csp] invalid ${name} sources`);
      if (new Set(sources).size !== sources.length)
        throw new Error(`[csp] duplicate ${name} source`);
      return `${name} ${sources.join(' ')}`;
    })
    .join('; ');

export const createDocumentPolicy = (
  hashes: readonly string[],
  mediaOrigin: string | null,
): CspPolicy => ({
  'default-src': ["'none'"],
  'script-src': ["'self'", ...new Set(hashes)],
  'script-src-attr': ["'none'"],
  'style-src': ["'self'", "'unsafe-inline'"],
  'style-src-elem': ["'self'", "'unsafe-inline'"],
  'style-src-attr': ["'unsafe-inline'"],
  'img-src': ["'self'", 'data:', ...(mediaOrigin ? [mediaOrigin] : [])],
  'font-src': ["'self'"],
  'media-src': ["'self'", ...(mediaOrigin ? [mediaOrigin] : [])],
  'connect-src': ["'self'"],
  'worker-src': ["'self'"],
  // Stage 0でrunner profileが採用されるまで、親が許可するHTTP runnerは空集合とする。
  'frame-src': ["'none'"],
  'object-src': ["'none'"],
  'base-uri': ["'none'"],
  'form-action': ["'none'"],
  'frame-ancestors': ["'none'"],
  'manifest-src': ["'none'"],
});

export const WORKER_POLICY: CspPolicy = {
  'default-src': ["'none'"],
  'script-src': ["'self'", "'wasm-unsafe-eval'"],
  'connect-src': ["'self'", 'blob:'],
  'worker-src': ["'none'"],
  'object-src': ["'none'"],
};
export const policyDigest = (document: CspPolicy): string =>
  createHash('sha256')
    .update(
      JSON.stringify({
        version: CSP_POLICY_VERSION,
        mode: 'report-only',
        document,
        worker: WORKER_POLICY,
      }),
    )
    .digest('hex');

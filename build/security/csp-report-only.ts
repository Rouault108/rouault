import { readFile } from 'node:fs/promises';
import {
  collectCspStageOne,
  type CspStageOneManifest,
  type InventoryOptions,
} from './csp-inventory.js';
import {
  CSP_REPORT_ONLY_HEADER,
  createDocumentPolicy,
  serializeCspPolicy,
  WORKER_POLICY,
} from './csp-policy.js';
export { collectCspStageOne, inventoryCspDocument, scriptHash } from './csp-inventory.js';
export type { CspStageOneManifest } from './csp-inventory.js';
export { CSP_REPORT_ONLY_HEADER } from './csp-policy.js';
export { cssResourceUrls } from './csp-resources.js';
export const documentPolicy = (hashes: readonly string[], mediaOrigin: string | null): string =>
  serializeCspPolicy(createDocumentPolicy(hashes, mediaOrigin));
export const workerPolicy = serializeCspPolicy(WORKER_POLICY);
export const matchesCspPath = (pattern: string, pathname: string): boolean => {
  const regex = pattern
    .split('*')
    .map((part) => part.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&'))
    .join('.*');
  return new RegExp(`^${regex}$`, 'u').test(pathname);
};

export const renderCspHeaders = (manifest: CspStageOneManifest): string => {
  for (const rule of manifest.rules) {
    if (
      !rule.pattern.startsWith('/') ||
      /[\s:{}]/u.test(rule.pattern) ||
      rule.pattern.split('*').length > 2
    )
      throw new Error('[csp] invalid header rule pattern');
    if (
      rule.context === 'worker' &&
      manifest.rules.some(
        (parent) => parent.context === 'document' && matchesCspPath(parent.pattern, rule.pattern),
      )
    )
      throw new Error('[csp] parent/Worker policy overlap');
  }
  if (new Set(manifest.rules.map(({ pattern }) => pattern)).size !== manifest.rules.length)
    throw new Error('[csp] duplicate header rule');
  if (manifest.rules.length > 100) throw new Error('[csp] Cloudflare 100 rule limit exceeded');
  const source =
    '# ISOLATED VALIDATION ONLY: do not copy into dist/_headers without delivery approval\n' +
    manifest.rules
      .map(({ pattern, policy }) => `${pattern}\n  ${CSP_REPORT_ONLY_HEADER}: ${policy}\n`)
      .join('\n');
  if (source.split('\n').some((line) => line.length > 2000))
    throw new Error('[csp] Cloudflare 2000 character line limit exceeded');
  return source;
};

export const verifyCspStageOne = async (
  dist: string,
  manifest: CspStageOneManifest,
  options: InventoryOptions = {},
): Promise<void> => {
  const actual = await collectCspStageOne(dist, manifest.mediaOrigin, options);
  if (JSON.stringify(actual) !== JSON.stringify(manifest))
    throw new Error('[csp] generated output differs from frozen inventory/hash manifest');
};

export const readVerifiedCspStageOne = async (
  dist: string,
  manifestFile: string,
  options: InventoryOptions = {},
): Promise<CspStageOneManifest> => {
  const raw: unknown = JSON.parse(await readFile(manifestFile, 'utf8'));
  if (
    !raw ||
    typeof raw !== 'object' ||
    !('mediaOrigin' in raw) ||
    (raw.mediaOrigin !== null && typeof raw.mediaOrigin !== 'string')
  )
    throw new Error('[csp] invalid manifest');
  const actual = await collectCspStageOne(dist, raw.mediaOrigin, options);
  if (JSON.stringify(raw) !== JSON.stringify(actual))
    throw new Error('[csp] stale inventory/hash manifest');
  return actual;
};

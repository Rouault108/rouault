import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { parse, type DefaultTreeAdapterMap } from 'parse5';
import { parse as parseCss } from 'postcss';
import { createSiteUrlContext } from '../../shared/site/site-url-context.js';
import { buildThemeDocumentBootstrapScript } from '../../src/theme/theme-document-bootstrap.js';
import { buildThemeChromeBootstrapScript } from '../../src/theme/theme-chrome-bootstrap.js';
import { escapeInlineExecutableScriptText } from '../../src/layouts/html-output.js';

export const CSP_REPORT_ONLY_HEADER = 'Content-Security-Policy-Report-Only';
type Node = DefaultTreeAdapterMap['node'];
export interface CspDocumentInventory {
  file: string;
  inlineScriptHashes: string[];
  resources: { element: string; attribute: string; url: string; origin: string }[];
  styleAttributes: number;
  styleElements: number;
  eventHandlers: number;
  previewPayloads: number;
}
export interface CspStageOneManifest {
  schema: 1;
  siteOrigin: string;
  mediaOrigin: string | null;
  documents: CspDocumentInventory[];
  stylesheetResources: { file: string; url: string; origin: string }[];
  rules: { pattern: string; policy: string; context: 'document' | 'worker' }[];
}

export const scriptHash = (text: string): string =>
  `'sha256-${createHash('sha256').update(text).digest('base64')}'`;

// 未知のMIMEやimportmapを「非実行」と見なして棚卸しから漏らさない。
const executableType = (type: string): boolean =>
  type !== 'application/json' && type !== 'application/ld+json';

export const cssResourceUrls = (css: string, baseUrl: string): string[] => {
  const resources: string[] = [];
  const urls = (value: string): void => {
    for (const match of value.matchAll(/url\(\s*(?:"([^"]*)"|'([^']*)'|([^)]*?))\s*\)/giu)) {
      resources.push(new URL(match[1] ?? match[2] ?? match[3] ?? '', baseUrl).href);
    }
  };
  const root = parseCss(css);
  root.walkDecls((declaration) => {
    urls(declaration.value);
  });
  root.walkAtRules('import', (rule) => {
    const quoted = /^\s*["']([^"']+)["']/u.exec(rule.params);
    if (quoted?.[1]) resources.push(new URL(quoted[1], baseUrl).href);
    else urls(rule.params);
  });
  return resources;
};

export const inventoryCspDocument = (
  html: string,
  file: string,
  documentUrl: string,
): CspDocumentInventory => {
  const result: CspDocumentInventory = {
    file,
    inlineScriptHashes: [],
    resources: [],
    styleAttributes: 0,
    styleElements: 0,
    eventHandlers: 0,
    previewPayloads: 0,
  };
  const expected = [buildThemeDocumentBootstrapScript(), buildThemeChromeBootstrapScript()].map(
    escapeInlineExecutableScriptText,
  );
  const bodies: string[] = [];
  const document = parse(html);
  let effectiveBase = documentUrl;
  let hasBase = false;
  const findBase = (node: Node): void => {
    if ('tagName' in node) {
      if (node.tagName === 'template') return;
      const href =
        node.tagName === 'base' ? node.attrs.find(({ name }) => name === 'href')?.value : undefined;
      if (!hasBase && href !== undefined) {
        effectiveBase = new URL(href, documentUrl).href;
        hasBase = true;
      }
    }
    if ('childNodes' in node) node.childNodes.forEach(findBase);
  };
  findBase(document);
  const visit = (node: Node): void => {
    if ('tagName' in node) {
      const attributes = new Map(node.attrs.map(({ name, value }) => [name, value]));
      if (node.tagName === 'template') {
        if (attributes.has('data-preview-kind')) result.previewPayloads++;
        // template内部は実行文書ではない。動的srcdocはbrowser観測で別に扱う。
        return;
      }
      if (attributes.has('style')) result.styleAttributes++;
      result.eventHandlers += node.attrs.filter(({ name }) => name.startsWith('on')).length;
      if (node.tagName === 'style') result.styleElements++;
      if (
        node.tagName === 'script' &&
        !attributes.has('src') &&
        executableType((attributes.get('type') ?? '').trim().toLowerCase())
      ) {
        const body = node.childNodes.map((child) => ('value' in child ? child.value : '')).join('');
        bodies.push(body);
        result.inlineScriptHashes.push(scriptHash(body));
      }
      for (const { name, value } of node.attrs) {
        const resource =
          name === 'src' ||
          name === 'poster' ||
          name === 'srcset' ||
          (name === 'href' &&
            node.tagName === 'link' &&
            /(?:stylesheet|preload|modulepreload|icon)/u.test(attributes.get('rel') ?? ''));
        if (!resource) continue;
        const values =
          name === 'srcset'
            ? value.split(',').map((part) => part.trim().split(/\s+/u)[0] ?? '')
            : [value];
        for (const candidate of values) {
          const url = new URL(candidate, effectiveBase);
          result.resources.push({
            element: node.tagName,
            attribute: name,
            url: url.href,
            origin: url.origin,
          });
        }
      }
    }
    if ('childNodes' in node) node.childNodes.forEach(visit);
  };
  visit(document);
  // 未知のscriptをhash生成によって追認せず、承認済みbootstrapの実出力だけを許可する。
  if (bodies.length !== 2 || bodies.some((body, index) => body !== expected[index])) {
    throw new Error(`[csp] ${file}: expected exactly the two emitted theme bootstrap bodies`);
  }
  return result;
};

export const documentPolicy = (hashes: readonly string[], mediaOrigin: string | null): string =>
  [
    "default-src 'none'",
    "base-uri 'self'",
    "object-src 'none'",
    `script-src 'self' ${[...new Set(hashes)].sort().join(' ')}`,
    "script-src-attr 'none'",
    "style-src 'self'",
    "style-src-attr 'unsafe-inline'",
    "font-src 'self'",
    `img-src 'self'${mediaOrigin ? ` ${mediaOrigin}` : ''}`,
    `media-src 'self'${mediaOrigin ? ` ${mediaOrigin}` : ''}`,
    "connect-src 'self'",
    "worker-src 'self'",
    "frame-src 'self'",
    "form-action 'self'",
  ].join('; ');

export const workerPolicy = [
  "default-src 'none'",
  "script-src 'self' 'wasm-unsafe-eval'",
  "connect-src 'self' blob:",
  "worker-src 'none'",
  "object-src 'none'",
].join('; ');

const filesUnder = async (root: string, prefix = ''): Promise<string[]> => {
  const result: string[] = [];
  for (const entry of (await readdir(path.join(root, prefix), { withFileTypes: true })).sort(
    (a, b) => a.name.localeCompare(b.name),
  )) {
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) result.push(...(await filesUnder(root, relative)));
    else if (entry.isFile()) result.push(relative);
  }
  return result;
};

export const collectCspStageOne = async (
  dist: string,
  mediaOrigin: string | null = null,
): Promise<CspStageOneManifest> => {
  if (
    mediaOrigin !== null &&
    (new URL(mediaOrigin).origin !== mediaOrigin || !mediaOrigin.startsWith('https://'))
  ) {
    throw new Error('[csp] mediaOrigin must be an explicit HTTPS origin');
  }
  const files = await filesUnder(dist);
  const documents: CspDocumentInventory[] = [];
  let siteOrigin: string | undefined;
  let basePath: string | undefined;
  const patterns = new Set<string>();
  for (const file of files.filter((file) => file.endsWith('.html'))) {
    const html = await readFile(path.join(dist, file), 'utf8');
    const document = parse(html);
    const metadata = new Map<string, string>();
    const visit = (node: Node): void => {
      if ('tagName' in node && node.tagName === 'meta') {
        const attrs = new Map(node.attrs.map(({ name, value }) => [name, value]));
        metadata.set(attrs.get('name') ?? '', attrs.get('content') ?? '');
      }
      if ('childNodes' in node) node.childNodes.forEach(visit);
    };
    visit(document);
    const origin = metadata.get('rouault-site-origin');
    const base = metadata.get('rouault-base-path') ?? '';
    createSiteUrlContext({ siteOrigin: origin, basePath: base });
    if (basePath !== undefined && basePath !== base)
      throw new Error('[csp] inconsistent base path');
    basePath = base;
    if (!origin || new URL(origin).origin !== origin || (siteOrigin && siteOrigin !== origin)) {
      throw new Error(`[csp] ${file}: inconsistent or missing site origin`);
    }
    siteOrigin = origin;
    documents.push(inventoryCspDocument(html, file, `${origin}${base}/${file}`));
    const first = file.split('/')[0];
    if (file.includes('/')) patterns.add(`${base}/${first}/*`);
    else {
      patterns.add(`${base}/${file}`);
      patterns.add(`${base}/${file === 'index.html' ? '' : file.slice(0, -5)}`);
    }
  }
  if (!siteOrigin || !documents.length) throw new Error('[csp] no generated HTML');
  const stylesheetResources: CspStageOneManifest['stylesheetResources'] = [];
  for (const file of files.filter((file) => file.endsWith('.css'))) {
    const css = await readFile(path.join(dist, file), 'utf8');
    for (const url of cssResourceUrls(css, `${siteOrigin}${basePath ?? ''}/${file}`)) {
      stylesheetResources.push({ file, url, origin: new URL(url).origin });
    }
  }
  const workers = files.filter((file) => /^client-assets\/worker-[\w-]+\.js$/u.test(file));
  if (workers.length !== 1) throw new Error('[csp] expected one production lexical Worker entry');
  const policy = documentPolicy(
    documents.flatMap((document) => document.inlineScriptHashes),
    mediaOrigin,
  );
  const rules: CspStageOneManifest['rules'] = [...patterns]
    .sort()
    .map((pattern) => ({ pattern, policy, context: 'document' }));
  const workerFile = workers[0];
  if (!workerFile) throw new Error('[csp] missing worker');
  const workerPath = `${basePath ?? ''}/${workerFile}`;
  if (rules.some((rule) => matchesCspPath(rule.pattern, workerPath)))
    throw new Error('[csp] parent/Worker policy overlap');
  rules.push({ pattern: workerPath, policy: workerPolicy, context: 'worker' });
  const manifest: CspStageOneManifest = {
    schema: 1,
    siteOrigin,
    mediaOrigin,
    documents,
    stylesheetResources,
    rules,
  };
  renderCspHeaders(manifest);
  return manifest;
};

export const matchesCspPath = (pattern: string, pathname: string): boolean => {
  const regex = pattern
    .split('*')
    .map((part) => part.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&'))
    .join('.*');
  return new RegExp(`^${regex}$`, 'u').test(pathname);
};

export const renderCspHeaders = (manifest: CspStageOneManifest): string => {
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
): Promise<void> => {
  const actual = await collectCspStageOne(dist, manifest.mediaOrigin);
  if (JSON.stringify(actual) !== JSON.stringify(manifest))
    throw new Error('[csp] generated output differs from frozen inventory/hash manifest');
};

export const readVerifiedCspStageOne = async (
  dist: string,
  manifestFile: string,
): Promise<CspStageOneManifest> => {
  const raw: unknown = JSON.parse(await readFile(manifestFile, 'utf8'));
  if (
    !raw ||
    typeof raw !== 'object' ||
    !('mediaOrigin' in raw) ||
    (raw.mediaOrigin !== null && typeof raw.mediaOrigin !== 'string')
  )
    throw new Error('[csp] invalid manifest');
  const actual = await collectCspStageOne(dist, raw.mediaOrigin);
  if (JSON.stringify(raw) !== JSON.stringify(actual))
    throw new Error('[csp] stale inventory/hash manifest');
  return actual;
};

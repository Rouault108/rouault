import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { parse, parseFragment, type DefaultTreeAdapterMap } from 'parse5';
import ts from 'typescript';
import { createSiteUrlContext } from '../../shared/site/site-url-context.js';
import { buildThemeDocumentBootstrapScript } from '../../src/theme/theme-document-bootstrap.js';
import { buildThemeChromeBootstrapScript } from '../../src/theme/theme-chrome-bootstrap.js';
import { escapeInlineExecutableScriptText } from '../../src/layouts/html-output.js';
import {
  classifyCspResource,
  cssResourceKind,
  cssResourceUrls,
  srcsetUrls,
  type CspResource,
  type ResourceContext,
  type ResourceKind,
} from './csp-resources.js';
import {
  CSP_POLICY_VERSION,
  createDocumentPolicy,
  policyDigest,
  serializeCspPolicy,
  WORKER_POLICY,
} from './csp-policy.js';
import { loadMediaAliases, type CspMediaAlias } from './csp-media-aliases.js';

type Node = DefaultTreeAdapterMap['node'];
export const sha256 = (text: string): string => createHash('sha256').update(text).digest('hex');
export const scriptHash = (text: string): string =>
  `'sha256-${createHash('sha256').update(text).digest('base64')}'`;
export interface CspDocumentInventory {
  file: string;
  routeClass: string;
  sha256: string;
  inlineScriptHashes: string[];
  executableSources: { pathname: string; type: string }[];
  resources: CspResource[];
  styleAttributes: number;
  styleElements: number;
  eventHandlers: number;
  previewPayloads: number;
}
export interface CspStageOneManifest {
  schema: 2;
  mode: 'report-only';
  policyVersion: string;
  policyDigest: string;
  buildId: string;
  siteOrigin: string;
  basePath: string;
  mediaOrigin: string | null;
  hashOwners: { owner: 'theme-document' | 'theme-chrome'; hash: string }[];
  documents: CspDocumentInventory[];
  envelopes: CspDocumentInventory[];
  stylesheetResources: (CspResource & { file: string })[];
  inactiveStylesheets: { file: string; sha256: string; reason: string }[];
  assets: { file: string; sha256: string; owner: string }[];
  clientManifestDigest: string;
  mediaAliases: CspMediaAlias[];
  runtimeContracts: { owner: string; permission: string; reason: string }[];
  rules: { pattern: string; policy: string; context: 'document' | 'worker'; reset?: boolean }[];
}
export interface InventoryOptions {
  viteManifestFile?: string;
}

export const routeClass = (file: string): string => {
  if (file === 'index.html' || file === '/') return 'home';
  if (file === '404.html' || file === '/404' || file === '/404.html') return '404';
  const segment = file.replace(/^\//u, '').split('/')[0];
  return (
    (
      {
        notes: 'note',
        memos: 'memo',
        corpora: 'corpus',
        tags: 'tag',
        about: 'about',
        search: 'search',
      } as Record<string, string>
    )[segment ?? ''] ?? 'other'
  );
};
const textContent = (node: Node): string =>
  'value' in node
    ? node.value
    : 'childNodes' in node
      ? node.childNodes.map(textContent).join('')
      : '';

export const inventoryCspDocument = (
  html: string,
  file: string,
  documentUrl: string,
  options: { mediaOrigin?: string | null; fragment?: boolean } = {},
): CspDocumentInventory => {
  const result: CspDocumentInventory = {
    file,
    routeClass: routeClass(file.replace(/^__router\//u, '')),
    sha256: sha256(html),
    inlineScriptHashes: [],
    executableSources: [],
    resources: [],
    styleAttributes: 0,
    styleElements: 0,
    eventHandlers: 0,
    previewPayloads: 0,
  };
  const expected = [buildThemeDocumentBootstrapScript(), buildThemeChromeBootstrapScript()].map(
    escapeInlineExecutableScriptText,
  );
  const context: ResourceContext = {
    siteOrigin: new URL(documentUrl).origin,
    mediaOrigin: options.mediaOrigin ?? null,
  };
  const bodies: string[] = [];
  const root = options.fragment ? parseFragment(html) : parse(html);
  const add = (candidate: string, kind: ResourceKind, scope: CspResource['scope']): void => {
    result.resources.push(
      classifyCspResource(new URL(candidate, documentUrl), kind, scope, context),
    );
  };
  const css = (source: string, scope: CspResource['scope']): void => {
    for (const candidate of cssResourceUrls(source, documentUrl)) {
      const url = new URL(candidate);
      result.resources.push(classifyCspResource(url, cssResourceKind(url), scope, context));
    }
  };
  const visit = (node: Node, inert = false): void => {
    if ('tagName' in node) {
      const attrs = new Map(node.attrs.map(({ name, value }) => [name, value]));
      const scope = inert ? 'template' : options.fragment ? 'envelope' : 'document';
      if (node.tagName === 'template') {
        if (attrs.has('data-code-copy-source')) return;
        const kind = attrs.get('data-preview-kind');
        const content = 'content' in node ? node.content : node;
        if (kind) result.previewPayloads++;
        if (kind === 'css') css(textContent(content), 'template');
        else if (kind === 'html') visit(parseFragment(textContent(content)), true);
        else if (kind !== 'js') visit(content, true);
        return;
      }
      if (!inert && (attrs.has('nonce') || node.attrs.some(({ name }) => name.startsWith('on'))))
        throw new Error(`[csp] ${file}: nonce or event handler outside inert payload`);
      if (!inert && node.tagName === 'base')
        throw new Error(`[csp] ${file}: unexpected base element`);
      if (!inert && ['iframe', 'object', 'embed'].includes(node.tagName))
        throw new Error(`[csp] ${file}: unclassified frame/object outside inert payload`);
      for (const { name, value } of node.attrs) {
        if (
          /^(?:href|src|action|formaction|xlink:href)$/u.test(name) &&
          Array.from(value)
            .filter((char) => char.charCodeAt(0) > 32)
            .join('')
            .toLowerCase()
            .startsWith('javascript:')
        )
          throw new Error(`[csp] ${file}: javascript URL`);
      }
      if (attrs.has('style')) {
        result.styleAttributes++;
        css(`x{${attrs.get('style') ?? ''}}`, scope);
      }
      if (node.tagName === 'style') {
        result.styleElements++;
        css(textContent(node), scope);
      }
      if (node.tagName === 'script') {
        const type = (attrs.get('type') ?? '').trim().toLowerCase();
        if (attrs.has('src')) {
          add(attrs.get('src') ?? '', 'script', scope);
          if (!inert)
            result.executableSources.push({
              pathname: new URL(attrs.get('src') ?? '', documentUrl).pathname,
              type,
            });
        } else if (!inert && type !== 'application/json' && type !== 'application/ld+json') {
          const body = textContent(node);
          bodies.push(body);
          result.inlineScriptHashes.push(scriptHash(body));
        }
      }
      for (const { name, value } of node.attrs) {
        if (name === 'src' && node.tagName !== 'script') {
          const kind: ResourceKind =
            /^(?:video|audio)$/u.test(node.tagName) ||
            (node.tagName === 'source' && !attrs.has('srcset'))
              ? 'media'
              : node.tagName === 'iframe'
                ? 'frame'
                : 'image';
          add(value, kind, scope);
        } else if (name === 'poster') add(value, 'image', scope);
        else if (name === 'srcset')
          for (const candidate of srcsetUrls(value)) add(candidate, 'image', scope);
        else if (name === 'href' && node.tagName === 'link') {
          const rel = attrs.get('rel') ?? '';
          const kind: ResourceKind | undefined = rel.includes('stylesheet')
            ? 'style'
            : rel.includes('icon')
              ? 'image'
              : rel.includes('modulepreload')
                ? 'script'
                : rel.includes('preload')
                  ? (
                      {
                        font: 'font',
                        script: 'script',
                        style: 'style',
                        image: 'image',
                        video: 'media',
                        audio: 'media',
                        fetch: 'connect',
                      } as Record<string, ResourceKind>
                    )[attrs.get('as') ?? '']
                  : undefined;
          if (kind) add(value, kind, scope);
          else if (/preload|manifest|prefetch|preconnect/u.test(rel))
            throw new Error(`[csp] ${file}: unclassified link resource`);
        }
      }
    }
    if ('childNodes' in node) node.childNodes.forEach((child) => visit(child, inert));
  };
  visit(root);
  if (
    options.fragment
      ? bodies.length !== 0
      : bodies.length !== 2 || bodies.some((body, index) => body !== expected[index])
  )
    throw new Error(
      `[csp] ${file}: expected ${options.fragment ? 'no fragment executable script' : 'exactly the two emitted theme bootstrap bodies'}`,
    );
  return result;
};

export const filesUnder = async (root: string, prefix = ''): Promise<string[]> => {
  const result: string[] = [];
  for (const entry of (await readdir(path.join(root, prefix), { withFileTypes: true })).sort(
    (a, b) => a.name.localeCompare(b.name),
  )) {
    const file = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) result.push(...(await filesUnder(root, file)));
    else if (entry.isFile()) result.push(file);
  }
  return result;
};
const object = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('[csp] invalid artifact object');
  return Object.fromEntries(Object.entries(value));
};
const assetFile = (value: unknown): string => {
  if (typeof value !== 'string' || !/^client-assets\/[\w.-]+$/u.test(value) || value.includes('..'))
    throw new Error('[csp] unsafe client manifest asset');
  return value;
};

const inventoryBundles = async (
  dist: string,
  files: string[],
  siteOrigin: string,
  basePath: string,
  options: InventoryOptions,
) => {
  const source = await readFile(
    options.viteManifestFile ?? path.resolve(dist, '../.generated/client/.vite/manifest.json'),
    'utf8',
  );
  const entries = object(JSON.parse(source));
  if (!object(entries['src/client.ts'])['isEntry'])
    throw new Error('[csp] missing Vite client entry');
  const owners = new Map<string, string>();
  for (const [key, raw] of Object.entries(entries)) {
    const entry = object(raw);
    const file = assetFile(entry['file']);
    owners.set(file, 'vite-manifest');
    for (const field of ['imports', 'dynamicImports']) {
      const links = entry[field];
      if (
        links !== undefined &&
        (!Array.isArray(links) ||
          links.some((key: unknown) => typeof key !== 'string' || !(key in entries)))
      )
        throw new Error(`[csp] invalid Vite ${field} reference for ${key}`);
    }
  }
  const workers: string[] = [];
  const scanned = new Set<string>();
  const resolve = (literal: string, file: string): string => {
    const url = new URL(literal, `${siteOrigin}${basePath}/${file}`);
    if (
      url.origin !== siteOrigin ||
      url.search ||
      url.hash ||
      !url.pathname.startsWith(`${basePath}/client-assets/`)
    )
      throw new Error('[csp] unapproved bundle dependency');
    return assetFile(url.pathname.slice(basePath.length + 1));
  };
  const queue = [...owners.keys()].filter((file) => file.endsWith('.js'));
  while (queue.length) {
    const file = queue.shift();
    if (!file || scanned.has(file)) continue;
    scanned.add(file);
    const source = await readFile(path.join(dist, file), 'utf8');
    const ast = ts.createSourceFile(file, source, ts.ScriptTarget.ESNext, true, ts.ScriptKind.JS);
    const add = (literal: string, owner: string): void => {
      const target = resolve(literal, file);
      owners.set(target, owner);
      if (target.endsWith('.js')) queue.push(target);
    };
    const visit = (node: ts.Node): void => {
      if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier))
        add(node.moduleSpecifier.text, 'bundle-import');
      if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
        const first = node.arguments[0];
        if (!first || !ts.isStringLiteral(first))
          throw new Error('[csp] unclassified dynamic import');
        add(first.text, 'bundle-dynamic-import');
      }
      if (
        ts.isNewExpression(node) &&
        ts.isIdentifier(node.expression) &&
        node.expression.text === 'Worker'
      ) {
        const first = node.arguments?.[0];
        const options = node.arguments?.[1];
        const moduleOption =
          options &&
          ts.isObjectLiteralExpression(options) &&
          options.properties.some(
            (property) =>
              ts.isPropertyAssignment(property) &&
              property.name.getText(ast).replace(/['"]/gu, '') === 'type' &&
              ts.isStringLiteral(property.initializer) &&
              property.initializer.text === 'module',
          );
        if (
          !first ||
          !ts.isNewExpression(first) ||
          !ts.isIdentifier(first.expression) ||
          first.expression.text !== 'URL' ||
          !first.arguments?.[0] ||
          !ts.isStringLiteral(first.arguments[0]) ||
          first.arguments[1]?.getText(ast) !== 'import.meta.url' ||
          !moduleOption
        )
          throw new Error('[csp] unclassified Worker constructor');
        const target = resolve(first.arguments[0].text, file);
        workers.push(target);
        add(first.arguments[0].text, 'lexical-worker');
      }
      if (
        ts.isNewExpression(node) &&
        ts.isIdentifier(node.expression) &&
        node.expression.text === 'URL' &&
        node.arguments?.[0] &&
        ts.isStringLiteral(node.arguments[0]) &&
        /\.(?:wasm|woff2?)$/u.test(node.arguments[0].text)
      )
        add(node.arguments[0].text, 'bundle-url-asset');
      ts.forEachChild(node, visit);
    };
    visit(ast);
  }
  if (workers.length !== 1) throw new Error('[csp] expected one production lexical Worker entry');
  for (const file of files.filter(
    (file) => file.startsWith('client-assets/') && /\.(?:js|css)$/u.test(file),
  ))
    if (!owners.has(file))
      throw new Error('[csp] output script/CSS not accounted for by Vite graph');
  const assets = [];
  for (const [file, owner] of [...owners].sort(([a], [b]) => a.localeCompare(b))) {
    const bytes = await readFile(path.join(dist, file));
    assets.push({ file, owner, sha256: createHash('sha256').update(bytes).digest('hex') });
  }
  return {
    assets,
    worker: workers[0] ?? '',
    entryFile: assetFile(object(entries['src/client.ts'])['file']),
    clientManifestDigest: sha256(source),
  };
};

export const collectCspStageOne = async (
  dist: string,
  mediaOrigin: string | null = null,
  options: InventoryOptions = {},
): Promise<CspStageOneManifest> => {
  if (
    mediaOrigin !== null &&
    (new URL(mediaOrigin).origin !== mediaOrigin || !mediaOrigin.startsWith('https://'))
  )
    throw new Error('[csp] mediaOrigin must be an explicit HTTPS origin');
  const files = await filesUnder(dist);
  const documents: CspDocumentInventory[] = [];
  let siteOrigin: string | undefined;
  let basePath: string | undefined;
  let buildId: string | undefined;
  for (const file of files.filter((file) => file.endsWith('.html'))) {
    const html = await readFile(path.join(dist, file), 'utf8');
    const metadata = new Map<string, string>();
    const visit = (node: Node): void => {
      if ('tagName' in node && node.tagName === 'meta') {
        const attrs = new Map(node.attrs.map(({ name, value }) => [name, value]));
        metadata.set(attrs.get('name') ?? '', attrs.get('content') ?? '');
      }
      if ('childNodes' in node) node.childNodes.forEach(visit);
    };
    visit(parse(html));
    const origin = metadata.get('rouault-site-origin');
    const base = metadata.get('rouault-base-path') ?? '';
    const id = metadata.get('rouault-build-id');
    createSiteUrlContext({ siteOrigin: origin, basePath: base });
    if (
      !origin ||
      !id ||
      !/^[\w.-]+$/u.test(id) ||
      (siteOrigin && siteOrigin !== origin) ||
      (buildId && buildId !== id) ||
      (basePath !== undefined && basePath !== base)
    )
      throw new Error('[csp] inconsistent document build/site metadata');
    siteOrigin = origin;
    basePath = base;
    buildId = id;
    documents.push(inventoryCspDocument(html, file, `${origin}${base}/${file}`, { mediaOrigin }));
  }
  if (!siteOrigin || basePath === undefined || !buildId || !documents.length)
    throw new Error('[csp] no generated HTML');
  const context = { siteOrigin, mediaOrigin };
  const envelopes: CspDocumentInventory[] = [];
  for (const file of files.filter(
    (file) => file.startsWith('__router/') && file.endsWith('.router.json'),
  )) {
    const envelope = object(JSON.parse(await readFile(path.join(dist, file), 'utf8')));
    if (envelope['buildId'] !== buildId) throw new Error('[csp] envelope build mismatch');
    const body = object(envelope['document']);
    const shell = object(envelope['shell']);
    const fragments = [body['html'], shell['headerHtml']];
    if (fragments.some((fragment) => typeof fragment !== 'string'))
      throw new Error('[csp] envelope HTML missing');
    envelopes.push(
      inventoryCspDocument(
        fragments.join('\n'),
        file,
        `${siteOrigin}${basePath}/${file.slice('__router/'.length).replace(/\.router\.json$/u, '.html')}`,
        { mediaOrigin, fragment: true },
      ),
    );
  }
  const bundle = await inventoryBundles(dist, files, siteOrigin, basePath, options);
  const activeStylesheets = new Set(
    bundle.assets.filter(({ file }) => file.endsWith('.css')).map(({ file }) => file),
  );
  for (const resource of [...documents, ...envelopes].flatMap(({ resources }) => resources)) {
    if (resource.kind === 'style' && resource.origin === siteOrigin)
      activeStylesheets.add(decodeURIComponent(resource.pathname.slice(basePath.length + 1)));
  }
  const stylesheetResources: CspStageOneManifest['stylesheetResources'] = [];
  const scannedStylesheets = new Set<string>();
  for (const file of activeStylesheets) {
    if (scannedStylesheets.has(file)) continue;
    scannedStylesheets.add(file);
    const css = await readFile(path.join(dist, file), 'utf8');
    const candidates: readonly string[] = cssResourceUrls(css, `${siteOrigin}${basePath}/${file}`);
    for (const candidate of candidates) {
      const url: URL = new URL(candidate);
      stylesheetResources.push({
        file,
        ...classifyCspResource(url, cssResourceKind(url), 'stylesheet', context),
      });
      if (url.origin === siteOrigin && cssResourceKind(url) === 'style')
        activeStylesheets.add(decodeURIComponent(url.pathname.slice(basePath.length + 1)));
    }
  }
  const inactiveStylesheets: CspStageOneManifest['inactiveStylesheets'] = [];
  for (const file of files.filter(
    (file) => file.endsWith('.css') && !activeStylesheets.has(file),
  )) {
    if (!file.startsWith('assets/css/')) throw new Error('[csp] unclassified inactive stylesheet');
    const source = await readFile(path.resolve(dist, '../src', file));
    const output = await readFile(path.join(dist, file));
    if (!source.equals(output)) throw new Error('[csp] inactive stylesheet differs from source');
    inactiveStylesheets.push({
      file,
      sha256: createHash('sha256').update(output).digest('hex'),
      reason: 'verified-source-passthrough-not-referenced-by-document-envelope-or-Vite-graph',
    });
  }
  for (const document of documents) {
    const sources = document.executableSources;
    if (
      sources.length !== 1 ||
      sources[0]?.type !== 'module' ||
      sources[0].pathname !== `${basePath}/${bundle.entryFile}`
    )
      throw new Error('[csp] unexpected executable script/src owner');
  }
  if (envelopes.some((envelope) => envelope.executableSources.length))
    throw new Error('[csp] executable script/src in envelope');
  const emitted = new Set(files);
  let mediaAliases: CspMediaAlias[] | undefined;
  const graph = new Set(bundle.assets.map(({ file }) => file));
  for (const resource of [
    ...documents.flatMap(({ resources }) => resources),
    ...envelopes.flatMap(({ resources }) => resources),
    ...stylesheetResources,
  ]) {
    if (resource.origin !== siteOrigin) continue;
    if (!resource.pathname.startsWith(`${basePath}/`))
      throw new Error('[csp] resource outside hosting base');
    const file = decodeURIComponent(resource.pathname.slice(basePath.length + 1));
    if (!emitted.has(file)) {
      if (!file.startsWith('media/media-v2/'))
        throw new Error(`[csp] resource absent from final output: ${file}`);
      mediaAliases ??= await loadMediaAliases(dist);
      const alias = mediaAliases.find((alias) => alias.file === file);
      if (!alias) throw new Error('[csp] media URL missing from approved media object manifest');
      if (!bundle.assets.some((asset) => asset.file === file))
        bundle.assets.push({
          file,
          sha256: alias.sha256,
          owner: 'validated-media-object-manifest',
        });
      continue;
    }
    if (resource.kind === 'script' && !graph.has(file))
      throw new Error('[csp] executable resource outside Vite graph');
    if (resource.kind === 'style' && !graph.has(file)) {
      if (!file.startsWith('assets/css/')) throw new Error('[csp] unowned stylesheet');
      // Eleventyの既存passthrough資産はprefixだけで承認せず、sourceとのbytes一致まで照合する。
      const source = await readFile(path.resolve(dist, '../src', file));
      const output = await readFile(path.join(dist, file));
      if (!source.equals(output)) throw new Error('[csp] copied stylesheet differs from source');
    }
    if (!bundle.assets.some((asset) => asset.file === file)) {
      const bytes = await readFile(path.join(dist, file));
      bundle.assets.push({
        file,
        sha256: createHash('sha256').update(bytes).digest('hex'),
        owner: resource.reason,
      });
    }
  }
  for (const file of files.filter(
    (file) =>
      file.startsWith('search/') ||
      file === 'search-catalog.json' ||
      file === 'assets/internal-document-routes.json',
  )) {
    const bytes = await readFile(path.join(dist, file));
    bundle.assets.push({
      file,
      sha256: createHash('sha256').update(bytes).digest('hex'),
      owner: 'validated-router-search-runtime-contract',
    });
  }
  bundle.assets.sort((a, b) => a.file.localeCompare(b.file));
  const hashOwners: CspStageOneManifest['hashOwners'] = [
    { owner: 'theme-document', hash: documents[0]?.inlineScriptHashes[0] ?? '' },
    { owner: 'theme-chrome', hash: documents[0]?.inlineScriptHashes[1] ?? '' },
  ];
  const model = createDocumentPolicy(
    hashOwners.map(({ hash }) => hash),
    mediaOrigin,
  );
  const policy = serializeCspPolicy(model);
  const rules: CspStageOneManifest['rules'] = [
    { pattern: `${basePath}/*`, policy, context: 'document' },
  ];
  rules.push({
    pattern: `${basePath}/${bundle.worker}`,
    policy: serializeCspPolicy(WORKER_POLICY),
    context: 'worker',
    reset: true,
  });
  return {
    schema: 2,
    mode: 'report-only',
    policyVersion: CSP_POLICY_VERSION,
    policyDigest: policyDigest(model, { siteOrigin, basePath }),
    buildId,
    siteOrigin,
    basePath,
    mediaOrigin,
    hashOwners,
    documents,
    envelopes,
    stylesheetResources,
    inactiveStylesheets,
    assets: bundle.assets,
    clientManifestDigest: bundle.clientManifestDigest,
    mediaAliases: mediaAliases ?? [],
    rules,
    runtimeContracts: [
      {
        owner: 'router',
        permission: "connect-src 'self'",
        reason: 'validated-document-envelope-and-route-manifest',
      },
      {
        owner: 'search',
        permission: "connect-src 'self'",
        reason: 'validated-lexical-artifacts-and-catalog-fallback',
      },
      {
        owner: 'search-worker',
        permission: "connect-src blob:; script-src 'wasm-unsafe-eval'",
        reason: 'verified-WASM-bytes-Suzume-create-wasmPath',
      },
      {
        owner: 'preview',
        permission: 'none-adopted',
        reason: 'Stage-0-runner-profile-deferred; legacy-srcdoc-is-known-RO-violation',
      },
    ],
  };
};

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { parseInternalDocumentRouteManifest } from '../../shared/navigation/internal-document-route-manifest.js';
import { resolveRouterArtifactStoragePathname } from '../../shared/navigation/router-artifact-path.js';
import { parseLexicalManifest } from '../../shared/search/lexical-artifacts.js';
import { filesUnder, type CspStageOneManifest } from './csp-inventory.js';
import { assertPreviewFileSet, previewDigest, type PreviewFile } from './csp-preview-artifact.js';

const equalSet = (a: readonly string[], b: readonly string[]): boolean =>
  a.length === b.length && new Set(a).size === a.length && a.every((item) => b.includes(item));

export const previewPublicationFiles = (publicRoutes: readonly string[]) => {
  const storage = publicRoutes.map(resolveRouterArtifactStoragePathname);
  return {
    html: [
      '404.html',
      ...storage.map((route) => `${decodeURIComponent(route.slice(1))}index.html`),
    ],
    envelopes: storage.map((route) => `__router${route}index.router.json`),
  };
};
export const assertPreviewPublication = (
  manifest: CspStageOneManifest,
  publicRoutes: readonly string[],
): void => {
  const { html, envelopes } = previewPublicationFiles(publicRoutes);
  if (
    !equalSet(
      manifest.documents.map(({ file }) => file),
      html,
    ) ||
    !equalSet(
      manifest.envelopes.map(({ file }) => file),
      envelopes,
    )
  )
    throw new Error('[preview] private/unknown document or missing envelope');
};

export const validatePreviewRedirects = (source: string): void => {
  const accepted = [
    '/notes/* /notes/:splat/ 200',
    '/memos/* /memos/:splat/ 200',
    '/about /about/ 200',
    '/corpora /corpora/ 200',
    '/corpora/* /corpora/:splat/ 200',
    '/search /search/ 200',
    '/tags/* /tags/:splat/ 200',
  ];
  if (!equalSet(source.trim().split(/\r?\n/u), accepted))
    throw new Error(
      '[preview] unsupported redirect/rewrite; static headers cannot prove this response',
    );
};

// 公開route集合とsource-owned passthroughに限定し、manifest内の自己申告だけではファイルを承認しない。
export const validatePreviewSourceFiles = async (
  repo: string,
  manifest: CspStageOneManifest,
  files: readonly PreviewFile[],
  publicRoutes: readonly string[],
): Promise<void> => {
  const dist = path.join(repo, 'dist');
  const routes = parseInternalDocumentRouteManifest(
    JSON.parse(await readFile(path.join(dist, 'assets/internal-document-routes.json'), 'utf8')),
  );
  if (
    routes.siteOrigin !== manifest.siteOrigin ||
    routes.basePath !== manifest.basePath ||
    routes.buildId !== manifest.buildId ||
    !equalSet(routes.routes, publicRoutes)
  )
    throw new Error('[preview] route publication/origin/build mismatch');
  const { html, envelopes } = previewPublicationFiles(publicRoutes);
  assertPreviewPublication(manifest, publicRoutes);
  const allowed = new Set([
    ...html,
    ...envelopes,
    '_headers',
    '_redirects',
    'assets/internal-document-routes.json',
    'search-catalog.json',
    'search/manifest.json',
  ]);
  const lexical = parseLexicalManifest(
    JSON.parse(await readFile(path.join(dist, 'search/manifest.json'), 'utf8')),
  );
  for (const descriptor of [
    lexical.documentIndex,
    lexical.passageIndex,
    lexical.passageStore,
    lexical.providerArtifact,
    lexical.providerConfig,
  ])
    allowed.add(descriptor.path.slice(1));
  const licenses = files.filter(({ file }) =>
    /^search\/(?:suzume|minisearch)-LICENSE\.[a-f0-9]{64}\.txt$/u.test(file),
  );
  if (licenses.length !== 2) throw new Error('[preview] missing runtime licenses');
  for (const { file } of licenses) allowed.add(file);
  for (const { file } of manifest.assets) {
    if (
      /^client-assets\/[\w.-]+\.(?:js|css|wasm|woff2?)$/u.test(file) ||
      /^assets\/fonts\/[\w./-]+\.woff2?$/u.test(file)
    )
      allowed.add(file);
  }
  for (const [input, output] of [
    ['src/assets', 'assets'],
    ['examples/media', 'example-assets'],
  ] as const) {
    for (const file of await filesUnder(path.join(repo, input))) {
      if (!/\.(?:css|ico|png|jpe?g|svg|gif|webp|avif|woff2?|vtt|mp4|webm|mp3|ogg)$/u.test(file))
        throw new Error('[preview] unsupported public passthrough');
      const name = `${output}/${file}`;
      const bytes = await readFile(path.join(repo, input, file));
      if (previewDigest(bytes) !== files.find(({ file }) => file === name)?.sha256)
        throw new Error('[preview] passthrough identity mismatch');
      allowed.add(name);
    }
  }
  const favicon = await readFile(path.join(repo, 'src/assets/favicon.ico'));
  if (previewDigest(favicon) !== files.find(({ file }) => file === 'favicon.ico')?.sha256)
    throw new Error('[preview] favicon identity mismatch');
  allowed.add('favicon.ico');
  assertPreviewFileSet(files, allowed);
  const redirects = await readFile(path.join(dist, '_redirects'), 'utf8');
  validatePreviewRedirects(redirects);
  if (
    redirects !== (await readFile(path.join(repo, '_redirects'), 'utf8')) ||
    (await readFile(path.join(dist, '_headers'), 'utf8')) !==
      (await readFile(path.join(repo, '_headers'), 'utf8'))
  )
    throw new Error('[preview] baseline delivery settings differ from source');
};

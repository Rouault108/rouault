import { parse, type DefaultTreeAdapterMap } from 'parse5';
import { resolveContentRoute } from '../../build/content/content-route-registry.js';
import { parseInternalDocumentRouteManifest } from '../../shared/navigation/internal-document-route-manifest.js';
import { createSiteUrlContext } from '../../shared/site/site-url-context.js';
import { resolveRouterArtifactPathname } from '../../shared/navigation/router-artifact-path.js';
import { buildTagPageDocumentRoute } from '../../shared/search/tag-page-route.js';
import { collectFinalHeadingIds } from './validate-candidate.js';
import { hashBytes } from './source-snapshot.js';
import type { PublicationPorts } from './publish-snapshot.js';
export interface VerifiedDeploymentProof {
  repository: 'Rouault108/rouault';
  commitSha: string;
  event: string;
  branch: string;
  deploymentId: string;
  jobs: {
    deploy: 'success' | 'failure' | 'skipped';
    verification: 'success' | 'failure' | 'skipped';
  };
  expectedFiles: ReadonlyMap<string, Uint8Array>;
  media: readonly { url: string; hash: string; contentType: string }[];
}
class UnavailableDeploymentObservation extends Error {}
const imageReferences = (html: string): string[] => {
  const references = new Set<string>();
  const walk = (node: DefaultTreeAdapterMap['node'], inArticle = false): void => {
    if ('tagName' in node) {
      const inside =
        inArticle ||
        node.attrs.some(
          (attr) => attr.name === 'data-hydration-scope' && attr.value === 'note-content',
        );
      if (inside && ['img', 'source'].includes(node.tagName))
        for (const attr of node.attrs) {
          if (attr.name === 'src') references.add(attr.value);
          if (attr.name === 'srcset')
            for (const value of attr.value.split(','))
              references.add(value.trim().split(/\s+/u)[0] ?? '');
        }
      if ('childNodes' in node)
        node.childNodes.forEach((child) => {
          walk(child, inside);
        });
    } else if ('childNodes' in node)
      node.childNodes.forEach((child) => {
        walk(child, inArticle);
      });
  };
  walk(parse(html));
  return [...references].filter((url) => url && !url.startsWith('data:'));
};
export const createMemoDeploymentVerifier = (options: {
  readVerifiedProof: (commitSha: string) => Promise<VerifiedDeploymentProof | null>;
  siteOrigin: string;
  basePath: string;
  allowedMediaOrigins: readonly string[];
  timeoutMs: number;
  maxResponseBytes: number;
  fetch?: typeof fetch;
}): PublicationPorts['verifyDeployment'] => {
  if (
    ![options.timeoutMs, options.maxResponseBytes].every(
      (value) => Number.isSafeInteger(value) && value > 0,
    )
  )
    throw new Error('[deployment] verified HTTP resource limits required');
  const context = createSiteUrlContext({
    siteOrigin: options.siteOrigin,
    basePath: options.basePath,
  });
  const request = options.fetch ?? fetch;
  const allowed = new Set([context.siteOrigin, ...options.allowedMediaOrigins]);
  const read = async (
    url: URL,
  ): Promise<{ status: number; bytes: Uint8Array; contentType: string }> => {
    if (
      !allowed.has(url.origin) ||
      url.username ||
      url.password ||
      !['http:', 'https:'].includes(url.protocol)
    )
      throw new Error('[deployment] URL outside verified origins');
    const signal = AbortSignal.timeout(options.timeoutMs);
    let response: Response;
    try {
      response = await request(url, { redirect: 'manual', cache: 'no-store', signal });
      for (let hop = 0; [301, 302, 303, 307, 308].includes(response.status); hop += 1) {
        const location = response.headers.get('location');
        if (!location || hop >= 3) throw new UnavailableDeploymentObservation();
        const target = new URL(location, url);
        if (
          !allowed.has(target.origin) ||
          target.username ||
          target.password ||
          !['http:', 'https:'].includes(target.protocol)
        )
          throw new UnavailableDeploymentObservation();
        await response.body?.cancel();
        url = target;
        response = await request(url, { redirect: 'manual', cache: 'no-store', signal });
      }
    } catch {
      throw new UnavailableDeploymentObservation();
    }
    const reader = response.body?.getReader();
    const chunks: Uint8Array[] = [];
    let count = 0;
    if (reader)
      try {
        let part = await reader.read();
        while (!part.done) {
          count += part.value.length;
          if (count > options.maxResponseBytes) throw new UnavailableDeploymentObservation();
          chunks.push(part.value);
          part = await reader.read();
        }
      } catch {
        throw new UnavailableDeploymentObservation();
      } finally {
        await reader.cancel();
      }
    return {
      status: response.status,
      bytes: Buffer.concat(chunks),
      contentType: response.headers.get('content-type')?.split(';')[0]?.trim() ?? '',
    };
  };
  return async (commitSha, plan) => {
    if (!/^[a-f0-9]{40}$/u.test(commitSha)) return { deploymentId: '', status: 'unknown' };
    let proof: VerifiedDeploymentProof | null;
    try {
      proof = await options.readVerifiedProof(commitSha);
    } catch {
      return { deploymentId: '', status: 'unknown' };
    }
    if (
      proof?.repository !== 'Rouault108/rouault' ||
      proof.commitSha !== commitSha ||
      proof.event !== 'push' ||
      proof.branch !== 'main' ||
      !proof.deploymentId
    )
      return { deploymentId: '', status: 'unknown' };
    if (proof.jobs.deploy !== 'success' || proof.jobs.verification !== 'success')
      return {
        deploymentId: proof.deploymentId,
        status:
          proof.jobs.deploy === 'failure' || proof.jobs.verification === 'failure'
            ? 'failed'
            : 'unknown',
      };
    const file = async (name: string, pathname: string, mime: string): Promise<Uint8Array> => {
      const expected = proof.expectedFiles.get(name);
      if (!expected) throw new Error('[deployment] authenticated artifact missing');
      const actual = await read(new URL(context.basePath + pathname, context.siteOrigin));
      if (
        actual.status !== 200 ||
        actual.contentType !== mime ||
        hashBytes(actual.bytes) !== hashBytes(expected)
      )
        throw new Error('[deployment] served artifact differs from successful deployment');
      return actual.bytes;
    };
    try {
      const manifestBytes = await file(
        'assets/internal-document-routes.json',
        '/assets/internal-document-routes.json',
        'application/json',
      );
      const manifest = parseInternalDocumentRouteManifest(
        JSON.parse(Buffer.from(manifestBytes).toString('utf8')),
      );
      if (
        manifest.siteOrigin !== context.siteOrigin ||
        manifest.basePath !== context.basePath ||
        manifest.buildLabel !== commitSha.slice(0, 7)
      )
        throw new Error('[deployment] served revision context differs');
      await file('memos/index.html', '/memos/', 'text/html');
      await file('index.html', '/', 'text/html');
      const catalog = JSON.parse(
        Buffer.from(
          await file('search-catalog.json', '/search-catalog.json', 'application/json'),
        ).toString('utf8'),
      ) as unknown;
      if (
        !Array.isArray(catalog) ||
        catalog.some(
          (item: unknown) =>
            typeof item === 'object' &&
            item !== null &&
            'canonicalPathname' in item &&
            typeof item.canonicalPathname === 'string' &&
            item.canonicalPathname.startsWith('/memos/'),
        )
      )
        throw new Error('[deployment] memo adopted by ordinary search');
      for (const route of manifest.routes)
        if (route.startsWith('/tags/') || route.startsWith('/corpora/')) {
          const output = route.startsWith('/tags/')
            ? buildTagPageDocumentRoute(
                decodeURIComponent(route.slice('/tags/'.length).replace(/\/$/u, '')),
              ).outputPath
            : `${decodeURI(route).replace(/^\//u, '').replace(/\/$/u, '')}/index.html`;
          await file(output, route, 'text/html');
        }
      for (const entry of Object.values(plan.entries)) {
        const route = resolveContentRoute({
          collectionId: 'memos',
          sourceRelativePath: entry.publicPath.slice('content/memos/'.length),
        });
        const artifactPath = resolveRouterArtifactPathname(route.canonicalPathname);
        if (entry.status === 'withdrawn') {
          if (manifest.routes.includes(route.canonicalPathname))
            throw new Error('[deployment] withdrawn route remains');
          for (const pathname of [route.canonicalPathname, artifactPath])
            if (
              ![404, 410].includes(
                (await read(new URL(context.basePath + pathname, context.siteOrigin))).status,
              )
            )
              throw new Error('[deployment] withdrawn page remains reachable');
          continue;
        }
        if (!manifest.routes.includes(route.canonicalPathname))
          throw new Error('[deployment] target route missing');
        const html = Buffer.from(
          await file(route.outputPath, route.canonicalPathname, 'text/html'),
        ).toString('utf8');
        if (
          JSON.stringify(collectFinalHeadingIds(html)) !==
          JSON.stringify(Object.keys(entry.headingMap))
        )
          throw new Error('[deployment] served headings differ from approved map');
        const navigation: unknown = JSON.parse(
          Buffer.from(
            await file(
              '__router/' + route.outputPath.replace(/\.html$/u, '.router.json'),
              artifactPath,
              'application/json',
            ),
          ).toString('utf8'),
        );
        if (
          typeof navigation !== 'object' ||
          navigation === null ||
          !('buildId' in navigation) ||
          navigation.buildId !== manifest.buildId
        )
          throw new Error('[deployment] navigation build differs');
        for (const reference of imageReferences(html)) {
          const url = new URL(
            reference,
            new URL(context.basePath + route.canonicalPathname, context.siteOrigin),
          );
          const media = proof.media.find((item) => item.url === url.href);
          if (media) {
            const actual = await read(url);
            if (
              actual.status !== 200 ||
              actual.contentType !== media.contentType ||
              hashBytes(actual.bytes) !== media.hash
            )
              throw new Error('[deployment] served media differs');
          } else {
            if (
              url.origin !== context.siteOrigin ||
              !url.pathname.startsWith(context.basePath + '/')
            )
              throw new Error('[deployment] unverified image URL');
            const name = decodeURI(url.pathname.slice(context.basePath.length + 1));
            const expected = proof.expectedFiles.get(name);
            if (!expected) throw new Error('[deployment] image artifact missing');
            const actual = await read(url);
            if (actual.status !== 200 || hashBytes(actual.bytes) !== hashBytes(expected))
              throw new Error('[deployment] image differs');
          }
        }
      }
      return { deploymentId: proof.deploymentId, status: 'verified' };
    } catch (error) {
      return {
        deploymentId: proof.deploymentId,
        status: error instanceof UnavailableDeploymentObservation ? 'unknown' : 'failed',
      };
    }
  };
};

import {
  parseLexicalManifest,
  sha256,
  decodeArtifact,
  verifyArtifact,
  LEXICAL_COMPATIBILITY,
  type LexicalManifest,
  type ArtifactDescriptor,
} from '../../../shared/search/lexical-artifacts.js';
import {
  LexicalFailure,
  LEXICAL_TIMEOUTS,
  type LexicalContext,
} from '../../../shared/search/lexical-protocol.js';

export function resolveLexicalArtifact(context: LexicalContext, path: string): string {
  try {
    const origin = new URL(context.siteOrigin);
    if (
      !['http:', 'https:'].includes(origin.protocol) ||
      origin.origin !== context.siteOrigin ||
      origin.username ||
      origin.password
    )
      throw new Error('Invalid site origin');
    if (context.basePath && !/^\/(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_-]+$/u.test(context.basePath))
      throw new Error('Invalid basePath');
    if (
      !path.startsWith('/') ||
      path.startsWith('//') ||
      /[?#\\]/u.test(path) ||
      Array.from(path).some((char) => char.charCodeAt(0) <= 32) ||
      /%2f|%5c/iu.test(path)
    )
      throw new Error('Invalid artifact path');
    const decoded = decodeURIComponent(path);
    if (
      /[\\?#]/u.test(decoded) ||
      Array.from(decoded).some((char) => char.charCodeAt(0) <= 32) ||
      decoded
        .slice(1)
        .split('/')
        .some((part) => !part || part === '.' || part === '..') ||
      (context.basePath && path.startsWith(context.basePath + '/'))
    )
      throw new Error('Invalid artifact segments');
    return new URL(context.basePath + path, origin).href;
  } catch {
    throw new LexicalFailure('lexical-load-failed', 'validate', 'Unsafe artifact URL');
  }
}
export async function manifestIdentity(manifest: LexicalManifest): Promise<string> {
  return sha256(
    new TextEncoder().encode(
      JSON.stringify({
        schemaVersion: manifest.schemaVersion,
        buildId: manifest.buildId,
        engine: manifest.engine,
        engineVersion: manifest.engineVersion,
        indexOptionsId: manifest.indexOptionsId,
        indexOptionsSha256: manifest.indexOptionsSha256,
        analyzerPolicyId: manifest.analyzerPolicyId,
        rankingProfileId: manifest.rankingProfileId,
        exactRulesSha256: manifest.exactRulesSha256,
        providerVersion: manifest.providerVersion,
        providerConfigSha256: manifest.providerConfigSha256,
        providerArtifactSha256: manifest.providerArtifactSha256,
        documentIndexSha256: manifest.documentIndexSha256,
        passageIndexSha256: manifest.passageIndexSha256,
        passageStoreSha256: manifest.passageStoreSha256,
      }),
    ),
  );
}
export type ArtifactFetch = (url: string, init: RequestInit) => Promise<Response>;
export async function fetchArtifact(
  url: string,
  signal: AbortSignal,
  milliseconds: number,
  expected?: ArtifactDescriptor,
  fetcher: ArtifactFetch = fetch,
): Promise<Uint8Array> {
  signal.throwIfAborted();
  const controller = new AbortController();
  const deadline = performance.now() + Math.max(0, milliseconds);
  const checkDeadline = (): void => {
    controller.signal.throwIfAborted();
    // background環境でtimer callbackが遅れても、期限後のbodyを成功として採用しない。
    if (performance.now() >= deadline)
      throw new LexicalFailure('lexical-timeout', 'fetch', 'Artifact deadline');
  };
  const abort = (): void => {
    controller.abort(signal.reason);
  };
  signal.addEventListener('abort', abort, { once: true });
  const timer = setTimeout(
    () => {
      controller.abort(new LexicalFailure('lexical-timeout', 'fetch', 'Artifact deadline'));
    },
    Math.max(0, milliseconds),
  );
  try {
    const response = await fetcher(url, {
      signal: controller.signal,
      credentials: 'same-origin',
      redirect: 'manual',
    });
    if (!response.ok || response.redirected || response.type === 'opaqueredirect')
      throw new LexicalFailure('lexical-load-failed', 'fetch', 'Artifact HTTP failure');
    const bytes = new Uint8Array(await response.arrayBuffer());
    checkDeadline();
    if (expected) {
      try {
        await verifyArtifact(bytes, expected);
      } catch {
        throw new LexicalFailure('lexical-load-failed', 'validate', 'Artifact hash mismatch');
      }
    }
    checkDeadline();
    return bytes;
  } catch (error: unknown) {
    signal.throwIfAborted();
    if (controller.signal.aborted) throw controller.signal.reason;
    if (error instanceof LexicalFailure) throw error;
    throw new LexicalFailure('lexical-load-failed', 'fetch', 'Artifact fetch failure');
  } finally {
    clearTimeout(timer);
    signal.removeEventListener('abort', abort);
  }
}
export async function loadLexicalManifest(
  context: LexicalContext,
  signal: AbortSignal,
  fetcher: ArtifactFetch = fetch,
) {
  const bytes = await fetchArtifact(
    resolveLexicalArtifact(context, '/search/manifest.json'),
    signal,
    LEXICAL_TIMEOUTS.artifactFetch,
    undefined,
    fetcher,
  );
  try {
    const manifest = parseLexicalManifest(decodeArtifact(bytes));
    return {
      manifest,
      manifestSha: await sha256(bytes),
      identity: await manifestIdentity(manifest),
    };
  } catch {
    throw new LexicalFailure(
      'lexical-load-failed',
      'validate',
      `Invalid manifest ${String(LEXICAL_COMPATIBILITY.schemaVersion)}`,
    );
  }
}

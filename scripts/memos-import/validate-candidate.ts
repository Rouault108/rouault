import { spawn } from 'node:child_process';
import { mkdtemp, mkdir, readFile, writeFile, symlink, rm } from 'node:fs/promises';
import path from 'node:path';
import { parse, type DefaultTreeAdapterMap } from 'parse5';
import { assertSafeContentPath } from '../../build/content/content-record.js';
import { resolveContentRoute } from '../../build/content/content-route-registry.js';
import { createPnpmInvocation } from '../run-build-process.js';
import { parseInternalDocumentRouteManifest } from '../../shared/navigation/internal-document-route-manifest.js';
import { assertSnapshot, hashBytes } from './source-snapshot.js';
import type { ImportPlan, Snapshot } from './model.js';
type HtmlNode = DefaultTreeAdapterMap['node'];
export const collectFinalHeadingIds = (html: string): string[] => {
  const result: string[] = [];
  const walk = (node: HtmlNode, inArticle = false): void => {
    if ('tagName' in node) {
      if (node.tagName === 'header') return;
      if (node.attrs.some((attr) => ['data-link-card', 'data-syntax-card'].includes(attr.name)))
        return;
      const inside =
        inArticle ||
        node.attrs.some(
          (attr) => attr.name === 'data-hydration-scope' && attr.value === 'note-content',
        );
      if (inside && /^h[1-6]$/u.test(node.tagName)) {
        const id = node.attrs.find((attr) => attr.name === 'id')?.value;
        if (!id) throw new Error('[candidate] heading ID missing');
        if (!(node.tagName === 'h2' && id === 'footnote-label')) result.push(id);
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
  return result;
};
const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
export const validateCandidateArtifacts = async (
  plan: ImportPlan,
  outputDirectory: string,
): Promise<void> => {
  const manifest = parseInternalDocumentRouteManifest(
    JSON.parse(
      await readFile(path.join(outputDirectory, 'assets/internal-document-routes.json'), 'utf8'),
    ),
  );
  const routes = new Set<string>(manifest.routes);
  for (const entry of Object.values(plan.entries)) {
    const route = resolveContentRoute({
      collectionId: 'memos',
      sourceRelativePath: entry.publicPath.slice('content/memos/'.length),
    });
    if (entry.status === 'withdrawn') {
      if (routes.has(route.canonicalPathname))
        throw new Error('[candidate] withdrawn route remains');
      for (const name of [
        route.outputPath,
        '__router/' + route.outputPath.replace(/\.html$/u, '.router.json'),
      ]) {
        try {
          await readFile(path.join(outputDirectory, name));
        } catch (error) {
          if (
            typeof error === 'object' &&
            error !== null &&
            'code' in error &&
            error.code === 'ENOENT'
          )
            continue;
          throw error;
        }
        throw new Error('[candidate] withdrawn artifact remains');
      }
      continue;
    }
    if (!routes.has(route.canonicalPathname)) throw new Error('[candidate] adopted route missing');
    const html = await readFile(path.join(outputDirectory, route.outputPath), 'utf8');
    const ids = collectFinalHeadingIds(html);
    if (JSON.stringify(ids) !== JSON.stringify(Object.keys(entry.headingMap)))
      throw new Error('[candidate] final HTML anchor map differs');
    const artifact: unknown = JSON.parse(
      await readFile(
        path.join(
          outputDirectory,
          '__router',
          route.outputPath.replace(/\.html$/u, '.router.json'),
        ),
        'utf8',
      ),
    );
    if (!record(artifact) || artifact['buildId'] !== manifest.buildId)
      throw new Error('[candidate] navigation build identity differs');
  }
};
const runRequiredScript = (
  cwd: string,
  script: 'verify' | 'build:production',
  env: NodeJS.ProcessEnv,
): Promise<void> =>
  new Promise((resolve, reject) => {
    const invocation = createPnpmInvocation({
      env,
      platform: process.platform,
      nodeExecPath: process.execPath,
      pnpmArgs: ['run', script],
    });
    const child = spawn(invocation.command, [...invocation.args], {
      cwd,
      env,
      stdio: 'inherit',
      ...(invocation.windowsVerbatimArguments ? { windowsVerbatimArguments: true } : {}),
    });
    child.once('error', reject);
    child.once('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`[candidate] required ${script} failed`));
    });
  });
export const validateIsolatedCandidate = async (
  plan: ImportPlan,
  base: Snapshot,
  options: {
    privateWorkDirectory: string;
    nodeModulesDirectory: string;
    environment: NodeJS.ProcessEnv;
  },
): Promise<void> => {
  assertSnapshot(base);
  // vault/台帳を展開せず、公開repositoryの固定snapshotと承認差分だけを隔離する。
  const directory = await mkdtemp(path.join(options.privateWorkDirectory, 'rouault-candidate-'));
  try {
    const candidate = new Map(base.files);
    for (const name of plan.deletes) candidate.delete(name);
    for (const [name, bytes] of plan.writes) candidate.set(name, { mode: '100644', bytes });
    for (const [name, file] of candidate) {
      assertSafeContentPath(name);
      if (name.startsWith('.git/') || name.startsWith('node_modules/') || file.mode === '120000')
        throw new Error('[candidate] unsafe repository file');
      const target = path.join(directory, name);
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, file.bytes, { mode: file.mode === '100755' ? 0o755 : 0o644 });
    }
    for (const [name, hash] of Object.entries(plan.manifest.files))
      if (hashBytes(await readFile(path.join(directory, name))) !== hash)
        throw new Error('[candidate] owned output mismatch');
    await symlink(
      path.resolve(options.nodeModulesDirectory),
      path.join(directory, 'node_modules'),
      process.platform === 'win32' ? 'junction' : 'dir',
    );
    const env = {
      ...options.environment,
      CI: 'true',
      GITHUB_SHA: base.sha,
      ROUAULT_SITE_ORIGIN: 'http://127.0.0.1:4173',
      ROUAULT_BASE_PATH: '',
    };
    await runRequiredScript(directory, 'verify', env);
    await runRequiredScript(directory, 'build:production', env);
    await validateCandidateArtifacts(plan, path.join(directory, 'dist'));
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
};

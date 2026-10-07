import { mkdtemp, rm, realpath } from 'node:fs/promises';
import path from 'node:path';
import { assertSafeContentPath } from '../../build/content/content-record.js';
import type { Snapshot } from './model.js';
import type { PrivateCommand } from './private-command.js';
export interface RepositoryIdentity {
  repository: string;
  private: boolean;
  branch: string;
}
export interface GitTreeEntry {
  path: string;
  mode: '100644' | '100755';
  blobSha: string;
}
export const assertCommitSha = (sha: string): void => {
  if (!/^[a-f0-9]{40}$/u.test(sha)) throw new Error('[transport] pinned commit required');
};
export const readGitHubRepositoryIdentity = async (
  command: PrivateCommand,
  repository: string,
): Promise<RepositoryIdentity> => {
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/u.test(repository))
    throw new Error('[transport] repository identity required');
  const value: unknown = JSON.parse(
    (await command('gh', ['api', `repos/${repository}`])).toString('utf8'),
  );
  if (
    typeof value !== 'object' ||
    value === null ||
    !('full_name' in value) ||
    !('private' in value) ||
    !('default_branch' in value) ||
    value.full_name !== repository ||
    typeof value.private !== 'boolean' ||
    value.default_branch !== 'main'
  )
    throw new Error('[transport] verified repository identity mismatch');
  return { repository, private: value.private, branch: 'main' };
};
export class GitTreeRepository {
  constructor(
    private readonly gitDirectory: string,
    private readonly command: PrivateCommand,
    private readonly expectedIdentity: RepositoryIdentity,
    private readonly probeIdentity: () => Promise<RepositoryIdentity>,
    private readonly author: { name: string; email: string },
  ) {
    if (
      !path.isAbsolute(gitDirectory) ||
      expectedIdentity.branch !== 'main' ||
      !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/u.test(expectedIdentity.repository) ||
      !author.name.trim() ||
      !author.email.trim() ||
      /[\r\n\0]/u.test(author.name + author.email)
    )
      throw new Error('[transport] explicit private Git directory and actor required');
  }
  git(
    args: readonly string[],
    input?: Uint8Array,
    environment?: NodeJS.ProcessEnv,
  ): Promise<Buffer> {
    return this.command('git', ['--git-dir', this.gitDirectory, ...args], input, environment);
  }
  async assertPrivateRoot(root: string, publicDirectory: string): Promise<void> {
    const directory = await realpath(this.gitDirectory);
    if (
      !directory.startsWith(root + path.sep) ||
      directory === publicDirectory ||
      directory.startsWith(publicDirectory + path.sep)
    )
      throw new Error('[transport] Git store outside private work root');
  }
  async identity(): Promise<RepositoryIdentity> {
    const actual = await this.probeIdentity();
    if (
      actual.repository !== this.expectedIdentity.repository ||
      actual.private !== this.expectedIdentity.private ||
      actual.branch !== this.expectedIdentity.branch
    )
      throw new Error('[transport] repository identity changed');
    if ((await this.git(['rev-parse', '--is-bare-repository'])).toString('utf8').trim() !== 'true')
      throw new Error('[transport] private bare Git store required');
    const remote = (await this.git(['remote', 'get-url', 'origin'])).toString('utf8').trim();
    const repo = this.expectedIdentity.repository;
    if (
      ![
        `https://github.com/${repo}`,
        `https://github.com/${repo}.git`,
        `git@github.com:${repo}.git`,
      ].includes(remote)
    )
      throw new Error('[transport] origin does not match verified repository');
    return actual;
  }
  async head(): Promise<string> {
    await this.identity();
    await this.git(['fetch', '--no-tags', '--no-recurse-submodules', 'origin', 'refs/heads/main']);
    const sha = (await this.git(['rev-parse', 'FETCH_HEAD'])).toString('utf8').trim();
    assertCommitSha(sha);
    return sha;
  }
  async tree(sha: string): Promise<readonly GitTreeEntry[]> {
    assertCommitSha(sha);
    if ((await this.git(['cat-file', '-t', sha])).toString('utf8').trim() !== 'commit')
      throw new Error('[transport] commit unavailable');
    const result: GitTreeEntry[] = [];
    const compatible = new Set<string>();
    for (const line of (await this.git(['ls-tree', '-rz', sha]))
      .toString('utf8')
      .split('\0')
      .filter(Boolean)) {
      const tab = line.indexOf('\t');
      const parts = line.slice(0, tab).split(' ');
      const name = line.slice(tab + 1);
      assertSafeContentPath(name);
      const key = name.normalize('NFC').toLowerCase();
      if (
        tab < 0 ||
        parts[1] !== 'blob' ||
        !['100644', '100755'].includes(parts[0] ?? '') ||
        compatible.has(key)
      )
        throw new Error('[transport] unsupported or ambiguous Git tree');
      compatible.add(key);
      const blobSha = parts[2] ?? '';
      assertCommitSha(blobSha);
      result.push({ path: name, mode: parts[0] as GitTreeEntry['mode'], blobSha });
    }
    return result;
  }
  readBlob(entry: GitTreeEntry): Promise<Buffer> {
    assertCommitSha(entry.blobSha);
    return this.git(['cat-file', 'blob', entry.blobSha]);
  }
  async snapshot(
    sha: string,
    include: (entry: GitTreeEntry) => boolean = () => true,
  ): Promise<Snapshot> {
    const files = new Map<string, { mode: '100644' | '100755'; bytes: Uint8Array }>();
    for (const entry of await this.tree(sha))
      if (include(entry))
        files.set(entry.path, { mode: entry.mode, bytes: await this.readBlob(entry) });
    return { sha, complete: true, files };
  }
  async commit(
    expectedHead: string,
    files: ReadonlyMap<string, Uint8Array>,
    deletes: readonly string[],
    allowed: (name: string) => boolean,
    message: string,
  ): Promise<string> {
    assertCommitSha(expectedHead);
    if ((await this.head()) !== expectedHead)
      throw new Error('[transport] repository head conflict');
    if (new Set(deletes).size !== deletes.length || deletes.some((name) => files.has(name)))
      throw new Error('[transport] conflicting write set');
    for (const name of [...files.keys(), ...deletes]) {
      assertSafeContentPath(name);
      if (!allowed(name)) throw new Error('[transport] write outside approved scope');
    }
    const directory = await mkdtemp(path.join(this.gitDirectory, 'memos-index-'));
    const modes = new Map((await this.tree(expectedHead)).map((entry) => [entry.path, entry.mode]));
    const environment = {
      GIT_INDEX_FILE: path.join(directory, 'index'),
      GIT_AUTHOR_NAME: this.author.name,
      GIT_AUTHOR_EMAIL: this.author.email,
      GIT_COMMITTER_NAME: this.author.name,
      GIT_COMMITTER_EMAIL: this.author.email,
    };
    try {
      await this.git(['read-tree', expectedHead], undefined, environment);
      for (const [name, bytes] of files) {
        const blob = (await this.git(['hash-object', '-w', '--stdin'], bytes))
          .toString('utf8')
          .trim();
        assertCommitSha(blob);
        await this.git(
          ['update-index', '--add', '--cacheinfo', modes.get(name) ?? '100644', blob, name],
          undefined,
          environment,
        );
      }
      for (const name of deletes)
        await this.git(['update-index', '--force-remove', '--', name], undefined, environment);
      const tree = (await this.git(['write-tree'], undefined, environment)).toString('utf8').trim();
      assertCommitSha(tree);
      const baseTree = (await this.git(['rev-parse', `${expectedHead}^{tree}`]))
        .toString('utf8')
        .trim();
      if (tree === baseTree) return expectedHead;
      const sha = (
        await this.git(
          ['commit-tree', tree, '-p', expectedHead],
          Buffer.from(message + '\n'),
          environment,
        )
      )
        .toString('utf8')
        .trim();
      assertCommitSha(sha);
      return sha;
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  }
  async push(sha: string, expectedHead: string): Promise<void> {
    assertCommitSha(sha);
    assertCommitSha(expectedHead);
    const current = await this.head();
    if (current === sha) return;
    if (
      current !== expectedHead ||
      (await this.git(['rev-parse', `${sha}^`])).toString('utf8').trim() !== expectedHead
    )
      throw new Error('[transport] non-force push base conflict');
    await this.git(['push', '--porcelain', 'origin', `${sha}:refs/heads/main`]);
    if ((await this.head()) !== sha) throw new Error('[transport] push result unconfirmed');
  }
}

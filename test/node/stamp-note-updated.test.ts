import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import {
  parseGitNameStatusZ,
  runStampNoteUpdated,
  todayInTokyo,
} from '../../scripts/stamp-note-updated.js';

const tempRoots: string[] = [];

const createTempRoot = (): string => {
  const root = mkdtempSync(path.join(tmpdir(), 'rouault-stamp-note-updated-'));
  tempRoots.push(root);
  return root;
};

const runGit = (cwd: string, args: readonly string[]): string =>
  execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });

const initRepo = (): string => {
  const root = createTempRoot();
  runGit(root, ['init']);
  runGit(root, ['config', 'user.name', 'Rouault Test']);
  runGit(root, ['config', 'user.email', 'rouault@example.test']);
  mkdirSync(path.join(root, 'content'), { recursive: true });
  writeFile(root, 'content/base.md', note(['title: Base', 'date: 2026-07-01'], 'base'));
  runGit(root, ['add', 'content/base.md']);
  runGit(root, ['commit', '-m', 'test: seed notes']);
  return root;
};

const writeFile = (root: string, relativePath: string, text: string): void => {
  const absolutePath = path.join(root, relativePath);
  mkdirSync(path.dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, text);
};

const readFile = (root: string, relativePath: string): string =>
  readFileSync(path.join(root, relativePath), 'utf8');

const note = (frontmatter: readonly string[], body = 'body'): string =>
  `---\n${frontmatter.join('\n')}\n---\n\n${body}\n`;

afterEach(() => {
  for (const root of tempRoots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe('stamp-note-updated', () => {
  it('git name-status -z を空白・日本語pathとrename similarity込みでparseする', () => {
    const output = Buffer.from(
      ['M', 'content/a note.md', 'R100', 'content/旧.md', 'content/新.md', 'R087', 'content/old.md', 'content/new.md', ''].join(
        '\0',
      ),
    );

    expect(parseGitNameStatusZ(output)).toEqual([
      { status: 'M', path: 'content/a note.md' },
      { status: 'R100', oldPath: 'content/旧.md', path: 'content/新.md' },
      { status: 'R087', oldPath: 'content/old.md', path: 'content/new.md' },
    ]);
  });

  it('Asia/Tokyo の実行日を使い、UTC日付をそのまま使わない', () => {
    const now = new Date('2026-07-07T15:30:00.000Z');

    expect(now.toISOString().slice(0, 10)).toBe('2026-07-07');
    expect(todayInTokyo(now)).toBe('2026-07-08');
  });

  it('--files はGit diffなしでeligible noteをstamp対象にする', () => {
    const root = createTempRoot();
    writeFile(root, 'content/foo.md', note(['title: Foo', 'date: 2026-07-01'], 'foo'));

    const result = runStampNoteUpdated({
      cwd: root,
      argv: ['--date', '2026-07-08', '--files', 'content/foo.md'],
    });

    expect(result.exitCode).toBe(0);
    expect(readFile(root, 'content/foo.md')).toContain('date: 2026-07-01\nupdated: 2026-07-08');
  });

  it('--files は既存updatedがあるeligible noteもdiff判定なしでstamp対象にする', () => {
    const root = createTempRoot();
    writeFile(root, 'content/foo.md', note(['title: Foo', 'updated: 2026-07-01'], 'foo'));

    const result = runStampNoteUpdated({
      cwd: root,
      argv: ['--files', 'content/foo.md'],
      now: new Date('2026-07-08T01:00:00.000Z'),
    });

    expect(result.exitCode).toBe(0);
    expect(readFile(root, 'content/foo.md')).toContain('updated: 2026-07-08');
  });

  it('path-level対象外fileはfrontmatter parseより先にskipする', () => {
    const root = createTempRoot();
    writeFile(root, 'content/testing/bad.md', 'not frontmatter');
    writeFile(root, 'test/fixtures/content/bad.md', 'not frontmatter');

    const result = runStampNoteUpdated({
      cwd: root,
      argv: [
        '--date',
        '2026-07-08',
        '--files',
        'content/testing/bad.md',
        'test/fixtures/content/bad.md',
      ],
    });

    expect(result.exitCode).toBe(0);
    expect(result.results).toEqual([
      expect.objectContaining({ action: 'skip', path: 'content/testing/bad.md' }),
      expect.objectContaining({ action: 'skip', path: 'test/fixtures/content/bad.md' }),
    ]);
  });

  it('unknown kind/status をinvalid noteとして拒否する', () => {
    const root = createTempRoot();
    writeFile(root, 'content/foo.md', note(['title: Foo', 'kind: surprise']));
    writeFile(root, 'content/bar.md', note(['title: Bar', 'status: unknown']));

    expect(
      runStampNoteUpdated({ cwd: root, argv: ['--date', '2026-07-08', '--files', 'content/foo.md'] })
        .exitCode,
    ).toBe(1);
    expect(
      runStampNoteUpdated({ cwd: root, argv: ['--date', '2026-07-08', '--files', 'content/bar.md'] })
        .exitCode,
    ).toBe(1);
  });

  it('quoted boolean の excludeFromPublicationSurfaces をinvalid noteとして拒否する', () => {
    const root = createTempRoot();
    writeFile(root, 'content/foo.md', note(['title: Foo', 'excludeFromPublicationSurfaces: "true"']));

    const result = runStampNoteUpdated({
      cwd: root,
      argv: ['--date', '2026-07-08', '--files', 'content/foo.md'],
    });

    expect(result.exitCode).toBe(1);
    expect(result.stderr.join('\n')).toContain('unquoted boolean');
  });

  it('draft/testing/demo/excluded noteをskipし、archived/wip/deprecatedは対象候補にする', () => {
    const root = createTempRoot();
    writeFile(root, 'content/draft.md', note(['title: Draft', 'status: draft']));
    writeFile(root, 'content/testing-kind.md', note(['title: Testing', 'kind: testing']));
    writeFile(root, 'content/demo.md', note(['title: Demo', 'kind: demo']));
    writeFile(root, 'content/excluded.md', note(['title: Excluded', 'excludeFromPublicationSurfaces: true']));
    writeFile(root, 'content/archived.md', note(['title: Archived', 'status: archived']));
    writeFile(root, 'content/wip.md', note(['title: Wip', 'status: wip']));
    writeFile(root, 'content/deprecated.md', note(['title: Deprecated', 'status: deprecated']));

    const result = runStampNoteUpdated({
      cwd: root,
      argv: [
        '--date',
        '2026-07-08',
        '--files',
        'content/draft.md',
        'content/testing-kind.md',
        'content/demo.md',
        'content/excluded.md',
        'content/archived.md',
        'content/wip.md',
        'content/deprecated.md',
      ],
    });

    expect(result.exitCode).toBe(0);
    expect(result.results.filter((entry) => entry.action === 'skip')).toHaveLength(4);
    expect(readFile(root, 'content/archived.md')).toContain('updated: 2026-07-08');
    expect(readFile(root, 'content/wip.md')).toContain('updated: 2026-07-08');
    expect(readFile(root, 'content/deprecated.md')).toContain('updated: 2026-07-08');
  });

  it('staged済み新規reader/public noteで既存updatedがある場合、通常stampでは上書きしない', () => {
    const root = initRepo();
    writeFile(root, 'content/new.md', note(['title: New', 'date: 2026-07-01', 'updated: 2026-07-02']));
    runGit(root, ['add', 'content/new.md']);

    const result = runStampNoteUpdated({
      cwd: root,
      argv: [],
      now: new Date('2026-07-08T01:00:00.000Z'),
    });

    expect(result.exitCode).toBe(0);
    expect(readFile(root, 'content/new.md')).toContain('updated: 2026-07-02');
    expect(result.results[0]).toEqual(expect.objectContaining({ action: 'skip' }));
  });

  it('staged済み新規reader/public noteにupdatedがなければ追加する', () => {
    const root = initRepo();
    writeFile(root, 'content/new.md', note(['title: New', 'date: 2026-07-01']));
    runGit(root, ['add', 'content/new.md']);

    const result = runStampNoteUpdated({
      cwd: root,
      argv: [],
      now: new Date('2026-07-08T01:00:00.000Z'),
    });

    expect(result.exitCode).toBe(0);
    expect(readFile(root, 'content/new.md')).toContain('date: 2026-07-01\nupdated: 2026-07-08');
  });

  it('--checkでadded reader/public noteにupdatedがある場合は通過し、ない場合は失敗する', () => {
    const root = initRepo();
    writeFile(root, 'content/ok.md', note(['title: OK', 'updated: 2026-07-08']));
    writeFile(root, 'content/ng.md', note(['title: NG']));
    runGit(root, ['add', 'content/ok.md', 'content/ng.md']);

    const result = runStampNoteUpdated({ cwd: root, argv: ['--check'] });

    expect(result.exitCode).toBe(1);
    expect(result.results).toContainEqual(expect.objectContaining({ path: 'content/ok.md', action: 'ok' }));
    expect(result.results).toContainEqual(expect.objectContaining({ path: 'content/ng.md', action: 'error' }));
  });

  it('untracked fileは既定対象外で、deleted fileも対象外にする', () => {
    const root = initRepo();
    writeFile(root, 'content/untracked.md', note(['title: Untracked']));
    runGit(root, ['rm', 'content/base.md']);

    const result = runStampNoteUpdated({
      cwd: root,
      argv: ['--date', '2026-07-08'],
    });

    expect(result.exitCode).toBe(0);
    expect(result.results).toHaveLength(0);
    expect(readFile(root, 'content/untracked.md')).not.toContain('updated:');
  });

  it('renameはpost-change pathで対象判定し、content note renameをreader-facing変更として扱う', () => {
    const root = initRepo();
    runGit(root, ['mv', 'content/base.md', 'content/renamed.md']);

    const dryRun = runStampNoteUpdated({
      cwd: root,
      argv: ['--dry-run', '--date', '2026-07-08'],
    });
    expect(dryRun.results).toContainEqual(
      expect.objectContaining({ path: 'content/renamed.md', action: 'would-update' }),
    );

    const check = runStampNoteUpdated({ cwd: root, argv: ['--check'] });
    expect(check.exitCode).toBe(1);
    expect(check.results).toContainEqual(
      expect.objectContaining({ path: 'content/renamed.md', action: 'error' }),
    );
  });

  it('updatedをdate直後、dateがない場合はtitle直後に挿入する', () => {
    const root = createTempRoot();
    writeFile(root, 'content/with-date.md', note(['title: With Date', 'date: 2026-07-01']));
    writeFile(root, 'content/without-date.md', note(['title: Without Date', 'description: Desc']));

    const result = runStampNoteUpdated({
      cwd: root,
      argv: [
        '--date',
        '2026-07-08',
        '--files',
        'content/with-date.md',
        'content/without-date.md',
      ],
    });

    expect(result.exitCode).toBe(0);
    expect(readFile(root, 'content/with-date.md')).toContain('date: 2026-07-01\nupdated: 2026-07-08');
    expect(readFile(root, 'content/without-date.md')).toContain(
      'title: Without Date\nupdated: 2026-07-08\ndescription: Desc',
    );
  });

  it('重複keyをinvalid noteとして拒否する', () => {
    const root = createTempRoot();
    writeFile(root, 'content/foo.md', note(['title: Foo', 'updated: 2026-07-08', 'updated: 2026-07-09']));

    const result = runStampNoteUpdated({
      cwd: root,
      argv: ['--date', '2026-07-10', '--files', 'content/foo.md'],
    });

    expect(result.exitCode).toBe(1);
    expect(result.stderr.join('\n')).toContain('duplicate frontmatter key: updated');
  });

  it('不正な日付と updated < date を検出する', () => {
    const root = createTempRoot();
    writeFile(root, 'content/slash.md', note(['title: Slash', 'updated: 2026/07/07']));
    writeFile(root, 'content/short.md', note(['title: Short', 'updated: 2026-7-7']));
    writeFile(root, 'content/calendar.md', note(['title: Calendar', 'updated: 2026-02-30']));
    writeFile(root, 'content/order.md', note(['title: Order', 'date: 2026-07-08', 'updated: 2026-07-07']));

    for (const file of ['slash', 'short', 'calendar', 'order']) {
      expect(
        runStampNoteUpdated({
          cwd: root,
          argv: ['--date', '2026-07-10', '--files', `content/${file}.md`],
        }).exitCode,
      ).toBe(1);
    }
  });

  it('--dry-runはファイルを書き換えない', () => {
    const root = createTempRoot();
    const original = note(['title: Foo', 'date: 2026-07-01']);
    writeFile(root, 'content/foo.md', original);

    const result = runStampNoteUpdated({
      cwd: root,
      argv: ['--dry-run', '--date', '2026-07-08', '--files', 'content/foo.md'],
    });

    expect(result.exitCode).toBe(0);
    expect(result.results[0]).toEqual(expect.objectContaining({ action: 'would-update' }));
    expect(readFile(root, 'content/foo.md')).toBe(original);
  });

  it('通常stampはdateのみ変更ではupdatedを追加・更新しない', () => {
    const root = initRepo();
    writeFile(root, 'content/base.md', note(['title: Base', 'date: 2026-07-02'], 'base'));

    const result = runStampNoteUpdated({
      cwd: root,
      argv: [],
      now: new Date('2026-07-08T01:00:00.000Z'),
    });

    expect(result.exitCode).toBe(0);
    expect(result.results).toContainEqual(
      expect.objectContaining({
        action: 'skip',
        path: 'content/base.md',
        reason: 'no reader-facing change',
      }),
    );
    expect(readFile(root, 'content/base.md')).not.toContain('updated:');
  });

  it('通常stampは内部metadataのみ変更ではupdatedを追加・更新しない', () => {
    const root = initRepo();
    writeFile(
      root,
      'content/base.md',
      note(
        [
          'title: Base',
          'date: 2026-07-01',
          'testingArea: layout',
          'hydrationBudgetProfile: lean',
          'e2eFixtureId: note.fixture',
        ],
        'base',
      ),
    );

    const result = runStampNoteUpdated({
      cwd: root,
      argv: [],
      now: new Date('2026-07-08T01:00:00.000Z'),
    });

    expect(result.exitCode).toBe(0);
    expect(result.results).toContainEqual(
      expect.objectContaining({
        action: 'skip',
        path: 'content/base.md',
        reason: 'no reader-facing change',
      }),
    );
    expect(readFile(root, 'content/base.md')).not.toContain('updated:');
  });

  it('通常stampは本文変更ではupdatedを追加・更新する', () => {
    const root = initRepo();
    writeFile(root, 'content/base.md', note(['title: Base', 'date: 2026-07-01'], 'changed body'));

    const result = runStampNoteUpdated({
      cwd: root,
      argv: [],
      now: new Date('2026-07-08T01:00:00.000Z'),
    });

    expect(result.exitCode).toBe(0);
    expect(result.results).toContainEqual(
      expect.objectContaining({ action: 'updated', path: 'content/base.md' }),
    );
    expect(readFile(root, 'content/base.md')).toContain('updated: 2026-07-08');
  });

  it('--date指定時でもGit差分由来のdateのみ変更では対象判定を無効化しない', () => {
    const root = initRepo();
    writeFile(root, 'content/base.md', note(['title: Base', 'date: 2026-07-02'], 'base'));

    const result = runStampNoteUpdated({
      cwd: root,
      argv: ['--date', '2026-07-08'],
    });

    expect(result.exitCode).toBe(0);
    expect(result.results).toContainEqual(
      expect.objectContaining({
        action: 'skip',
        path: 'content/base.md',
        reason: 'no reader-facing change',
      }),
    );
    expect(readFile(root, 'content/base.md')).not.toContain('updated:');
  });

  it('--checkは今日の日付を要求せず、updatedのみ/dateのみ/internal metadataのみの変更を要求対象外にする', () => {
    const root = initRepo();
    writeFile(
      root,
      'content/base.md',
      note(
        [
          'title: Base',
          'date: 2026-07-02',
          'updated: 2026-07-03',
          'testingArea: layout',
          'hydrationBudgetProfile: lean',
          'e2eFixtureId: note.fixture',
        ],
        'base',
      ),
    );

    const result = runStampNoteUpdated({
      cwd: root,
      argv: ['--check'],
      now: new Date('2026-07-08T01:00:00.000Z'),
    });

    expect(result.exitCode).toBe(0);
  });

  it('--checkは本文やreader-facing metadata変更では同一diff内のupdated更新を要求する', () => {
    const root = initRepo();
    writeFile(root, 'content/base.md', note(['title: Base', 'date: 2026-07-01'], 'changed body'));

    const missingUpdated = runStampNoteUpdated({ cwd: root, argv: ['--check'] });
    expect(missingUpdated.exitCode).toBe(1);

    writeFile(
      root,
      'content/base.md',
      note(['title: Base changed', 'date: 2026-07-01', 'updated: 2026-07-02'], 'changed body'),
    );
    const hasUpdated = runStampNoteUpdated({ cwd: root, argv: ['--check'] });
    expect(hasUpdated.exitCode).toBe(0);
  });

  it('kindやexcludeFromPublicationSurfacesのpublication復帰をreader-facing変更として扱う', () => {
    const root = initRepo();
    writeFile(root, 'content/demo.md', note(['title: Demo', 'kind: demo'], 'demo'));
    writeFile(root, 'content/excluded.md', note(['title: Excluded', 'excludeFromPublicationSurfaces: true'], 'x'));
    runGit(root, ['add', 'content/demo.md', 'content/excluded.md']);
    runGit(root, ['commit', '-m', 'test: add hidden notes']);

    writeFile(root, 'content/demo.md', note(['title: Demo'], 'demo'));
    writeFile(root, 'content/excluded.md', note(['title: Excluded', 'excludeFromPublicationSurfaces: false'], 'x'));

    const result = runStampNoteUpdated({ cwd: root, argv: ['--check'] });

    expect(result.exitCode).toBe(1);
    expect(result.results).toContainEqual(expect.objectContaining({ path: 'content/demo.md', action: 'error' }));
    expect(result.results).toContainEqual(
      expect.objectContaining({ path: 'content/excluded.md', action: 'error' }),
    );
  });

  it('--check --filesはPhase1 unsupportedとして非0終了する', () => {
    const root = createTempRoot();
    const result = runStampNoteUpdated({ cwd: root, argv: ['--check', '--files', 'content/foo.md'] });

    expect(result.exitCode).toBe(1);
    expect(result.stderr.join('\n')).toContain('unsupported');
  });

  it('通常stampはMarkdown sourceを書き換えるだけで自動git addしない', () => {
    const root = initRepo();
    writeFile(root, 'content/base.md', note(['title: Base', 'date: 2026-07-01'], 'changed'));

    const result = runStampNoteUpdated({
      cwd: root,
      argv: ['--date', '2026-07-08'],
    });

    expect(result.exitCode).toBe(0);
    expect(readFile(root, 'content/base.md')).toContain('updated: 2026-07-08');
    expect(runGit(root, ['diff', '--cached', '--name-only'])).toBe('');
  });

  it('Git diff取得とUXB検出は要求されたname-status -z形式を使う', () => {
    const source = readFileSync(
      new URL('../../scripts/stamp-note-updated.ts', import.meta.url),
      'utf8',
    );

    expect(source).toMatch(
      /\[\s*'diff',\s*'--name-status',\s*'-z',\s*'-M',\s*'--diff-filter=AMRT',\s*'HEAD',\s*'--',\s*'content',\s*\]/,
    );
    expect(source).toMatch(
      /\[\s*'diff',\s*'--name-status',\s*'-z',\s*'--diff-filter=UXB',\s*'HEAD',\s*'--',\s*'content'\s*\]/,
    );
  });

  it('T statusはpost-change pathが通常readable Markdown fileである場合だけ対象にする契約を持つ', () => {
    const source = readFileSync(
      new URL('../../scripts/stamp-note-updated.ts', import.meta.url),
      'utf8',
    );

    expect(source).toContain("entry.status === 'T'");
    expect(source).toContain('post-change path is not a readable Markdown file');
  });
});

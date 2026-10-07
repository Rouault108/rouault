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
  mkdirSync(path.join(root, 'content', 'notes'), { recursive: true });
  writeFile(root, 'content/notes/base.md', note(['title: Base', 'date: 2026-07-01'], 'base'));
  runGit(root, ['add', 'content/notes/base.md']);
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
      [
        'M',
        'content/notes/a note.md',
        'R100',
        'content/notes/旧.md',
        'content/notes/新.md',
        'R087',
        'content/notes/old.md',
        'content/notes/new.md',
        '',
      ].join('\0'),
    );

    expect(parseGitNameStatusZ(output)).toEqual([
      { status: 'M', path: 'content/notes/a note.md' },
      { status: 'R100', oldPath: 'content/notes/旧.md', path: 'content/notes/新.md' },
      { status: 'R087', oldPath: 'content/notes/old.md', path: 'content/notes/new.md' },
    ]);
  });

  it('Asia/Tokyo の実行日を使い、UTC日付をそのまま使わない', () => {
    const now = new Date('2026-07-07T15:30:00.000Z');

    expect(now.toISOString().slice(0, 10)).toBe('2026-07-07');
    expect(todayInTokyo(now)).toBe('2026-07-08');
  });

  it('--files はGit diffなしでeligible noteをstamp対象にする', () => {
    const root = createTempRoot();
    writeFile(root, 'content/notes/foo.md', note(['title: Foo', 'date: 2026-07-01'], 'foo'));

    const result = runStampNoteUpdated({
      cwd: root,
      argv: ['--date', '2026-07-08', '--files', 'content/notes/foo.md'],
    });

    expect(result.exitCode).toBe(0);
    expect(readFile(root, 'content/notes/foo.md')).toContain(
      'date: 2026-07-01\nupdated: 2026-07-08',
    );
  });

  it('--files は既存updatedがあるeligible noteもdiff判定なしでstamp対象にする', () => {
    const root = createTempRoot();
    writeFile(root, 'content/notes/foo.md', note(['title: Foo', 'updated: 2026-07-01'], 'foo'));

    const result = runStampNoteUpdated({
      cwd: root,
      argv: ['--files', 'content/notes/foo.md'],
      now: new Date('2026-07-08T01:00:00.000Z'),
    });

    expect(result.exitCode).toBe(0);
    expect(readFile(root, 'content/notes/foo.md')).toContain('updated: 2026-07-08');
  });

  it('path-level対象外fileはfrontmatter parseより先にskipする', () => {
    const root = createTempRoot();
    writeFile(root, 'content/notes/testing/bad.md', 'not frontmatter');
    writeFile(root, 'test/fixtures/content/notes/bad.md', 'not frontmatter');

    const result = runStampNoteUpdated({
      cwd: root,
      argv: [
        '--date',
        '2026-07-08',
        '--files',
        'content/notes/testing/bad.md',
        'test/fixtures/content/notes/bad.md',
      ],
    });

    expect(result.exitCode).toBe(0);
    expect(result.results).toEqual([
      expect.objectContaining({ action: 'skip', path: 'content/notes/testing/bad.md' }),
      expect.objectContaining({ action: 'skip', path: 'test/fixtures/content/notes/bad.md' }),
    ]);
  });

  it('unknown kind/status をinvalid noteとして拒否する', () => {
    const root = createTempRoot();
    writeFile(root, 'content/notes/foo.md', note(['title: Foo', 'kind: surprise']));
    writeFile(root, 'content/notes/bar.md', note(['title: Bar', 'status: unknown']));

    expect(
      runStampNoteUpdated({
        cwd: root,
        argv: ['--date', '2026-07-08', '--files', 'content/notes/foo.md'],
      }).exitCode,
    ).toBe(1);
    expect(
      runStampNoteUpdated({
        cwd: root,
        argv: ['--date', '2026-07-08', '--files', 'content/notes/bar.md'],
      }).exitCode,
    ).toBe(1);
  });

  it('quoted boolean の excludeFromPublicationSurfaces をinvalid noteとして拒否する', () => {
    const root = createTempRoot();
    writeFile(
      root,
      'content/notes/foo.md',
      note(['title: Foo', 'excludeFromPublicationSurfaces: "true"']),
    );

    const result = runStampNoteUpdated({
      cwd: root,
      argv: ['--date', '2026-07-08', '--files', 'content/notes/foo.md'],
    });

    expect(result.exitCode).toBe(1);
    expect(result.stderr.join('\n')).toContain('unquoted boolean');
  });

  it('draft/testing/demo/excluded noteをskipし、archived/wip/deprecatedは対象候補にする', () => {
    const root = createTempRoot();
    writeFile(root, 'content/notes/draft.md', note(['title: Draft', 'status: draft']));
    writeFile(root, 'content/notes/testing-kind.md', note(['title: Testing', 'kind: testing']));
    writeFile(root, 'content/notes/demo.md', note(['title: Demo', 'kind: demo']));
    writeFile(
      root,
      'content/notes/excluded.md',
      note(['title: Excluded', 'excludeFromPublicationSurfaces: true']),
    );
    writeFile(root, 'content/notes/archived.md', note(['title: Archived', 'status: archived']));
    writeFile(root, 'content/notes/wip.md', note(['title: Wip', 'status: wip']));
    writeFile(
      root,
      'content/notes/deprecated.md',
      note(['title: Deprecated', 'status: deprecated']),
    );

    const result = runStampNoteUpdated({
      cwd: root,
      argv: [
        '--date',
        '2026-07-08',
        '--files',
        'content/notes/draft.md',
        'content/notes/testing-kind.md',
        'content/notes/demo.md',
        'content/notes/excluded.md',
        'content/notes/archived.md',
        'content/notes/wip.md',
        'content/notes/deprecated.md',
      ],
    });

    expect(result.exitCode).toBe(0);
    expect(result.results.filter((entry) => entry.action === 'skip')).toHaveLength(4);
    expect(readFile(root, 'content/notes/archived.md')).toContain('updated: 2026-07-08');
    expect(readFile(root, 'content/notes/wip.md')).toContain('updated: 2026-07-08');
    expect(readFile(root, 'content/notes/deprecated.md')).toContain('updated: 2026-07-08');
  });

  it('staged済み新規reader/public noteで既存updatedがある場合、通常stampでは上書きしない', () => {
    const root = initRepo();
    writeFile(
      root,
      'content/notes/new.md',
      note(['title: New', 'date: 2026-07-01', 'updated: 2026-07-02']),
    );
    runGit(root, ['add', 'content/notes/new.md']);

    const result = runStampNoteUpdated({
      cwd: root,
      argv: [],
      now: new Date('2026-07-08T01:00:00.000Z'),
    });

    expect(result.exitCode).toBe(0);
    expect(readFile(root, 'content/notes/new.md')).toContain('updated: 2026-07-02');
    expect(result.results[0]).toEqual(expect.objectContaining({ action: 'skip' }));
  });

  it('staged済み新規reader/public noteにupdatedがなければ追加する', () => {
    const root = initRepo();
    writeFile(root, 'content/notes/new.md', note(['title: New', 'date: 2026-07-01']));
    runGit(root, ['add', 'content/notes/new.md']);

    const result = runStampNoteUpdated({
      cwd: root,
      argv: [],
      now: new Date('2026-07-08T01:00:00.000Z'),
    });

    expect(result.exitCode).toBe(0);
    expect(readFile(root, 'content/notes/new.md')).toContain(
      'date: 2026-07-01\nupdated: 2026-07-08',
    );
  });

  it('--checkでadded reader/public noteにupdatedがある場合は通過し、ない場合は失敗する', () => {
    const root = initRepo();
    writeFile(root, 'content/notes/ok.md', note(['title: OK', 'updated: 2026-07-08']));
    writeFile(root, 'content/notes/ng.md', note(['title: NG']));
    runGit(root, ['add', 'content/notes/ok.md', 'content/notes/ng.md']);

    const result = runStampNoteUpdated({ cwd: root, argv: ['--check'] });

    expect(result.exitCode).toBe(1);
    expect(result.results).toContainEqual(
      expect.objectContaining({ path: 'content/notes/ok.md', action: 'ok' }),
    );
    expect(result.results).toContainEqual(
      expect.objectContaining({ path: 'content/notes/ng.md', action: 'error' }),
    );
  });

  it('untracked fileは既定対象外で、deleted fileも対象外にする', () => {
    const root = initRepo();
    writeFile(root, 'content/notes/untracked.md', note(['title: Untracked']));
    runGit(root, ['rm', 'content/notes/base.md']);

    const result = runStampNoteUpdated({
      cwd: root,
      argv: ['--date', '2026-07-08'],
    });

    expect(result.exitCode).toBe(0);
    expect(result.results).toHaveLength(0);
    expect(readFile(root, 'content/notes/untracked.md')).not.toContain('updated:');
  });

  it('renameはpost-change pathで対象判定し、content note renameをreader-facing変更として扱う', () => {
    const root = initRepo();
    runGit(root, ['mv', 'content/notes/base.md', 'content/notes/renamed.md']);

    const dryRun = runStampNoteUpdated({
      cwd: root,
      argv: ['--dry-run', '--date', '2026-07-08'],
    });
    expect(dryRun.results).toContainEqual(
      expect.objectContaining({ path: 'content/notes/renamed.md', action: 'would-update' }),
    );

    const check = runStampNoteUpdated({ cwd: root, argv: ['--check'] });
    expect(check.exitCode).toBe(1);
    expect(check.results).toContainEqual(
      expect.objectContaining({ path: 'content/notes/renamed.md', action: 'error' }),
    );
  });

  it('updatedをdate直後、dateがない場合はtitle直後に挿入する', () => {
    const root = createTempRoot();
    writeFile(root, 'content/notes/with-date.md', note(['title: With Date', 'date: 2026-07-01']));
    writeFile(
      root,
      'content/notes/without-date.md',
      note(['title: Without Date', 'description: Desc']),
    );

    const result = runStampNoteUpdated({
      cwd: root,
      argv: [
        '--date',
        '2026-07-08',
        '--files',
        'content/notes/with-date.md',
        'content/notes/without-date.md',
      ],
    });

    expect(result.exitCode).toBe(0);
    expect(readFile(root, 'content/notes/with-date.md')).toContain(
      'date: 2026-07-01\nupdated: 2026-07-08',
    );
    expect(readFile(root, 'content/notes/without-date.md')).toContain(
      'title: Without Date\nupdated: 2026-07-08\ndescription: Desc',
    );
  });

  it('重複keyをinvalid noteとして拒否する', () => {
    const root = createTempRoot();
    writeFile(
      root,
      'content/notes/foo.md',
      note(['title: Foo', 'updated: 2026-07-08', 'updated: 2026-07-09']),
    );

    const result = runStampNoteUpdated({
      cwd: root,
      argv: ['--date', '2026-07-10', '--files', 'content/notes/foo.md'],
    });

    expect(result.exitCode).toBe(1);
    expect(result.stderr.join('\n')).toContain('duplicate frontmatter key: updated');
  });

  it('不正な日付と updated < date を検出する', () => {
    const root = createTempRoot();
    writeFile(root, 'content/notes/slash.md', note(['title: Slash', 'updated: 2026/07/07']));
    writeFile(root, 'content/notes/short.md', note(['title: Short', 'updated: 2026-7-7']));
    writeFile(root, 'content/notes/calendar.md', note(['title: Calendar', 'updated: 2026-02-30']));
    writeFile(
      root,
      'content/notes/order.md',
      note(['title: Order', 'date: 2026-07-08', 'updated: 2026-07-07']),
    );

    for (const file of ['slash', 'short', 'calendar', 'order']) {
      expect(
        runStampNoteUpdated({
          cwd: root,
          argv: ['--date', '2026-07-10', '--files', `content/notes/${file}.md`],
        }).exitCode,
      ).toBe(1);
    }
  });

  it('--dry-runはファイルを書き換えない', () => {
    const root = createTempRoot();
    const original = note(['title: Foo', 'date: 2026-07-01']);
    writeFile(root, 'content/notes/foo.md', original);

    const result = runStampNoteUpdated({
      cwd: root,
      argv: ['--dry-run', '--date', '2026-07-08', '--files', 'content/notes/foo.md'],
    });

    expect(result.exitCode).toBe(0);
    expect(result.results[0]).toEqual(expect.objectContaining({ action: 'would-update' }));
    expect(readFile(root, 'content/notes/foo.md')).toBe(original);
  });

  it('通常stampはdateのみ変更ではupdatedを追加・更新しない', () => {
    const root = initRepo();
    writeFile(root, 'content/notes/base.md', note(['title: Base', 'date: 2026-07-02'], 'base'));

    const result = runStampNoteUpdated({
      cwd: root,
      argv: [],
      now: new Date('2026-07-08T01:00:00.000Z'),
    });

    expect(result.exitCode).toBe(0);
    expect(result.results).toContainEqual(
      expect.objectContaining({
        action: 'skip',
        path: 'content/notes/base.md',
        reason: 'no reader-facing change',
      }),
    );
    expect(readFile(root, 'content/notes/base.md')).not.toContain('updated:');
  });

  it('通常stampは内部metadataのみ変更ではupdatedを追加・更新しない', () => {
    const root = initRepo();
    writeFile(
      root,
      'content/notes/base.md',
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
        path: 'content/notes/base.md',
        reason: 'no reader-facing change',
      }),
    );
    expect(readFile(root, 'content/notes/base.md')).not.toContain('updated:');
  });

  it('通常stampは本文変更ではupdatedを追加・更新する', () => {
    const root = initRepo();
    writeFile(
      root,
      'content/notes/base.md',
      note(['title: Base', 'date: 2026-07-01'], 'changed body'),
    );

    const result = runStampNoteUpdated({
      cwd: root,
      argv: [],
      now: new Date('2026-07-08T01:00:00.000Z'),
    });

    expect(result.exitCode).toBe(0);
    expect(result.results).toContainEqual(
      expect.objectContaining({ action: 'updated', path: 'content/notes/base.md' }),
    );
    expect(readFile(root, 'content/notes/base.md')).toContain('updated: 2026-07-08');
  });

  it('--date指定時でもGit差分由来のdateのみ変更では対象判定を無効化しない', () => {
    const root = initRepo();
    writeFile(root, 'content/notes/base.md', note(['title: Base', 'date: 2026-07-02'], 'base'));

    const result = runStampNoteUpdated({
      cwd: root,
      argv: ['--date', '2026-07-08'],
    });

    expect(result.exitCode).toBe(0);
    expect(result.results).toContainEqual(
      expect.objectContaining({
        action: 'skip',
        path: 'content/notes/base.md',
        reason: 'no reader-facing change',
      }),
    );
    expect(readFile(root, 'content/notes/base.md')).not.toContain('updated:');
  });

  it('--checkは今日の日付を要求せず、updatedのみ/dateのみ/internal metadataのみの変更を要求対象外にする', () => {
    const root = initRepo();
    writeFile(
      root,
      'content/notes/base.md',
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
    writeFile(
      root,
      'content/notes/base.md',
      note(['title: Base', 'date: 2026-07-01'], 'changed body'),
    );

    const missingUpdated = runStampNoteUpdated({ cwd: root, argv: ['--check'] });
    expect(missingUpdated.exitCode).toBe(1);

    writeFile(
      root,
      'content/notes/base.md',
      note(['title: Base changed', 'date: 2026-07-01', 'updated: 2026-07-02'], 'changed body'),
    );
    const hasUpdated = runStampNoteUpdated({ cwd: root, argv: ['--check'] });
    expect(hasUpdated.exitCode).toBe(0);
  });

  it('kindやexcludeFromPublicationSurfacesのpublication復帰をreader-facing変更として扱う', () => {
    const root = initRepo();
    writeFile(root, 'content/notes/demo.md', note(['title: Demo', 'kind: demo'], 'demo'));
    writeFile(
      root,
      'content/notes/excluded.md',
      note(['title: Excluded', 'excludeFromPublicationSurfaces: true'], 'x'),
    );
    runGit(root, ['add', 'content/notes/demo.md', 'content/notes/excluded.md']);
    runGit(root, ['commit', '-m', 'test: add hidden notes']);

    writeFile(root, 'content/notes/demo.md', note(['title: Demo'], 'demo'));
    writeFile(
      root,
      'content/notes/excluded.md',
      note(['title: Excluded', 'excludeFromPublicationSurfaces: false'], 'x'),
    );

    const result = runStampNoteUpdated({ cwd: root, argv: ['--check'] });

    expect(result.exitCode).toBe(1);
    expect(result.results).toContainEqual(
      expect.objectContaining({ path: 'content/notes/demo.md', action: 'error' }),
    );
    expect(result.results).toContainEqual(
      expect.objectContaining({ path: 'content/notes/excluded.md', action: 'error' }),
    );
  });

  it('--check --filesはPhase1 unsupportedとして非0終了する', () => {
    const root = createTempRoot();
    const result = runStampNoteUpdated({
      cwd: root,
      argv: ['--check', '--files', 'content/notes/foo.md'],
    });

    expect(result.exitCode).toBe(1);
    expect(result.stderr.join('\n')).toContain('unsupported');
  });

  it('通常stampはMarkdown sourceを書き換えるだけで自動git addしない', () => {
    const root = initRepo();
    writeFile(root, 'content/notes/base.md', note(['title: Base', 'date: 2026-07-01'], 'changed'));

    const result = runStampNoteUpdated({
      cwd: root,
      argv: ['--date', '2026-07-08'],
    });

    expect(result.exitCode).toBe(0);
    expect(readFile(root, 'content/notes/base.md')).toContain('updated: 2026-07-08');
    expect(runGit(root, ['diff', '--cached', '--name-only'])).toBe('');
  });

  it('Git diff取得とUXB検出は要求されたname-status -z形式を使う', () => {
    const source = readFileSync(
      new URL('../../scripts/stamp-note-updated.ts', import.meta.url),
      'utf8',
    );

    expect(source).toMatch(
      /\[\s*'diff',\s*'--name-status',\s*'-z',\s*'-M',\s*'--diff-filter=AMRT',\s*'HEAD',\s*'--',\s*'content\/notes',\s*\]/,
    );
    expect(source).toMatch(
      /\[\s*'diff',\s*'--name-status',\s*'-z',\s*'--diff-filter=UXB',\s*'HEAD',\s*'--',\s*'content\/notes'\s*\]/,
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

import { describe, expect, it } from 'vitest';
import sharp from 'sharp';
import {
  buildImportPlan,
  plannedSourceSnapshot,
  verifyOwnership,
} from '../../scripts/memos-import/build-import-plan.js';
import { aggregateLedger, serializeState } from '../../scripts/memos-import/publication-ledger.js';
import {
  parseVaultNote,
  readVaultNotes,
  hashBytes,
  updateSourceFlag,
} from '../../scripts/memos-import/source-snapshot.js';
import { transformRequestedMemos } from '../../scripts/memos-import/transform-memos.js';
import { preparePublicAsset } from '../../scripts/memos-import/prepare-public-assets.js';
import { validatePushInput } from '../../build/media/validate-image-inputs.js';
import type {
  PublicationLedger,
  PublicationOperation,
  Snapshot,
  PublicationEntry,
} from '../../scripts/memos-import/model.js';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkRehype from 'remark-rehype';
import rehypeKatex from 'rehype-katex';
import { rehypeHeadingIds } from '../../build/rehype/rehype-heading-ids.js';
const guards = {
  maxBlobBytes: 2_000_000,
  maxPushBytes: 10_000_000,
  maxPixels: 100_000,
  memoryBytes: 8_000_000,
  timeoutMs: 5000,
  hostingEvidence: 'synthetic-test-transport',
  environmentEvidence: 'synthetic-test-budget',
};
const operation: PublicationOperation = {
  operationId: 'test-1',
  action: 'publish',
  targets: ['02_notes/A.md'],
  userRequestRef: 'private:test-request',
  expectedLedgerRevision: 0,
};
const emptyLedger = (): PublicationLedger =>
  aggregateLedger({ schemaVersion: 1, revision: 0, entries: {} }, []);
const snapshot = (files: Record<string, string | Uint8Array>, sha = 'a'.repeat(40)): Snapshot => ({
  sha,
  complete: true,
  files: new Map(
    Object.entries(files).map(([name, value]) => [
      name,
      { mode: '100644', bytes: typeof value === 'string' ? Buffer.from(value) : value },
    ]),
  ),
});
const note = (body: string, extra = '') => `---\npublish: true\n${extra}---\n${body}`;
const jpegSegment = (marker: number, payload: Uint8Array): Buffer => {
  const header = Buffer.from([0xff, marker, 0, 0]);
  header.writeUInt16BE(payload.length + 2, 2);
  return Buffer.concat([header, payload]);
};
const published = (
  name: string,
  source: string,
  map: Record<string, string> = {},
): PublicationEntry => ({
  sourcePath: name,
  publicPath: `content/memos/${name.slice(9)}`,
  status: 'published',
  approvedRequestRef: 'private:prior',
  approvedSourceSha: 'a'.repeat(40),
  approvedContentHash: parseVaultNote(name, Buffer.from(source)).versionHash,
  dependencyHashes: {},
  publicOutputHashes: {},
  rouaultCommitSha: 'b'.repeat(40),
  deploymentId: 'synthetic',
  headingMap: map,
});
const transform = async (files: Record<string, string>, ledger = emptyLedger(), op = operation) =>
  transformRequestedMemos({
    operation: op,
    ledger,
    notes: readVaultNotes(snapshot(files)),
    image: async () => 'content/_assets/memos-import/synthetic.png',
  });
const plan = (
  files: Record<string, string>,
  overrides: Partial<Parameters<typeof buildImportPlan>[0]> = {},
) =>
  buildImportPlan({
    operation,
    source: plannedSourceSnapshot(snapshot(files), operation),
    rouault: snapshot({}),
    ledger: emptyLedger(),
    initializeEmpty: true,
    guards,
    ...overrides,
  });
describe('manual memo importer', () => {
  it.each([
    ['quoted', '> ## Quoted\n> [local](#Quoted)\n'],
    ['listed', '- ## Listed\n  [local](#Listed)\n'],
  ])('preserves original heading identity inside %s Markdown containers', async (_, body) => {
    const output = (await transform({ '02_notes/A.md': note(body) })).get('02_notes/A.md');
    expect(output).toBeDefined();
    const id = Object.keys(output?.headingMap ?? {})[0];
    expect(id).toBeTruthy();
    expect(output?.markdown).toContain(`[local](#${id ?? ''})`);
  });
  it.each(['quote', 'list'])(
    'collects reference definitions and footnotes in a %s without exposing private destinations',
    async (container) => {
      const prefix = container === 'quote' ? '> ' : '  ';
      const body = [
        `${container === 'quote' ? '> ' : '- '}[read][Secret] ![safe][Image] foot[^Case]`,
        prefix.trimEnd(),
        `${prefix}[secret]: private/Secret.md`,
        `${prefix}[image]: image.png`,
        `${prefix}[unused]: private/Secret.md`,
        `${prefix}[^case]: note [label][secret]`,
      ].join('\n');
      const output = (
        await transform({
          '02_notes/A.md': note(body),
          '02_notes/private/Secret.md': '---\npublish: false\n---\nPrivate synthetic body',
        })
      ).get('02_notes/A.md')?.markdown;
      expect(output).toContain('read');
      expect(output).toContain('![safe](content/_assets/memos-import/synthetic.png)');
      expect(output).toContain('label');
      expect(output).not.toContain('private/Secret');
      expect(output).not.toContain('[unused]');
    },
  );
  it('keeps the first definition across containers and maps repeated embedded container headings to final anchors', async () => {
    const bodyB = note(
      '## Part\n> ### Quoted\n> [local](#Quoted) foot[^F]\n>\n> [^f]: nested footnote\n\n- ### Listed\n  [listed](#Listed)\n',
    );
    const files = {
      '02_notes/A.md': note(
        '> [private label][Ref]\n>\n> [ref]: private/Secret.md\n\n[ref]: B.md\n\n![[B#Part]]\n![[B#Part]]\n',
      ),
      '02_notes/B.md': bodyB,
      '02_notes/private/Secret.md': '---\npublish: false\n---\nSynthetic private body',
    };
    const ledger = emptyLedger();
    ledger.entries['02_notes/B.md'] = published('02_notes/B.md', bodyB, {
      part: 'Part',
      quoted: 'Quoted',
      listed: 'Listed',
    });
    const output = (await transform(files, ledger)).get('02_notes/A.md');
    expect(Object.keys(output?.headingMap ?? {})).toEqual([
      'part',
      'quoted',
      'listed',
      'part-2',
      'quoted-2',
      'listed-2',
    ]);
    expect(output?.markdown).toContain('[local](#quoted)');
    expect(output?.markdown).toContain('[local](#quoted-2)');
    expect(output?.markdown).toContain('[listed](#listed)');
    expect(output?.markdown).toContain('[listed](#listed-2)');
    expect(output?.markdown).toContain('[^embed-1-f]');
    expect(output?.markdown).toContain('[^embed-2-f]');
    expect(output?.markdown).not.toContain('private/Secret');
    expect(output?.markdown).not.toContain('[private label](/memos/B)');
    if (!output) throw new Error('Synthetic output missing');
    const renderer = unified()
      .use(remarkParse)
      .use(remarkGfm)
      .use(remarkMath)
      .use(remarkRehype)
      .use(rehypeKatex)
      .use(rehypeHeadingIds);
    const tree: unknown = await renderer.run(renderer.parse(output.markdown));
    const ids: string[] = [];
    const collect = (node: unknown): void => {
      if (typeof node !== 'object' || node === null) return;
      if (
        'tagName' in node &&
        typeof node.tagName === 'string' &&
        /^h[1-6]$/u.test(node.tagName) &&
        'properties' in node &&
        typeof node.properties === 'object' &&
        node.properties !== null &&
        'id' in node.properties &&
        typeof node.properties.id === 'string' &&
        node.properties.id !== 'footnote-label'
      )
        ids.push(node.properties.id);
      if ('children' in node && Array.isArray(node.children)) node.children.forEach(collect);
    };
    collect(tree);
    expect(ids).toEqual(Object.keys(output.headingMap));
  });
  it('recognizes only empty root markers and refuses unowned marker data during initialization', () => {
    expect(
      verifyOwnership(snapshot({ 'content/memos/.gitkeep': '' }), undefined, true).files,
    ).toEqual({});
    expect(() =>
      verifyOwnership(snapshot({ 'content/memos/.gitkeep': 'unowned data' }), undefined, true),
    ).toThrow();
    expect(() =>
      verifyOwnership(snapshot({ 'content/memos/nested/.gitkeep': '' }), undefined, true),
    ).toThrow();
  });
  it('plans final heading anchors after math and footnote semantics using the actual Rouault plugin', async () => {
    const result = (
      await transform({
        '02_notes/A.md': note(
          '## Math $x^2$\n## Note[^a]\n## Math $x^2$\n\n[^a]: Synthetic footnote',
        ),
      })
    ).get('02_notes/A.md');
    if (!result) throw new Error('synthetic output missing');
    const renderer = unified()
      .use(remarkParse)
      .use(remarkGfm)
      .use(remarkMath)
      .use(remarkRehype)
      .use(rehypeKatex)
      .use(rehypeHeadingIds);
    const tree: unknown = await renderer.run(renderer.parse(result.markdown));
    const ids: string[] = [];
    const inspect = (node: unknown): void => {
      if (typeof node !== 'object' || node === null) return;
      if (
        'tagName' in node &&
        typeof node.tagName === 'string' &&
        /^h[1-6]$/u.test(node.tagName) &&
        'properties' in node &&
        typeof node.properties === 'object' &&
        node.properties !== null &&
        'id' in node.properties &&
        typeof node.properties.id === 'string' &&
        node.properties.id !== 'footnote-label'
      )
        ids.push(node.properties.id);
      if ('children' in node && Array.isArray(node.children))
        node.children.forEach((child) => {
          inspect(child);
        });
    };
    inspect(tree);
    expect(Object.keys(result.headingMap)).toEqual(ids);
    expect(ids[0]).not.toBe('math-x2');
    expect(ids[2]).toBe(`${ids[0] ?? ''}-2`);
  });
  it('expands multiple inline note embeds and inline images while preserving escaped tokens independently', async () => {
    const files = {
      '02_notes/A.md': note('Before ![[B]] between ![[B]] after ![[image.png]]\n\\[[B]] [[B]]'),
      '02_notes/B.md': note('Public B'),
    };
    const ledger = emptyLedger();
    ledger.entries['02_notes/B.md'] = published('02_notes/B.md', files['02_notes/B.md']);
    const output = (await transform(files, ledger)).get('02_notes/A.md')?.markdown ?? '';
    expect(output.match(/Public B/gu)).toHaveLength(2);
    expect(output).toContain('synthetic.png');
    expect(output).toContain('/memos/B');
    expect(output).toContain('\\[\\[B');
  });
  it('requires an exact explicit target and publishes only allowlisted metadata', async () => {
    const output = await plan({
      '02_notes/A.md': note(
        '# Public\n',
        'title: A\nsecret: SYNTHETIC_PRIVATE_METADATA\ntags: [private]\n',
      ),
      '02_notes/B.md': note('SYNTHETIC_PRIVATE_BODY'),
      '01_daily/D.md': note('SYNTHETIC_DIARY'),
    });
    expect([...output.writes.keys()]).toEqual([
      'content/memos/A.md',
      'scripts/import-state/memos-owned-files.json',
    ]);
    expect(Buffer.from(output.writes.get('content/memos/A.md') ?? []).toString()).toContain(
      'license: CC BY 4.0',
    );
    expect(
      JSON.stringify(
        [...output.writes].map(([name, bytes]) => [name, Buffer.from(bytes).toString()]),
      ),
    ).not.toMatch(/SYNTHETIC_PRIVATE|SYNTHETIC_DIARY|02_notes|private:test|publish:/u);
    expect(output.confirmations.map((item) => item.sourcePath)).toEqual(['02_notes/B.md']);
  });
  it.each(['"true"', '1', 'yes', 'false'])(
    'does not treat %s as boolean approval on update',
    async (flag) => {
      const source = note('Body').replace('publish: true', `publish: ${flag}`);
      const ledger = emptyLedger();
      ledger.entries['02_notes/A.md'] = published('02_notes/A.md', source);
      const op = { ...operation, action: 'update' as const };
      expect(() => plannedSourceSnapshot(snapshot({ '02_notes/A.md': source }), op)).toThrow(
        'flag conflict',
      );
    },
  );
  it.each(['publish: true\npublish: false\n', 'publish: !unknown true\n', 'publish: [\n'])(
    'rejects malformed YAML before planned source changes',
    (yaml) => {
      expect(() => parseVaultNote('02_notes/A.md', Buffer.from(`---\n${yaml}---\nBody`))).toThrow();
    },
  );
  it('changes only the publish property and preserves body and unrelated metadata', () => {
    const original = '---\r\ntitle: "Keep"\r\npublish: false\r\nprivate: keep\r\n---\r\nBody\r\n';
    const parsed = parseVaultNote('02_notes/A.md', Buffer.from(original));
    expect(Buffer.from(updateSourceFlag(parsed, true)).toString()).toBe(
      original.replace('publish: false', 'publish: true'),
    );
    expect(Buffer.from(updateSourceFlag(parsed, false)).toString()).toBe(
      original.replace('publish: false\r\n', ''),
    );
  });
  it('strips private link destinations and unused definitions, retaining author labels or basename', async () => {
    const output = await transform({
      '02_notes/A.md': note(
        '[[hidden/Private]] [[hidden/Private|label]] [shown][x]\n\n[x]: hidden/Private.md\n[unused]: hidden/Private.md\n',
      ),
      '02_notes/hidden/Private.md':
        '---\naliases: [secret-alias]\ntitle: SECRET_TITLE\n---\nSECRET_BODY',
    });
    const markdown = output.get('02_notes/A.md')?.markdown ?? '';
    expect(markdown).toMatch(/Private label shown/u);
    expect(markdown).not.toMatch(/hidden|secret-alias|SECRET_|\.md/u);
  });
  it('does not transform code, inline code or escaped wiki syntax', async () => {
    const output = await transform({
      '02_notes/A.md': note('`[[missing]]`\n\n```text\n![[missing]]\n```\n\n\\[[missing]]\n'),
    });
    expect(output.get('02_notes/A.md')?.markdown).toContain('[[missing]]');
  });
  it('resolves Japanese paths, query strings and public heading anchors using the shared planner', async () => {
    const output = await transform(
      {
        '02_notes/A.md': note('[表示](<./日本 語.md?mode=1#見出し>)\n'),
        '02_notes/日本 語.md': note('## 見出し\n'),
      },
      emptyLedger(),
      { ...operation, targets: ['02_notes/A.md', '02_notes/日本 語.md'] },
    );
    expect(output.get('02_notes/A.md')?.markdown).toContain(
      '/memos/%E6%97%A5%E6%9C%AC%20%E8%AA%9E?mode=1#見出し',
    );
  });
  it('stops for ambiguous private/public stems rather than preferring public', async () => {
    await expect(
      transform({
        '02_notes/A.md': note('[[B]]'),
        '02_notes/B.md': note('B'),
        'private/B.md': 'Private',
      }),
    ).rejects.toThrow('ambiguous');
  });
  it.each(['[[missing]]', '![[missing]]', '![[A]]', '![[B#^block]]', '![[B#missing]]'])(
    'fails closed for %s',
    async (body) => {
      await expect(
        transform(
          { '02_notes/A.md': note(body), '02_notes/B.md': note('## Existing') },
          emptyLedger(),
          { ...operation, targets: ['02_notes/A.md', '02_notes/B.md'] },
        ),
      ).rejects.toThrow();
    },
  );
  it('requires separate approval for new embedded bodies even when publish is true', async () => {
    await expect(
      transform({ '02_notes/A.md': note('![[B]]'), '02_notes/B.md': note('Private') }),
    ).rejects.toThrow('approval');
  });
  it('allows repeat embeds and maps inside/outside fragments and footnotes to their actual public anchors', async () => {
    const b = note(
      '# B\n## Part\n[inside](#Part) [outside](#Other) foot[^n]\n\n[^n]: Approved footnote\n\n## Other\nOther body\n',
    );
    const ledger = emptyLedger();
    ledger.entries['02_notes/B.md'] = published('02_notes/B.md', b, {
      b: 'B',
      part: 'Part',
      other: 'Other',
    });
    const output = await transform(
      { '02_notes/A.md': note('# A\n![[B#Part]]\n\n![[B#Part]]\n'), '02_notes/B.md': b },
      ledger,
    );
    const markdown = output.get('02_notes/A.md')?.markdown ?? '';
    expect(markdown).toContain('[inside](#part)');
    expect(markdown).toContain('[inside](#part-2)');
    expect(markdown).toContain('/memos/B#other');
    expect(markdown).toContain('[^embed-1-n]');
    expect(markdown).toContain('[^embed-2-n]');
    expect(markdown).not.toContain('Other body');
  });
  it('rejects unapproved content edits and heading depth overflow', async () => {
    const b = note('## Part\nold');
    const ledger = emptyLedger();
    ledger.entries['02_notes/B.md'] = published('02_notes/B.md', b, { part: 'Part' });
    await expect(
      transform(
        { '02_notes/A.md': note('![[B]]'), '02_notes/B.md': b.replace('old', 'new') },
        ledger,
      ),
    ).rejects.toThrow('version');
    await expect(
      transform({ '02_notes/A.md': note('###### Parent\n![[B]]'), '02_notes/B.md': b }, ledger),
    ).rejects.toThrow('overflow');
  });
  it('refuses incomplete snapshots, root escape and missing ownership in normal mode', async () => {
    await expect(
      plan(
        { '02_notes/A.md': note('Body') },
        { source: { ...snapshot({}), complete: false } as unknown as Snapshot },
      ),
    ).rejects.toThrow();
    expect(() =>
      verifyOwnership(snapshot({ 'content/memos/A.md': 'Manual' }), undefined, true),
    ).toThrow();
    expect(() => verifyOwnership(snapshot({}), undefined, false)).toThrow();
    await expect(
      plan(
        { '02_notes/A.md': note('Body') },
        { operation: { ...operation, targets: ['02_notes/../private.md'] } },
      ),
    ).rejects.toThrow();
  });
  it('stops on bounded recursive depth, expansion count and body bytes before publishing', async () => {
    const ledger = emptyLedger();
    const files: Record<string, string> = { '02_notes/A.md': note('![[N1]]') };
    for (let index = 1; index <= 17; index += 1) {
      const name = `02_notes/N${index.toString()}.md`;
      const body = note(index === 17 ? 'End' : `![[N${(index + 1).toString()}]]`);
      files[name] = body;
      ledger.entries[name] = published(name, body);
    }
    await expect(transform(files, ledger)).rejects.toThrow('expansion limit');
    const repeated = note('Repeated approved body');
    const repeatLedger = emptyLedger();
    repeatLedger.entries['02_notes/B.md'] = published('02_notes/B.md', repeated);
    await expect(
      transform(
        {
          '02_notes/A.md': note(Array.from({ length: 257 }, () => '![[B]]').join('\n\n')),
          '02_notes/B.md': repeated,
        },
        repeatLedger,
      ),
    ).rejects.toThrow('expansion limit');
    await expect(
      transform({ '02_notes/A.md': note('x'.repeat(10 * 1024 * 1024 + 1)) }),
    ).rejects.toThrow('body size limit');
  });
  it('stops a B heading update that would break unchanged C rather than editing C without approval', async () => {
    const files = {
      '02_notes/B.md': note('## Old\nBody'),
      '02_notes/C.md': note('[[B#Old|Existing reference]]'),
    };
    const first = await buildImportPlan({
      operation: { ...operation, targets: Object.keys(files) },
      source: snapshot(files),
      rouault: snapshot({}),
      ledger: emptyLedger(),
      initializeEmpty: true,
      guards,
    });
    const ledger = emptyLedger();
    ledger.revision = 1;
    for (const [name, entry] of Object.entries(first.entries))
      ledger.entries[name] = {
        ...entry,
        rouaultCommitSha: 'b'.repeat(40),
        deploymentId: 'synthetic',
      };
    const publicInput = snapshot(Object.fromEntries(first.writes));
    await expect(
      buildImportPlan({
        operation: {
          ...operation,
          operationId: 'test-B-update',
          action: 'update',
          targets: ['02_notes/B.md'],
          expectedLedgerRevision: 1,
        },
        source: snapshot({ ...files, '02_notes/B.md': note('## New\nBody') }),
        rouault: publicInput,
        manifest: first.manifest,
        ledger,
        guards,
      }),
    ).rejects.toThrow('existing public reference would break');
    expect(
      Buffer.from(publicInput.files.get('content/memos/C.md')?.bytes ?? []).toString(),
    ).toContain('/memos/B#old');
  });
  it('does not persist operations view inside state.json', () => {
    expect(JSON.parse(serializeState(emptyLedger()))).toEqual({
      schemaVersion: 1,
      revision: 0,
      entries: {},
    });
  });
  it('preserves unrequested public inputs and produces deterministic no-change plans', async () => {
    const source = { '02_notes/A.md': note('Body') };
    const first = await plan(source);
    const publicFiles = Object.fromEntries(first.writes);
    const second = await plan(source, {
      rouault: snapshot(publicFiles),
      manifest: first.manifest,
      initializeEmpty: false,
    });
    expect(second.writes.size).toBe(0);
    expect(second.deletes).toEqual([]);
    expect(second.inputHash).toBe(first.inputHash);
  });
  it.each(['reference-image', 'frontmatter-cover'])(
    'retains owned assets used by an unchanged note through %s and removes only a verified orphan',
    async (kind) => {
      const image = await sharp({
        create: { width: 2, height: 2, channels: 3, background: '#445566' },
      })
        .png()
        .toBuffer();
      const source = snapshot({
        '02_notes/A.md': note('![Original](../assets/image.png)'),
        'assets/image.png': image,
      });
      const first = await buildImportPlan({
        operation,
        source,
        rouault: snapshot({}),
        ledger: emptyLedger(),
        initializeEmpty: true,
        guards,
      });
      const asset = [...first.writes.keys()].find((name) =>
        name.startsWith('content/_assets/memos-import/'),
      );
      const entry = first.entries['02_notes/A.md'];
      if (!asset || !entry) throw new Error('Synthetic asset entry missing');
      const ledger = emptyLedger();
      ledger.revision = 1;
      ledger.entries['02_notes/A.md'] = {
        ...entry,
        rouaultCommitSha: 'b'.repeat(40),
        deploymentId: 'synthetic',
      };
      const updated: PublicationOperation = {
        ...operation,
        action: 'update',
        operationId: `test-${kind}`,
        expectedLedgerRevision: 1,
      };
      const sharedNote =
        kind === 'reference-image'
          ? `![Shared][asset]\n\n[asset]: ${asset}\n`
          : `---\ncover: ${asset}\n---\nUnchanged existing note\n`;
      const input = {
        operation: updated,
        source: snapshot({ '02_notes/A.md': note('Updated body without image') }),
        ledger,
        manifest: first.manifest,
        guards,
        archiveReferencesVerified: true,
      };
      const publicFiles = Object.fromEntries(first.writes);
      const withConsumer = await buildImportPlan({
        ...input,
        rouault: snapshot({ ...publicFiles, 'content/notes/Synthetic.md': sharedNote }),
      });
      expect(withConsumer.deletes).not.toContain(asset);
      expect(withConsumer.manifest.files[asset]).toBe(first.manifest.files[asset]);
      expect(withConsumer.writes.has('content/notes/Synthetic.md')).toBe(false);
      const orphan = await buildImportPlan({ ...input, rouault: snapshot(publicFiles) });
      expect(orphan.deletes).toContain(asset);
      expect(orphan.manifest.files[asset]).toBeUndefined();
      const uncertainArchive = await buildImportPlan({
        ...input,
        archiveReferencesVerified: false,
        rouault: snapshot(publicFiles),
      });
      expect(uncertainArchive.deletes).not.toContain(asset);
    },
  );
  it('rejects resource guards without verified evidence and push aggregate overflow', () => {
    expect(() =>
      validatePushInput([Buffer.from('x')], 1, { ...guards, hostingEvidence: '' }),
    ).toThrow();
    expect(() =>
      validatePushInput([Buffer.from('123')], 10, { ...guards, maxPushBytes: 5 }),
    ).toThrow('limit');
  });
  it('strips synthesized JPEG GPS/EXIF metadata without changing decoded pixels or format', async () => {
    const image = await sharp({
      create: { width: 4, height: 4, channels: 3, background: '#663399' },
    })
      .jpeg()
      .withExif({
        IFD0: { Copyright: 'Synthetic metadata' },
        IFD3: { GPSLatitudeRef: 'N', GPSLatitude: '1/1 2/1 3/1' },
      })
      .toBuffer();
    const result = await preparePublicAsset(
      snapshot({ 'private/image.jpg': image }),
      'private/image.jpg',
      guards,
      true,
    );
    expect((await sharp(result.bytes).metadata()).exif).toBeUndefined();
    expect(result.bytes.subarray(0, 2).toString('hex')).toBe('ffd8');
    expect(result.publicPath).toBe(`content/_assets/memos-import/${hashBytes(result.bytes)}.jpg`);
  });
  it('applies rights checks to JPEG comments after the scan and removes approved comments without recompression', async () => {
    const image = await sharp({
      create: { width: 4, height: 4, channels: 3, background: '#aabbcc' },
    })
      .jpeg()
      .toBuffer();
    const marker = Buffer.from('SYNTHETIC_PRIVATE_JPEG_COMMENT');
    const comment = Buffer.alloc(marker.length + 4);
    comment[0] = 0xff;
    comment[1] = 0xfe;
    comment.writeUInt16BE(marker.length + 2, 2);
    marker.copy(comment, 4);
    const source = snapshot({
      'image.jpg': Buffer.concat([image.subarray(0, -2), comment, image.subarray(-2)]),
    });
    await expect(preparePublicAsset(source, 'image.jpg', guards, false)).rejects.toThrow(
      'rights metadata',
    );
    const output = await preparePublicAsset(source, 'image.jpg', guards, true);
    expect(output.bytes.includes(marker)).toBe(false);
    expect(output.bytes).toEqual(image);
  });
  it('rejects unverified JPEG bytes after EOI even when textual metadata removal was approved', async () => {
    const image = await sharp({
      create: { width: 4, height: 4, channels: 3, background: '#aabbcc' },
    })
      .jpeg()
      .toBuffer();
    const source = snapshot({
      'image.jpg': Buffer.concat([image, Buffer.from('SYNTHETIC_PRIVATE_JPEG_TRAILER')]),
    });
    await expect(preparePublicAsset(source, 'image.jpg', guards, true)).rejects.toThrow();
  });
  it.each(['pre-scan', 'inter-scan', 'post-scan'])(
    'checks COM/APP metadata throughout progressive JPEG: %s',
    async (position) => {
      const image = await sharp({
        create: { width: 16, height: 16, channels: 3, background: '#663399' },
      })
        .jpeg({ progressive: true })
        .toBuffer();
      const firstScan = image.indexOf(Buffer.from([0xff, 0xda]));
      const secondScan = image.indexOf(Buffer.from([0xff, 0xda]), firstScan + 2);
      expect(secondScan).toBeGreaterThan(firstScan);
      const at =
        position === 'pre-scan'
          ? firstScan
          : position === 'inter-scan'
            ? secondScan
            : image.length - 2;
      const marker = Buffer.from('SYNTHETIC_PRIVATE_PROGRESSIVE_COMMENT');
      for (const code of [0xfe, 0xe1, 0xed]) {
        const bytes = Buffer.concat([
          image.subarray(0, at),
          jpegSegment(code, marker),
          image.subarray(at),
        ]);
        const source = snapshot({ 'image.jpg': bytes });
        await expect(preparePublicAsset(source, 'image.jpg', guards, false)).rejects.toThrow(
          'rights metadata',
        );
        const output = await preparePublicAsset(source, 'image.jpg', guards, true);
        expect(output.bytes.includes(marker)).toBe(false);
        expect(output.bytes).toEqual(image);
        expect(await sharp(output.bytes).raw().toBuffer()).toEqual(
          await sharp(bytes).raw().toBuffer(),
        );
      }
      for (const code of [0xe2, 0xee]) {
        const bytes = Buffer.concat([
          image.subarray(0, at),
          jpegSegment(code, marker),
          image.subarray(at),
        ]);
        await expect(
          preparePublicAsset(snapshot({ 'image.jpg': bytes }), 'image.jpg', guards, true),
        ).rejects.toThrow('color metadata');
      }
    },
  );
  it('preserves stuffed entropy bytes and valid restart markers without recompression', async () => {
    const pixels = Buffer.from(
      Array.from({ length: 64 * 64 * 3 }, (_, index) => (index * 17 + (index >> 4) * 29) % 256),
    );
    const stuffed = await sharp(pixels, { raw: { width: 64, height: 64, channels: 3 } })
      .jpeg()
      .toBuffer();
    expect(stuffed.includes(Buffer.from([0xff, 0]))).toBe(true);
    // DC/AC係数0の二つのgrayscale MCUをinterval=1で区切る合成JPEG。
    const restart = Buffer.concat([
      Buffer.from([0xff, 0xd8]),
      jpegSegment(0xdb, Buffer.from([0, ...Array<number>(64).fill(1)])),
      jpegSegment(0xc0, Buffer.from([8, 0, 8, 0, 16, 1, 1, 0x11, 0])),
      jpegSegment(0xc4, Buffer.from([0, 1, ...Array<number>(15).fill(0), 0])),
      jpegSegment(0xc4, Buffer.from([0x10, 1, ...Array<number>(15).fill(0), 0])),
      jpegSegment(0xdd, Buffer.from([0, 1])),
      jpegSegment(0xda, Buffer.from([1, 1, 0, 0, 63, 0])),
      Buffer.from([0x3f, 0xff, 0xd0, 0x3f, 0xff, 0xd9]),
    ]);
    expect(await sharp(restart).raw().toBuffer()).toEqual(Buffer.alloc(16 * 8 * 3, 128));
    for (const image of [stuffed, restart]) {
      const output = await preparePublicAsset(
        snapshot({ 'image.jpg': image }),
        'image.jpg',
        guards,
        false,
      );
      expect(output.bytes).toEqual(image);
    }
  });
  it('stops on missing images, format spoofing and metadata whose display safety is unverified', async () => {
    await expect(preparePublicAsset(snapshot({}), 'image.png', guards, false)).rejects.toThrow();
    const png = await sharp({
      create: { width: 2, height: 2, channels: 4, background: '#ff000080' },
    })
      .png()
      .toBuffer();
    await expect(
      preparePublicAsset(snapshot({ 'image.jpg': png }), 'image.jpg', guards, false),
    ).rejects.toThrow('spoofed');
    const safe = await preparePublicAsset(
      snapshot({ 'image.png': png }),
      'image.png',
      guards,
      false,
    );
    expect(safe.bytes.equals(png)).toBe(true);
  });
  it('removes synthesized WebP EXIF while preserving lossless alpha pixels and stops on unapproved rights metadata', async () => {
    const image = await sharp({
      create: { width: 4, height: 4, channels: 4, background: '#44556680' },
    })
      .webp({ lossless: true })
      .withExif({ IFD0: { Copyright: 'SYNTHETIC_WEBP_PRIVATE_NOTICE' } })
      .toBuffer();
    expect(image.includes(Buffer.from('SYNTHETIC_WEBP_PRIVATE_NOTICE'))).toBe(true);
    const source = snapshot({ 'image.webp': image });
    await expect(preparePublicAsset(source, 'image.webp', guards, false)).rejects.toThrow(
      'rights metadata',
    );
    const result = await preparePublicAsset(source, 'image.webp', guards, true);
    expect(result.bytes.toString('ascii', 0, 4)).toBe('RIFF');
    expect(result.bytes.includes(Buffer.from('SYNTHETIC_WEBP_PRIVATE_NOTICE'))).toBe(false);
    expect((await sharp(result.bytes).metadata()).exif).toBeUndefined();
    expect((await sharp(result.bytes).metadata()).hasAlpha).toBe(true);
    expect(await sharp(result.bytes).raw().toBuffer()).toEqual(await sharp(image).raw().toBuffer());
  });
  it('stops on orientation and ICC display metadata even when textual rights removal is approved', async () => {
    const base = () =>
      sharp({ create: { width: 4, height: 2, channels: 3, background: '#663399' } }).jpeg();
    const orientation = await base()
      .withExif({ IFD0: { Orientation: '6' } })
      .toBuffer();
    // Sharp normalizes new EXIF Orientation; construct the unsafe source tag directly.
    const tiff = orientation.indexOf(Buffer.from('Exif\0\0')) + 6;
    const littleEndian = orientation.toString('ascii', tiff, tiff + 2) === 'II';
    const read16 = (at: number) =>
      littleEndian ? orientation.readUInt16LE(at) : orientation.readUInt16BE(at);
    const firstIfd =
      tiff +
      (littleEndian ? orientation.readUInt32LE(tiff + 4) : orientation.readUInt32BE(tiff + 4));
    let found = false;
    for (let index = 0; index < read16(firstIfd); index += 1) {
      const at = firstIfd + 2 + index * 12;
      if (read16(at) !== 0x0112) continue;
      if (littleEndian) orientation.writeUInt16LE(6, at + 8);
      else orientation.writeUInt16BE(6, at + 8);
      found = true;
      break;
    }
    expect(found).toBe(true);
    expect((await sharp(orientation).metadata()).icc).toBeUndefined();
    expect((await sharp(orientation).metadata()).orientation).toBe(6);
    await expect(
      preparePublicAsset(snapshot({ 'rotated.jpg': orientation }), 'rotated.jpg', guards, true),
    ).rejects.toThrow('display metadata');
    const color = await base().withMetadata().toBuffer();
    expect((await sharp(color).metadata()).icc).toBeDefined();
    await expect(
      preparePublicAsset(snapshot({ 'profile.jpg': color }), 'profile.jpg', guards, true),
    ).rejects.toThrow('display metadata');
  });
  it('keeps a verified metadata-free AVIF byte-for-byte and rejects EXIF or unknown boxes', async () => {
    const create = () =>
      sharp({ create: { width: 2, height: 2, channels: 4, background: '#12345680' } }).avif();
    const image = await create().toBuffer();
    const safe = await preparePublicAsset(
      snapshot({ 'image.avif': image }),
      'image.avif',
      guards,
      false,
    );
    expect(safe.bytes.equals(image)).toBe(true);
    const privateImage = await create()
      .withExif({ IFD0: { Copyright: 'SYNTHETIC_PRIVATE' } })
      .toBuffer();
    await expect(
      preparePublicAsset(snapshot({ 'image.avif': privateImage }), 'image.avif', guards, true),
    ).rejects.toThrow('review');
    const unknown = Buffer.concat([image, Buffer.from('0000000866726565', 'hex')]);
    await expect(
      preparePublicAsset(snapshot({ 'image.avif': unknown }), 'image.avif', guards, true),
    ).rejects.toThrow();
  });
});

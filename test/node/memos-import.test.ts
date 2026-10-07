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

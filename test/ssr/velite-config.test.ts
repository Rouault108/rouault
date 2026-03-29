import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('velite config', () => {
  it('ノートの frontmatter では title が optional ではないこと', () => {
    const configPath = new URL('../../velite.config.ts', import.meta.url);
    const source = readFileSync(configPath, 'utf8');

    expect(source).toContain('title: s.string(),');
    expect(source).not.toContain('title: s.string().optional(),');
  });

  it('ノートの frontmatter で kind を受け付け、既定を reader に正規化すること', () => {
    const configPath = new URL('../../velite.config.ts', import.meta.url);
    const source = readFileSync(configPath, 'utf8');

    expect(source).toContain('kind: s.enum(NOTE_CONTENT_KINDS).optional(),');
    expect(source).toContain('const kind = normalizeNoteContentKind(data.kind);');
    expect(source).toContain('validateNoteContentContracts(kind, data.content, data.slug);');
  });

  it('rehypeAnnotateLinkKinds が rehypeRouaultComponents の直後に挿入されていること', () => {
    const configPath = new URL('../../velite.config.ts', import.meta.url);
    const source = readFileSync(configPath, 'utf8');

    expect(source).toContain(
      "import { rehypeAnnotateLinkKinds } from './lib/rehype/annotate-link-kinds.js';",
    );
    expect(source).toContain(
      "import { rehypeStaticCodeGroups } from './lib/rehype/static-code-groups.js';",
    );

    const shikiCodeBlocksIndex = source.indexOf('rehypeShikiCodeBlocks,');
    const staticCodeGroupsIndex = source.indexOf('rehypeStaticCodeGroups,');
    const rouaultComponentsIndex = source.indexOf('rehypeRouaultComponents,');
    const annotateLinkKindsIndex = source.indexOf('rehypeAnnotateLinkKinds(),');
    const inlineCodeTranslateNoIndex = source.indexOf('rehypeInlineCodeTranslateNo,');

    expect(shikiCodeBlocksIndex).toBeGreaterThan(-1);
    expect(staticCodeGroupsIndex).toBeGreaterThan(shikiCodeBlocksIndex);
    expect(rouaultComponentsIndex).toBeGreaterThan(-1);
    expect(rouaultComponentsIndex).toBeGreaterThan(staticCodeGroupsIndex);
    expect(annotateLinkKindsIndex).toBeGreaterThan(rouaultComponentsIndex);
    expect(inlineCodeTranslateNoIndex).toBeGreaterThan(annotateLinkKindsIndex);
  });

  it('Velite の linked files 自動コピーを無効化して Rouault 側の画像解決に委ねること', () => {
    const configPath = new URL('../../velite.config.ts', import.meta.url);
    const source = readFileSync(configPath, 'utf8');

    expect(source).toContain('copyLinkedFiles: false,');
  });
});

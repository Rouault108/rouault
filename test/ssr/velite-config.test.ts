import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('velite config', () => {
  it('ノートの frontmatter では title が optional ではないこと', () => {
    const configPath = new URL('../../velite.config.ts', import.meta.url);
    const source = readFileSync(configPath, 'utf8');

    expect(source).toContain('title: s.string(),');
    expect(source).not.toContain('title: s.string().optional(),');
  });

  it('rehypeAnnotateLinkKinds が rehypeRouaultComponents の直後に挿入されていること', () => {
    const configPath = new URL('../../velite.config.ts', import.meta.url);
    const source = readFileSync(configPath, 'utf8');

    expect(source).toContain(
      "import { rehypeAnnotateLinkKinds } from './lib/rehype/annotate-link-kinds.js';",
    );

    const rouaultComponentsIndex = source.indexOf('rehypeRouaultComponents,');
    const annotateLinkKindsIndex = source.indexOf('rehypeAnnotateLinkKinds(),');
    const inlineCodeTranslateNoIndex = source.indexOf('rehypeInlineCodeTranslateNo,');

    expect(rouaultComponentsIndex).toBeGreaterThan(-1);
    expect(annotateLinkKindsIndex).toBeGreaterThan(rouaultComponentsIndex);
    expect(inlineCodeTranslateNoIndex).toBeGreaterThan(annotateLinkKindsIndex);
  });
});
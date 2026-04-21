import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('velite config', () => {
  it('ノートの frontmatter では title が optional ではないこと', () => {
    const configPath = new URL('../../velite.config.ts', import.meta.url);
    const source = readFileSync(configPath, 'utf8');

    expect(source).toContain('title: s.string(),');
    expect(source).not.toContain('title: s.string().optional(),');
  });

  it('content と test fixture content の両方を入力対象にし、sourceRoot と slug を正規化すること', () => {
    const configPath = new URL('../../velite.config.ts', import.meta.url);
    const source = readFileSync(configPath, 'utf8');

    expect(source).toContain("pattern: ['content/**/*.md', 'test/fixtures/content/**/*.md'],");
    expect(source).toContain(
      "import { resolveNoteSourceLocation } from './shared/note/note-source-root.js';",
    );
    expect(source).toContain("const sourcePath = typeof data.slug === 'string' ? data.slug : '';");
    expect(source).toContain('const { sourceRoot, slug } = resolveNoteSourceLocation(sourcePath);');
    expect(source).toContain('slug,');
    expect(source).toContain('sourceRoot,');
  });

  it('ノートの frontmatter で kind を受け付け、保存前に surface HTML へ正規化してから契約検証すること', () => {
    const configPath = new URL('../../velite.config.ts', import.meta.url);
    const source = readFileSync(configPath, 'utf8');

    expect(source).toContain('kind: s.enum(NOTE_CONTENT_KINDS).optional(),');
    expect(source).toContain('testingArea: s.enum(TESTING_AREAS).optional(),');
    expect(source).toContain('e2eFixtureId: s.string().optional(),');
    expect(source).toContain('const kind = normalizeNoteContentKind(data.kind);');
    expect(source).toContain('const testingArea = normalizeTestingArea(data.testingArea);');
    expect(source).toContain('const e2eFixtureId =');
    expect(source).toContain(
      'const normalizedContent = normalizeRouaultStaticSurfaceHtml(data.content);',
    );
    expect(source).toContain('validateNoteMetadataContracts(kind, testingArea, sourcePath);');
    expect(source).toContain(
      'validateNoteContentContracts(kind, normalizedContent, sourcePath, testingArea);',
    );
    expect(source).toContain('content: normalizedContent,');
  });

  it('remarkGfm を Markdown frontmatter pipeline に含めること', () => {
    const configPath = new URL('../../velite.config.ts', import.meta.url);
    const source = readFileSync(configPath, 'utf8');

    expect(source).toContain("import remarkGfm from 'remark-gfm';");

    const remarkMathIndex = source.indexOf('remarkMath,');
    const remarkGfmIndex = source.indexOf('[remarkGfm, { singleTilde: false }],');
    const expandExamplesIndex = source.indexOf('remarkExpandExampleIncludes,');

    expect(remarkMathIndex).toBeGreaterThan(-1);
    expect(remarkGfmIndex).toBeGreaterThan(-1);
    expect(expandExamplesIndex).toBeGreaterThan(-1);
    expect(remarkGfmIndex).toBeGreaterThan(remarkMathIndex);
    expect(expandExamplesIndex).toBeGreaterThan(remarkGfmIndex);
  });

  it('remarkGfm を singleTilde=false で登録すること', () => {
    const configPath = new URL('../../velite.config.ts', import.meta.url);
    const source = readFileSync(configPath, 'utf8');

    expect(source).toContain("import remarkGfm from 'remark-gfm';");
    expect(source).toContain('[remarkGfm, { singleTilde: false }]');
  });

  it('rehypeAnnotateLinkKinds が heading/permalink 系処理の後段に配置されていること', () => {
    const configPath = new URL('../../velite.config.ts', import.meta.url);
    const source = readFileSync(configPath, 'utf8');

    expect(source).toContain(
      "import { rehypeAnnotateLinkKinds } from './build/rehype/annotate-link-kinds.js';",
    );
    expect(source).toContain(
      "import { rehypeStaticCodeGroups } from './build/rehype/static-code-groups.js';",
    );

    const shikiCodeBlocksIndex = source.indexOf('rehypeShikiCodeBlocks,');
    const rouaultComponentsImportIndex = source.indexOf('rehypeRouaultComponents,');
    const headingIdsIndex = source.lastIndexOf('rehypeHeadingIds,');
    const staticCodeGroupsIndex = source.lastIndexOf('rehypeStaticCodeGroups,');
    const rouaultComponentsIndex = source.lastIndexOf('rehypeRouaultComponents,');
    const annotateLinkKindsIndex = source.indexOf('rehypeAnnotateLinkKinds(),');
    const inlineCodeTranslateNoIndex = source.indexOf('rehypeInlineCodeTranslateNo,');

    expect(shikiCodeBlocksIndex).toBeGreaterThan(-1);
    expect(rouaultComponentsImportIndex).toBeGreaterThan(-1);
    expect(headingIdsIndex).toBeGreaterThan(-1);
    expect(rouaultComponentsIndex).toBeGreaterThan(-1);
    expect(rouaultComponentsIndex).toBeLessThan(headingIdsIndex);
    expect(staticCodeGroupsIndex).toBeGreaterThan(shikiCodeBlocksIndex);
    expect(rouaultComponentsIndex).toBeGreaterThan(-1);
    expect(staticCodeGroupsIndex).toBeGreaterThan(headingIdsIndex);
    expect(annotateLinkKindsIndex).toBeGreaterThan(rouaultComponentsIndex);
    expect(annotateLinkKindsIndex).toBeGreaterThan(staticCodeGroupsIndex);
    expect(inlineCodeTranslateNoIndex).toBeGreaterThan(annotateLinkKindsIndex);
  });

  it('脚注見出し正規化のため rehypeRouaultComponents が rehypeHeadingIds より前に配置されていること', () => {
    const configPath = new URL('../../velite.config.ts', import.meta.url);
    const source = readFileSync(configPath, 'utf8');

    const rouaultComponentsIndex = source.lastIndexOf('rehypeRouaultComponents,');
    const headingIdsIndex = source.lastIndexOf('rehypeHeadingIds,');

    expect(rouaultComponentsIndex).toBeGreaterThan(-1);
    expect(headingIdsIndex).toBeGreaterThan(-1);
    expect(rouaultComponentsIndex).toBeLessThan(headingIdsIndex);
  });

  it('Velite の linked files 自動コピーを無効化して Rouault 側の画像解決に委ねること', () => {
    const configPath = new URL('../../velite.config.ts', import.meta.url);
    const source = readFileSync(configPath, 'utf8');

    expect(source).toContain('copyLinkedFiles: false,');
  });
});

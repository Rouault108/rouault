import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { createStaticRenderIdContext } from '../../shared/static-render-id-context.js';

const repositoryRoot = process.cwd();

const readSource = (path: string): string => readFileSync(join(repositoryRoot, path), 'utf8');

describe('StaticRenderIdContext', () => {
  it('同一 document namespace の canonical traversal order で安定した ID を生成すること', () => {
    const first = createStaticRenderIdContext('content/notes/example.md');
    const second = createStaticRenderIdContext('content/notes/example.md');

    expect([first.nextId('copy-source'), first.nextId('copy-source'), first.nextId('task-list-label')]).toEqual([
      second.nextId('copy-source'),
      second.nextId('copy-source'),
      second.nextId('task-list-label'),
    ]);
  });

  it('document ごとに counter state を共有しないこと', () => {
    const first = createStaticRenderIdContext('content/notes/first.md');
    const second = createStaticRenderIdContext('content/notes/second.md');

    expect(first.nextId('copy-source')).not.toBe(second.nextId('copy-source'));
    expect(first.nextId('copy-source')).toContain('copy-source-2');
    expect(second.nextId('copy-source')).toContain('copy-source-2');
  });

  it('shared static copy helper は ID context を import せず explicit statusId だけを受け取ること', () => {
    const source = readSource('shared/static-copy-button-html.ts');

    expect(source).toContain('readonly statusId: string;');
    expect(source).not.toContain('static-render-id-context');
    expect(source).not.toContain('createStaticRenderIdContext');
  });

  it('static rendering path に禁止された module-level counter token を残さないこと', () => {
    const productionSources = [
      'shared/static-copy-button-html.ts',
      'build/rehype/shiki-code-blocks.ts',
      'build/rehype/static-code-groups.ts',
      'build/rehype/rouault-components.ts',
      'src/layouts/article-header-html.ts',
    ];
    const forbiddenTokens = [
      'staticCopyButtonCounter',
      'codeCopySourceCounter',
      'codeGroupCounter',
      'taskListItemCounter',
      'taskListLabelCounter',
      'scoreDescriptionCounter',
      'syntaxSectionHeadingCount',
      'footnoteGeneratedIdCounter',
      'imageCaptionCounter',
      'lightboxCounter',
      'articleHeaderCounter',
    ];

    for (const path of productionSources) {
      const source = readSource(path);
      for (const token of forbiddenTokens) {
        expect(source, `${path} must not contain ${token}`).not.toContain(token);
      }
    }
  });
});

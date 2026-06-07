import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const repoRoot = process.cwd();

const readDoc = (path: string): string =>
  readFileSync(join(repoRoot, path), 'utf8').replace(/\r\n/gu, '\n');

const escapeRegExp = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/gu, String.raw`\$&`);

const headingLevel = (line: string): number | undefined => {
  const match = /^(#{1,6})\s+\S/u.exec(line);
  const marker = match?.[1];
  return marker === undefined ? undefined : marker.length;
};

const extractSection = (markdown: string, heading: string): string => {
  const lines = markdown.split(/\r?\n/u);
  const headingPattern = new RegExp(`^${escapeRegExp(heading)}\\s*$`, 'u');
  const start = lines.findIndex((line) => headingPattern.test(line));
  expect(start, heading).toBeGreaterThanOrEqual(0);

  const startLine = lines[start];
  if (startLine === undefined) {
    throw new Error(`${heading} section start is missing`);
  }

  const level = headingLevel(startLine);
  if (level === undefined) {
    throw new Error(`${heading} is not a markdown heading`);
  }

  let end = lines.length;
  for (let index = start + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (line === undefined) continue;
    const nextLevel = headingLevel(line);
    if (nextLevel !== undefined && nextLevel <= level) {
      end = index;
      break;
    }
  }

  return lines.slice(start, end).join('\n');
};

const expectSectionNotToContain = (
  markdown: string,
  heading: string,
  tokens: readonly string[],
): void => {
  const section = extractSection(markdown, heading);
  for (const token of tokens) {
    expect(section, `${heading} must not contain ${token}`).not.toContain(token);
  }
};

const expectTextNotToContain = (text: string, label: string, tokens: readonly string[]): void => {
  for (const token of tokens) {
    expect(text, `${label} must not contain ${token}`).not.toContain(token);
  }
};

describe('static-first document contracts', () => {
  it('keeps the checkbox entrypoint focused on native and task-list static markup', () => {
    const markdown = readDoc('docs/design-system/components/checkbox.md');
    const currentContract = extractSection(markdown, '## 現行契約');

    expect(currentContract).toContain('<input type="checkbox">');
    expect(currentContract).toContain('Task-list static markup');
    expect(currentContract).not.toContain('ui-checkbox');

    for (const token of [
      'Shadow DOM',
      'Form-Associated Custom Element',
      'FACE',
      'ElementInternals',
      'property API',
      'custom event',
      'custom method',
      'checkValidity()',
      'reportValidity()',
      'focus()',
      'blur()',
    ]) {
      expect(currentContract, token).not.toContain(token);
    }
  });

  it('documents the static checkbox contract without returning ui-checkbox to migration targets', () => {
    const markdown = readDoc('docs/contracts/static-checkbox.md');
    const currentContract = extractSection(markdown, '## 現行契約');
    const migrationTargets = readDoc('build/content/static-first-migration-targets.ts');

    expect(currentContract).toContain('<input type="checkbox">');
    expect(currentContract).toContain('Task-list static markup');
    expect(currentContract).not.toContain('ui-checkbox');
    expect(migrationTargets).not.toMatch(/tag:\s*['"]ui-checkbox['"]/u);
  });

  it('keeps legacy checkbox custom element wording isolated under docs/old', () => {
    const legacyMarkdown = readDoc('docs/old/design-system/ui-checkbox.md');
    const entrypointMarkdown = readDoc('docs/design-system/components/checkbox.md');

    expect(legacyMarkdown).toContain('廃止済み');
    expect(legacyMarkdown).toContain('現行実装契約ではありません');
    expect(legacyMarkdown).toContain('Shadow DOM');
    expect(legacyMarkdown).toContain('Form-Associated Custom Element');
    expect(entrypointMarkdown).toContain('docs/old/design-system/ui-checkbox.md');
  });

  it('checks reduced static select, kbd, and skeleton docs by current-contract section', () => {
    expectSectionNotToContain(readDoc('docs/contracts/static-select.md'), '## 現行契約', [
      'src/layouts/form-control-html.ts',
      'src/layouts/select-html.ts',
      'src/layouts/static-select-html.ts',
      'src/assets/css/select.css',
      'docs/contracts/static-form-controls.md',
      'renderStaticSelectHtml',
      'renderStaticFormControlHtml',
      'renderSelectHtml',
      'renderStaticNativeSelectHtml',
    ]);

    expectSectionNotToContain(readDoc('docs/contracts/static-kbd.md'), '## 現行契約', [
      'src/layouts/kbd-html.ts',
      'renderStaticKbdHtml',
      'ui-kbd[tokens]',
      'tokens property',
      'component-level composite shortcut rendering',
      'key reading normalization',
      'sr-only reading support',
      'slot fallback',
    ]);

    const staticSkeleton = readDoc('docs/contracts/static-skeleton.md');
    expectTextNotToContain(
      [
        extractSection(staticSkeleton, '## Global `.skeleton` Utility'),
        extractSection(staticSkeleton, '## `ui-file-tree` Internal Skeleton'),
      ].join('\n'),
      'static skeleton current sections',
      ['src/layouts/skeleton-html.ts', 'src/assets/css/skeleton.css'],
    );
  });

  it('keeps static icon and empty-state trusted HTML fields within their documented boundaries', () => {
    const staticIcon = readDoc('docs/contracts/static-icon.md');
    const emptyState = readDoc('docs/contracts/static-empty-state.md');
    const futureTrustedHtml = extractSection(
      emptyState,
      '## Future constraints only: trusted static HTML',
    );

    expect(staticIcon).toContain('renderStaticIconHtml()');
    expectSectionNotToContain(staticIcon, '## Decorative Icon', ['<ui-icon>', 'iconify-icon']);
    expectSectionNotToContain(staticIcon, '## Semantic Icon', ['<ui-icon>', 'iconify-icon']);
    expectSectionNotToContain(staticIcon, '## SVG Contract', ['<ui-icon>', 'iconify-icon']);

    for (const token of ['trustedIconHtml', 'trustedIllustrationHtml', 'trustedActionsHtml']) {
      expect(futureTrustedHtml, token).toContain(token);
      expect(emptyState.replace(futureTrustedHtml, ''), token).not.toContain(token);
    }
  });

  it('does not introduce a shared static form-controls contract document', () => {
    expect(existsSync(join(repoRoot, 'docs/contracts/static-form-controls.md'))).toBe(false);
  });
});

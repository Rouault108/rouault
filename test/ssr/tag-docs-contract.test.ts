import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const tagDocs = readFileSync(
  resolve(process.cwd(), 'docs/design-system/components/tag.md'),
  'utf8',
);

const extractMarkdownSection = (markdown: string, heading: string, level = 3): string => {
  const marker = '#'.repeat(level);
  const headingPattern = new RegExp(
    `^${marker} ${heading.replace(/[.*+?^${}()|[\]\\\\]/gu, '\\$&')}\\s*$`,
    'mu',
  );
  const match = headingPattern.exec(markdown);
  if (!match || match.index === undefined) {
    throw new Error(`${heading} section が見つかりません`);
  }

  const start = match.index;
  const nextHeading = new RegExp(`^#{1,${level}} .+$`, 'gmu');
  nextHeading.lastIndex = start + match[0].length;
  const next = nextHeading.exec(markdown);
  return markdown.slice(start, next?.index ?? markdown.length);
};

describe('ui-tag docs contract', () => {
  it('public API sections do not expose unimplemented label/value override inputs', () => {
    const publicApiSections = [
      extractMarkdownSection(tagDocs, '要約', 2),
      extractMarkdownSection(tagDocs, '公開契約', 2),
      extractMarkdownSection(tagDocs, '入力契約'),
      extractMarkdownSection(tagDocs, '入力の意味制約'),
      extractMarkdownSection(tagDocs, '属性反映契約'),
      extractMarkdownSection(tagDocs, 'DOM / アクセシビリティ', 2),
      extractMarkdownSection(tagDocs, 'アクセシブル名・ローカライズ契約'),
      extractMarkdownSection(tagDocs, 'ラベル値契約'),
      extractMarkdownSection(tagDocs, 'Storybook 契約', 2),
    ].join('\n');

    expect(publicApiSections).not.toMatch(/\bremoveLabel\b|\bgroupLabel\b/u);
    expect(publicApiSections).not.toMatch(/\bremove-label\b|\bgroup-label\b/u);
    expect(publicApiSections).not.toMatch(/\|\s*`value`\s*\|/u);
    expect(publicApiSections).not.toMatch(/`value`[、,]\s*`removeLabel`[、,]\s*`groupLabel`/u);
    expect(publicApiSections).not.toMatch(/`value`\s*を公開入力/u);
    expect(publicApiSections).not.toContain('`value` を安定識別子');
    expect(publicApiSections).not.toContain('`value` によって固定');
    expect(publicApiSections).not.toContain('value を指定');
    expect(publicApiSections).toContain('可視ラベルを trim');
  });

  it('remove event docs keep propagation contract and current detail.value source', () => {
    const eventSection = [
      extractMarkdownSection(tagDocs, '公開イベント'),
      extractMarkdownSection(tagDocs, 'イベント伝播契約'),
    ].join('\n');

    expect(eventSection).toContain('| `ui-tag-remove` |');
    expect(eventSection).toContain('| `true`  | `true`   | `false`');
    expect(eventSection).toContain('公開入力 `value` 由来ではありません');
    expect(eventSection).toContain('可視ラベルの trim 結果');
  });
});

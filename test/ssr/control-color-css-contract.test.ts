import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  findLastDeclarationRuleOrderForSelector,
  hasDeclarationForSelector,
  hasDeclarationValueIncluding,
  lacksDeclarationPropertyForSelector,
} from './support/css-contract.js';

const readSource = (path: string): string => readFileSync(resolve(process.cwd(), path), 'utf8');

const extractCss = (source: string): string => {
  const match = source.match(/static override styles = css`(?<css>[\s\S]*?)`;/u);
  if (!match?.groups?.['css']) {
    throw new Error('Lit CSS template が見つかりません');
  }
  return match.groups['css'];
};

const extractExportedCss = (source: string, exportName: string): string => {
  const marker = `export const ${exportName} = css\``;
  const startIndex = source.indexOf(marker);
  const endIndex = startIndex < 0 ? -1 : source.indexOf('`;', startIndex + marker.length);
  const css =
    startIndex < 0 || endIndex < 0 ? null : source.slice(startIndex + marker.length, endIndex);
  if (css === null) {
    throw new Error(`${exportName} の Lit CSS template が見つかりません`);
  }
  return css;
};

const layoutHeaderCss = extractCss(readSource('src/components/layout/layout-header.ts'));
const searchTriggerCss = extractCss(
  readSource('src/components/ui/search-trigger/search-trigger.ts'),
);
const searchFieldCss = extractCss(readSource('src/components/ui/search-field/search-field.ts'));
const searchDialogCss = extractExportedCss(
  readSource('src/components/ui/search-dialog/search-dialog.styles.ts'),
  'searchDialogStyles',
).replace(/\$\{unsafeCSS[\s\S]*?\)\}/u, '');
const inputCss = extractCss(readSource('src/components/ui/input/input.ts'));
const textareaCss = extractCss(readSource('src/components/ui/textarea/textarea.ts'));
const selectCss = extractCss(readSource('src/components/ui/select/select.ts'));
const dropdownSource = readSource('src/components/ui/dropdown/dropdown.ts');
const dropdownCss = Array.from(
  dropdownSource.matchAll(/static override styles = css`(?<css>[\s\S]*?)`;/gu),
)
  .map((match) => match.groups?.['css'] ?? '')
  .join('\n');

describe('control color css contract', () => {
  it('header and search trigger use control label / affordance tokens', () => {
    expect(
      hasDeclarationValueIncluding(
        layoutHeaderCss,
        '.theme-trigger-label',
        'color',
        'var(--fg-control-label',
      ),
    ).toBe(true);
    for (const selector of [
      '.theme-trigger-icon',
      '.theme-trigger-chevron',
      '.corpus-trigger-icon',
    ]) {
      expect(
        hasDeclarationValueIncluding(
          layoutHeaderCss,
          selector,
          'color',
          'var(--fg-control-affordance',
        ),
      ).toBe(true);
      expect(lacksDeclarationPropertyForSelector(layoutHeaderCss, selector, 'opacity')).toBe(true);
    }

    expect(
      hasDeclarationValueIncluding(
        searchTriggerCss,
        'ui-button::part(button)',
        '--search-trigger-rest-background',
        'var(--bg-control-muted',
      ),
    ).toBe(true);
    expect(
      hasDeclarationValueIncluding(
        searchTriggerCss,
        '.placeholder',
        'color',
        'var(--fg-control-label',
      ),
    ).toBe(true);
    expect(
      hasDeclarationValueIncluding(
        searchTriggerCss,
        '.icon',
        'color',
        'var(--fg-control-affordance',
      ),
    ).toBe(true);
    expect(
      hasDeclarationForSelector(
        searchDialogCss,
        '.close-button',
        'color',
        'var(--fg-control-affordance)',
      ),
    ).toBe(true);
    expect(
      hasDeclarationForSelector(
        searchTriggerCss,
        ':host([disabled]) .placeholder',
        'color',
        'var(--fg-disabled)',
      ),
    ).toBe(true);
    expect(
      hasDeclarationForSelector(
        searchTriggerCss,
        ':host([disabled]) .placeholder',
        'color',
        'GrayText',
        {
          scope: 'forced-colors',
        },
      ),
    ).toBe(true);
  });

  it('search field keeps input transparent and readonly background-free', () => {
    expect(
      hasDeclarationValueIncluding(
        searchFieldCss,
        ':host',
        '--ui-search-field-bg',
        'var(--bg-control-muted',
      ),
    ).toBe(true);
    expect(hasDeclarationForSelector(searchFieldCss, 'input', 'background', 'transparent')).toBe(
      true,
    );
    expect(
      hasDeclarationValueIncluding(
        searchFieldCss,
        'input::placeholder',
        'color',
        'var(--fg-placeholder',
      ),
    ).toBe(true);
    expect(
      lacksDeclarationPropertyForSelector(
        searchFieldCss,
        'input:read-only:not(:disabled)',
        'background',
      ),
    ).toBe(true);
    expect(
      hasDeclarationForSelector(searchFieldCss, 'input:disabled', 'color', 'var(--fg-disabled)'),
    ).toBe(true);
  });

  it('input and textarea use control-muted field surfaces without overriding disabled readonly', () => {
    expect(
      hasDeclarationValueIncluding(inputCss, 'input', 'background', 'var(--bg-control-muted'),
    ).toBe(true);
    expect(
      hasDeclarationValueIncluding(
        inputCss,
        'input:read-only:not(:disabled)',
        'background',
        'var(--bg-control-muted',
      ),
    ).toBe(true);
    expect(
      hasDeclarationValueIncluding(
        inputCss,
        ":host([variant='outline']) input",
        'background',
        'var(--bg-default',
      ),
    ).toBe(true);
    expect(
      findLastDeclarationRuleOrderForSelector(
        inputCss,
        ":host([variant='outline']) input:read-only:not(:disabled)",
        'background',
      ),
    ).toBeGreaterThan(
      findLastDeclarationRuleOrderForSelector(
        inputCss,
        'input:read-only:not(:disabled)',
        'background',
      ),
    );

    expect(
      hasDeclarationValueIncluding(textareaCss, 'textarea', 'background', 'var(--bg-control-muted'),
    ).toBe(true);
    expect(
      hasDeclarationValueIncluding(
        textareaCss,
        'textarea:read-only:not(:disabled)',
        'background',
        'var(--bg-control-muted',
      ),
    ).toBe(true);
    expect(textareaCss).not.toContain("variant='outline'");
  });

  it('select trigger, chevron, option portal, and dropdown follow control color roles', () => {
    expect(
      hasDeclarationValueIncluding(selectCss, '.trigger', 'background', 'var(--bg-control-muted'),
    ).toBe(true);
    expect(
      hasDeclarationValueIncluding(
        selectCss,
        '.trigger--placeholder',
        'color',
        'var(--fg-control-label',
      ),
    ).toBe(true);
    expect(
      hasDeclarationValueIncluding(
        selectCss,
        '.trigger::placeholder',
        'color',
        'var(--fg-control-label',
      ),
    ).toBe(true);
    expect(
      hasDeclarationValueIncluding(
        selectCss,
        '.trigger--opened:not(:disabled)',
        'background',
        'linear-gradient(var(--bg-active)',
      ),
    ).toBe(true);
    expect(
      findLastDeclarationRuleOrderForSelector(
        selectCss,
        ':host([readonly]:not([disabled])) .trigger--opened',
        'background',
      ),
    ).toBeGreaterThan(
      findLastDeclarationRuleOrderForSelector(
        selectCss,
        '.trigger--opened:not(:disabled)',
        'background',
      ),
    );
    expect(
      hasDeclarationValueIncluding(
        selectCss,
        '.icon-chevron',
        'color',
        'var(--fg-control-affordance',
      ),
    ).toBe(true);
    expect(selectCss).toContain('color: GrayText;');
    expect(dropdownCss).toContain('color: var(--fg-disabled)');
    expect(dropdownCss).toContain('scrollbar-color: var(--scrollbar-thumb');
  });
});

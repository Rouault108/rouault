import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  hasDeclarationForSelector,
  hasDeclarationPropertyForSelector,
  hasDeclarationValueIncluding,
  lacksDeclarationPropertyForSelector,
} from './support/css-contract.js';

const source = readFileSync(resolve(process.cwd(), 'src/components/ui/button/button.ts'), 'utf8');
const cssText = source.match(/static override styles = css`(?<css>[\s\S]*?)`;/u)?.groups?.['css'];

if (!cssText) {
  throw new Error('ui-button の CSS が見つかりません');
}

describe('button state css contract', () => {
  it('separates disabled and loading visuals without disabling pointer events on the button', () => {
    expect(
      hasDeclarationForSelector(
        cssText,
        ':host([disabled]) button:disabled',
        'color',
        'var(--fg-disabled)',
      ),
    ).toBe(true);
    expect(
      hasDeclarationForSelector(
        cssText,
        ':host([loading]:not([disabled])) button:disabled',
        'cursor',
        'wait',
      ),
    ).toBe(true);
    expect(
      hasDeclarationForSelector(
        cssText,
        ':host([loading]:not([disabled])) button:disabled',
        'opacity',
        '1',
      ),
    ).toBe(true);
    expect(lacksDeclarationPropertyForSelector(cssText, 'button:disabled', 'pointer-events')).toBe(
      true,
    );
    expect(
      hasDeclarationForSelector(cssText, 'button:disabled::after', 'pointer-events', 'none'),
    ).toBe(true);
  });

  it('composes secondary hover and pressed surfaces over the base surface', () => {
    expect(
      hasDeclarationValueIncluding(
        cssText,
        '.variant-secondary:hover:not(:disabled)',
        'background',
        'linear-gradient(var(--bg-hover), var(--bg-hover)), var(--bg-surface-2)',
      ),
    ).toBe(true);
    expect(
      hasDeclarationValueIncluding(
        cssText,
        "button[aria-pressed='true']:not(:disabled).variant-secondary",
        'background',
        'linear-gradient(var(--bg-active, var(--bg-hover))',
      ),
    ).toBe(true);
    expect(
      hasDeclarationValueIncluding(
        cssText,
        "button[aria-pressed='true']:not(:disabled).variant-secondary",
        'background',
        'var(--bg-surface-2)',
      ),
    ).toBe(true);
  });

  it('scopes pressed rules for every variant so disabled and loading do not inherit them', () => {
    for (const variant of ['secondary', 'outline', 'ghost', 'primary', 'danger']) {
      expect(
        hasDeclarationPropertyForSelector(
          cssText,
          `button[aria-pressed='true']:not(:disabled).variant-${variant}`,
          variant === 'primary' || variant === 'danger' ? 'box-shadow' : 'background',
        ),
      ).toBe(true);
    }
    expect(
      hasDeclarationPropertyForSelector(
        cssText,
        "button[aria-pressed='true']:not(:disabled)",
        'background',
        { scope: 'forced-colors' },
      ),
    ).toBe(true);
    expect(source).not.toContain('@cssprop --bg-fill-muted - ホバー時の背景色');
  });
});

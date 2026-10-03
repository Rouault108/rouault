import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  hasDeclarationForSelector,
  lacksDeclarationPropertyForSelector,
} from './support/css-contract.js';

const css = readFileSync('src/assets/css/note-controls.css', 'utf8');
const control = ':is([data-code-preview-root], [data-video-root]) button.note-control';
describe('native note control CSS', () => {
  it('root内のnative buttonだけへfocusとdisabled表示を適用する', () => {
    expect(hasDeclarationForSelector(css, `${control}:disabled`, 'cursor', 'not-allowed')).toBe(
      true,
    );
    expect(lacksDeclarationPropertyForSelector(css, `${control}:disabled`, 'pointer-events')).toBe(
      true,
    );
    expect(css).toContain(`${control}:focus-visible`);
    expect(css).not.toContain(':host');
  });
  it('forced-colorsとreduced-motionの表示を維持する', () => {
    expect(
      hasDeclarationForSelector(css, control, 'color', 'ButtonText', { scope: 'forced-colors' }),
    ).toBe(true);
    expect(
      hasDeclarationForSelector(css, control, 'transition', 'none', { scope: 'reduced-motion' }),
    ).toBe(true);
  });
});

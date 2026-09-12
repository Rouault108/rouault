import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { extractSingleStaticCssTemplate } from './support/lit-css-contract.js';
import { hasDeclarationForSelector, hasDeclarationValueIncluding } from './support/css-contract.js';

const css = extractSingleStaticCssTemplate(resolve('src/components/ui/video/video.ts'));

describe('videoの環境設定別CSS契約', () => {
  it('forced colorsでは操作面と字幕をsystem colorで表示すること', () => {
    expect(
      hasDeclarationForSelector(css, '.floating-bar', 'background', 'Canvas', {
        scope: 'forced-colors',
      }),
    ).toBe(true);
    expect(
      hasDeclarationForSelector(css, '.play-button', 'color', 'CanvasText', {
        scope: 'forced-colors',
      }),
    ).toBe(true);
    expect(
      hasDeclarationForSelector(css, '.fullscreen-caption', 'color', 'CanvasText', {
        scope: 'forced-colors',
      }),
    ).toBe(true);
  });

  it('reduced motionではloading animationを停止すること', () => {
    expect(
      hasDeclarationForSelector(css, '.loading-spinner', 'animation', 'none', {
        scope: 'reduced-motion',
      }),
    ).toBe(true);
  });

  it('printではplayerの操作面を非表示にすること', () => {
    expect(
      hasDeclarationForSelector(css, '.player-shell', 'display', 'none', { scope: 'print' }),
    ).toBe(true);
  });

  it('proseの広幅表示は既存の余白tokenを使うこと', () => {
    expect(
      hasDeclarationValueIncluding(
        css,
        ':host-context(.prose) .root',
        'margin-inline',
        '--space-n8',
        { scope: 'any' },
      ),
    ).toBe(true);
  });
});

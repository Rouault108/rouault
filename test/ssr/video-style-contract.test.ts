import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { hasDeclarationForSelector, hasDeclarationValueIncluding } from './support/css-contract.js';

const css = readFileSync(resolve('src/assets/css/video.css'), 'utf8');

describe('videoの環境設定別CSS契約', () => {
  it('forced colorsでは操作面と字幕をsystem colorで表示すること', () => {
    expect(
      hasDeclarationForSelector(css, '[data-video-root] .floating-bar', 'background', 'Canvas', {
        scope: 'forced-colors',
      }),
    ).toBe(true);
    expect(
      hasDeclarationForSelector(css, '[data-video-root] .play-button', 'color', 'CanvasText', {
        scope: 'forced-colors',
      }),
    ).toBe(true);
    expect(
      hasDeclarationForSelector(
        css,
        '[data-video-root] .fullscreen-caption',
        'color',
        'CanvasText',
        {
          scope: 'forced-colors',
        },
      ),
    ).toBe(true);
  });

  it('reduced motionではloading animationを停止すること', () => {
    expect(
      hasDeclarationForSelector(css, '[data-video-root] .loading-spinner', 'animation', 'none', {
        scope: 'reduced-motion',
      }),
    ).toBe(true);
  });

  it('printではplayerの操作面を非表示にすること', () => {
    expect(
      hasDeclarationForSelector(css, '[data-video-root] .player-shell', 'display', 'none', {
        scope: 'print',
      }),
    ).toBe(true);
  });

  it('proseの広幅表示は既存の余白tokenを使うこと', () => {
    expect(
      hasDeclarationValueIncluding(css, '.prose [data-video-root]', 'margin-inline', '--space-n8', {
        scope: 'any',
      }),
    ).toBe(true);
  });
});

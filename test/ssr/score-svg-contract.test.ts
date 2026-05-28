import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { resolveScoreSvg } from '../../build/media/score-svg-resolver.js';
import { sanitizeScoreSvg } from '../../build/media/sanitize-svg.js';

const fixtureSource = 'test/fixtures/score/basic.svg';
const notePath = path.join(process.cwd(), 'content/notes/sample.md');

describe('score SVG contract', () => {
  it('note file からの相対 SVG を解決して sanitize すること', () => {
    const svg = resolveScoreSvg(fixtureSource, { sourceFilePath: notePath });

    expect(svg).toContain('<svg');
    expect(svg).toContain('<path');
    expect(svg).not.toContain('onclick');
    expect(svg).not.toContain('<script');
  });

  it('viewBox なし、unsafe href、sanitize 後空 SVG を拒否すること', () => {
    expect(() => sanitizeScoreSvg('<svg><path d="M0 0"/></svg>')).toThrow('viewBox');
    expect(
      sanitizeScoreSvg(
        '<svg viewBox="0 0 10 10"><a href="javascript:alert(1)"><path d="M0 0h1v1"/></a></svg>',
      ),
    ).not.toContain('javascript:');
    expect(() => sanitizeScoreSvg('<svg viewBox="0 0 10 10"><script>alert(1)</script></svg>')).toThrow(
      'sanitize 後に空',
    );
  });

  it('外部 URL と非 SVG path を拒否すること', () => {
    expect(() => resolveScoreSvg('https://example.com/score.svg')).toThrow(
      'ローカル SVG だけ指定できます',
    );
    expect(() => resolveScoreSvg('/tmp/score.svg')).toThrow('相対 SVG');
    expect(() => resolveScoreSvg('../score.svg')).toThrow('親ディレクトリ');
    expect(() => resolveScoreSvg('./score.png')).toThrow('.svg');
  });

  it('リポジトリ外へ解決される SVG は拒否すること', () => {
    expect(() =>
      resolveScoreSvg('score.svg', { sourceFilePath: path.join(path.dirname(process.cwd()), 'note.md') }),
    ).toThrow('見つかりません');
  });
});

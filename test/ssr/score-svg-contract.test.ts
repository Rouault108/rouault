import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { resolveScoreSvg } from '../../build/media/score-svg-resolver.js';
import { sanitizeScoreSvg } from '../../build/media/sanitize-svg.js';

const withSvgFile = (svg: string, test: (sourcePath: string, notePath: string) => void): void => {
  const dir = mkdtempSync(path.join(tmpdir(), 'rouault-score-svg-'));
  try {
    const filePath = path.join(dir, 'score.svg');
    writeFileSync(filePath, svg, 'utf8');
    test('./score.svg', path.join(dir, 'note.md'));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
};

describe('score SVG contract', () => {
  it('note file からの相対 SVG を解決して sanitize すること', () => {
    withSvgFile(
      '<svg viewBox="0 0 10 10" onclick="alert(1)"><script>alert(1)</script><path d="M0 0h10v10H0z"/></svg>',
      (sourcePath, notePath) => {
        const svg = resolveScoreSvg(sourcePath, { sourceFilePath: notePath });

        expect(svg).toContain('<svg');
        expect(svg).toContain('<path');
        expect(svg).not.toContain('onclick');
        expect(svg).not.toContain('<script');
      },
    );
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
    expect(() => resolveScoreSvg('./score.png')).toThrow('.svg');
  });
});

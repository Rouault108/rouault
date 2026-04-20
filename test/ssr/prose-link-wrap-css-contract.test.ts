import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const mainCss = readFileSync(resolve(process.cwd(), 'src/assets/css/main.css'), 'utf8');

describe('prose link wrap css contract', () => {
  it('prose link contract keeps long links from widening the reading surface', () => {
    expect(mainCss).toMatch(
      /\.link-text\[href\],\s*:is\(\.prose,\s*\.about-prose\)\s+a\[href\]:not\(\.heading-anchor\)\s*\{[\s\S]*?overflow-wrap:\s*anywhere;/s,
    );
  });
});
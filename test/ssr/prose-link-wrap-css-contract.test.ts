import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  hasDeclarationForSelector,
  PROSE_TEXT_LINK_SELECTOR,
} from './support/css-contract.js';

const linkPrimitivesCss = readFileSync(resolve(process.cwd(), 'src/assets/css/link-primitives.css'), 'utf8');

describe('prose link wrap css contract', () => {
  it('prose link contract keeps long links from widening the reading surface', () => {
    expect(
      hasDeclarationForSelector(
        linkPrimitivesCss,
        PROSE_TEXT_LINK_SELECTOR,
        'overflow-wrap',
        'anywhere',
        { scope: 'screen' },
      ),
    ).toBe(true);

    expect(linkPrimitivesCss).not.toMatch(
      /:is\(\.prose,\s*\.about-prose\)\s+a\[href\]:not\(\.heading-anchor\)\s*\{/u,
    );
  });
});

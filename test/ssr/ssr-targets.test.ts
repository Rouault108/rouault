import { describe, expect, it } from 'vitest';

import { SSR_NOTE_TARGET_TAGS, SSR_TARGET_TAGS } from '../../src/ssr/targets.js';

const REQUIRED_NOTE_CONTENT_TAGS = [
  'ui-callout',
  'ui-checkbox',
  'ui-code-group',
  'ui-code-preview',
  'ui-table',
  'ui-code-block',
  'ui-blockquote',
  'ui-details',
  'ui-divider',
  'ui-footnote',
  'ui-highlight',
  'ui-image',
  'ui-info-box',
  'ui-score',
  'ui-tabs',
  'ui-translation',
] as const;

describe('ssr targets', () => {
  it('ノート本文由来の UI タグを note target に含めること', () => {
    for (const tagName of REQUIRED_NOTE_CONTENT_TAGS) {
      expect(SSR_NOTE_TARGET_TAGS).toContain(tagName);
    }
  });

  it('note target の UI タグを SSR target 全体にも含めること', () => {
    for (const tagName of REQUIRED_NOTE_CONTENT_TAGS) {
      expect(SSR_TARGET_TAGS).toContain(tagName);
    }
  });
});

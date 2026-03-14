import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

describe('velite config', () => {
  it('ノートの frontmatter では title が optional ではないこと', () => {
    const configPath = new URL('../../velite.config.ts', import.meta.url);
    const source = readFileSync(configPath, 'utf8');

    expect(source).toContain('title: s.string(),');
    expect(source).not.toContain('title: s.string().optional(),');
  });
});

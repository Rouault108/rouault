import { describe, expect, it } from 'vitest';
import lucideCollection from '@iconify-json/lucide/icons.json' with { type: 'json' };

import { ICON_NAMES } from '../../shared/icons/icon-paths.js';
import { LUCIDE_SUBSET } from '../../src/generated/lucide-subset.js';

interface IconifyAliasDefinition {
  readonly parent: string;
}

interface IconifyCollection {
  readonly icons: Record<string, unknown>;
  readonly aliases?: Record<string, IconifyAliasDefinition>;
}

const collection = lucideCollection as IconifyCollection;

describe('icon catalog', () => {
  it('ICON_NAMES が重複せずソート済みであること', () => {
    expect(ICON_NAMES).toEqual([...new Set(ICON_NAMES)].sort());
  });

  it('ICON_NAMES の各要素が Lucide の icon または alias として存在すること', () => {
    for (const name of ICON_NAMES) {
      const exists = name in collection.icons || name in (collection.aliases ?? {});
      expect(exists).toBe(true);
    }
  });

  it('生成済み subset が catalog を完全に包含すること', () => {
    for (const name of ICON_NAMES) {
      const exists = name in LUCIDE_SUBSET.icons || name in LUCIDE_SUBSET.aliases;
      expect(exists).toBe(true);
    }
  });
});

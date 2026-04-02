import { describe, expect, it } from 'vitest';
import type { TreeNode } from '../../src/components/ui/file-tree/file-tree.js';
import {
  LAYOUT_SIDEBAR_TREE_STATE_STORAGE_KEY,
  getLayoutSidebarTreeStateStorageKey,
  mergeLayoutSidebarTreeState,
  normalizeLayoutSidebarTreeState,
  readLayoutSidebarTreeState,
  writeLayoutSidebarTreeState,
} from '../../src/components/layout/layout-sidebar-tree-state.js';

class MockStorage implements Storage {
  private readonly _values = new Map<string, string>();

  get length(): number {
    return this._values.size;
  }

  clear(): void {
    this._values.clear();
  }

  getItem(key: string): string | null {
    return this._values.get(key) ?? null;
  }

  key(index: number): string | null {
    return [...this._values.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this._values.delete(key);
  }

  setItem(key: string, value: string): void {
    this._values.set(key, value);
  }
}

describe('layout-sidebar-tree-state', () => {
  it('不正な保存データを空配列へ正規化すること', () => {
    expect(normalizeLayoutSidebarTreeState(null)).to.deep.equal({ expandedIds: [] });
    expect(normalizeLayoutSidebarTreeState({ expandedIds: ['music', '', 'music'] })).to.deep.equal({
      expandedIds: ['music'],
    });
  });

  it('Storage へ expandedIds を保存できること', () => {
    const storage = new MockStorage();

    writeLayoutSidebarTreeState(storage, {
      expandedIds: ['music', 'music/classical'],
    });

    expect(storage.getItem(LAYOUT_SIDEBAR_TREE_STATE_STORAGE_KEY)).to.equal(
      JSON.stringify({
        expandedIds: ['music', 'music/classical'],
      }),
    );
  });

  it('scopeId ごとに保存キーを分離できること', () => {
    expect(getLayoutSidebarTreeStateStorageKey()).to.equal(LAYOUT_SIDEBAR_TREE_STATE_STORAGE_KEY);
    expect(getLayoutSidebarTreeStateStorageKey('notes/program')).to.equal(
      `${LAYOUT_SIDEBAR_TREE_STATE_STORAGE_KEY}:notes/program`,
    );
  });

  it('Storage から expandedIds を復元できること', () => {
    const storage = new MockStorage();
    storage.setItem(
      LAYOUT_SIDEBAR_TREE_STATE_STORAGE_KEY,
      JSON.stringify({ expandedIds: ['music', 'music/classical'] }),
    );

    expect(readLayoutSidebarTreeState(storage)).to.deep.equal({
      expandedIds: ['music', 'music/classical'],
    });
  });

  it('保存済み expandedIds と現在位置の祖先 branch をマージすること', () => {
    const nodes: readonly TreeNode[] = [
      {
        kind: 'branch',
        id: 'music',
        label: 'Music',
        children: [
          {
            kind: 'branch',
            id: 'music/classical',
            label: 'Classical',
            children: [
              {
                kind: 'branch',
                id: 'music/classical/beethoven',
                label: 'Beethoven',
                children: [
                  {
                    kind: 'leaf',
                    id: 'music/classical/beethoven/symphony-9',
                    label: '交響曲第9番 ニ短調',
                    href: '/notes/music/classical/beethoven/symphony-9',
                  },
                ],
              },
              {
                kind: 'branch',
                id: 'music/classical/tchaikovsky',
                label: 'Tchaikovsky',
                children: [
                  {
                    kind: 'leaf',
                    id: 'music/classical/tchaikovsky/the-nutcracker',
                    label: 'くるみ割り人形',
                    href: '/notes/music/classical/tchaikovsky/the-nutcracker',
                  },
                ],
              },
            ],
          },
        ],
      },
    ];

    const merged = mergeLayoutSidebarTreeState(
      nodes,
      ['music/classical/tchaikovsky'],
      'music/classical/beethoven/symphony-9',
    );

    expect(merged).to.include('music');
    expect(merged).to.include('music/classical');
    expect(merged).to.include('music/classical/beethoven');
    expect(merged).to.include('music/classical/tchaikovsky');
  });
});

import { expect } from '@open-wc/testing';
import type { TreeNode } from '../../src/components/ui/file-tree/file-tree.js';
import {
  LAYOUT_SIDEBAR_TREE_STATE_STORAGE_KEY,
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

  it('現在地で展開済みのノードを維持しつつ保存済み expandedIds をマージすること', () => {
    const nodes: TreeNode[] = [
      {
        id: 'music',
        label: 'Music',
        expanded: true,
        children: [
          {
            id: 'music/classical',
            label: 'Classical',
            expanded: true,
            children: [
              {
                id: 'music/classical/beethoven',
                label: 'Beethoven',
                expanded: true,
                children: [
                  {
                    id: 'music/classical/beethoven/symphony-9',
                    label: '交響曲第9番 ニ短調',
                    selected: true,
                    href: '/notes/music/classical/beethoven/symphony-9',
                  },
                ],
              },
              {
                id: 'music/classical/tchaikovsky',
                label: 'Tchaikovsky',
                children: [
                  {
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

    const merged = mergeLayoutSidebarTreeState(nodes, ['music/classical/tchaikovsky']);

    const music = merged[0];
    const classical = music?.children?.[0];
    const beethoven = classical?.children?.[0];
    const tchaikovsky = classical?.children?.[1];

    expect(music?.expanded).to.equal(true);
    expect(classical?.expanded).to.equal(true);
    expect(beethoven?.expanded).to.equal(true);
    expect(tchaikovsky?.expanded).to.equal(true);

    // 元データを破壊しないことも合わせて検証する。
    const originalTchaikovsky = nodes[0]?.children?.[0]?.children?.[1];
    expect(originalTchaikovsky?.expanded).to.equal(undefined);
  });
});

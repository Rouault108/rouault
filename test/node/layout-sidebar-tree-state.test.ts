import { describe, expect, it } from 'vitest';
import type { TreeNode } from '../../src/components/ui/file-tree/file-tree.js';
import {
  LAYOUT_SIDEBAR_TREE_STATE_STORAGE_KEY_V2,
  LAYOUT_SIDEBAR_TREE_STATE_STORAGE_KEY_V3,
  collectLayoutSidebarSelectedAncestorIds,
  getLayoutSidebarTreeStateStorageKey,
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
    const scope = { sidebarId: 'note-primary', stateScopeId: 'note-navigation' };

    writeLayoutSidebarTreeState(
      storage,
      {
        expandedIds: ['music', 'music/classical'],
      },
      scope,
    );

    expect(storage.getItem(getLayoutSidebarTreeStateStorageKey(scope))).to.equal(
      JSON.stringify({
        expandedIds: ['music', 'music/classical'],
      }),
    );
  });

  it('sidebarId と stateScopeId ごとに保存キーを分離できること', () => {
    expect(getLayoutSidebarTreeStateStorageKey()).to.equal(
      `${LAYOUT_SIDEBAR_TREE_STATE_STORAGE_KEY_V3}:note-primary:note-navigation`,
    );
    expect(
      getLayoutSidebarTreeStateStorageKey({
        sidebarId: 'note-primary',
        stateScopeId: 'note-navigation',
      }),
    ).to.equal(`${LAYOUT_SIDEBAR_TREE_STATE_STORAGE_KEY_V3}:note-primary:note-navigation`);
  });

  it('Storage から expandedIds を復元できること', () => {
    const storage = new MockStorage();
    const scope = { sidebarId: 'note-primary', stateScopeId: 'note-navigation' };
    storage.setItem(
      getLayoutSidebarTreeStateStorageKey(scope),
      JSON.stringify({ expandedIds: ['music', 'music/classical'] }),
    );

    expect(readLayoutSidebarTreeState(storage, scope)).to.deep.equal({
      expandedIds: ['music', 'music/classical'],
    });
  });

  it('旧 v2 storage key は読まないこと', () => {
    const storage = new MockStorage();
    storage.setItem(
      `${LAYOUT_SIDEBAR_TREE_STATE_STORAGE_KEY_V2}:note-primary:legacy-scope`,
      JSON.stringify({ expandedIds: ['legacy'] }),
    );

    expect(
      readLayoutSidebarTreeState(storage, {
        sidebarId: 'note-primary',
        stateScopeId: 'legacy-scope',
      }),
    ).to.equal(null);
  });

  it('保存値が存在しない場合は null を返すこと', () => {
    const storage = new MockStorage();

    expect(readLayoutSidebarTreeState(storage)).to.equal(null);
  });

  it('現在位置の祖先 branch 群を列挙できること', () => {
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

    const selectedAncestors = collectLayoutSidebarSelectedAncestorIds(
      nodes,
      'music/classical/beethoven/symphony-9',
    );

    expect(selectedAncestors).to.include('music');
    expect(selectedAncestors).to.include('music/classical');
    expect(selectedAncestors).to.include('music/classical/beethoven');
    expect(selectedAncestors).to.not.include('music/classical/tchaikovsky');
  });

  it('空 expandedIds を持つ保存状態を欠損と区別できること', () => {
    const storage = new MockStorage();
    const scope = { sidebarId: 'note-primary', stateScopeId: 'note-navigation' };

    writeLayoutSidebarTreeState(
      storage,
      {
        expandedIds: [],
      },
      scope,
    );

    expect(readLayoutSidebarTreeState(storage, scope)).to.deep.equal({
      expandedIds: [],
    });
  });
});

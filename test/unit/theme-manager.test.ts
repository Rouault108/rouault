import { expect } from '@open-wc/testing';
import {
  RESOLVED_THEME_ATTRIBUTE,
  THEME_ATTRIBUTE,
  THEME_STORAGE_KEY,
  applyThemePreference,
  normalizeThemePreference,
  readStoredThemePreference,
  resolveThemePreference,
} from '../../src/lib/theme/theme-manager.js';

class MemoryStorage implements Storage {
  get length(): number {
    return this._store.size;
  }

  private readonly _store = new Map<string, string>();

  clear(): void {
    this._store.clear();
  }

  getItem(key: string): string | null {
    return this._store.get(key) ?? null;
  }

  key(index: number): string | null {
    return [...this._store.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this._store.delete(key);
  }

  setItem(key: string, value: string): void {
    this._store.set(key, value);
  }
}

describe('theme-manager', () => {
  it('不正な入力は system に正規化されること', () => {
    expect(normalizeThemePreference('unknown')).to.equal('system');
    expect(normalizeThemePreference(null)).to.equal('system');
  });

  it('storage に保存されたテーマ設定を読み取れること', () => {
    const storage = new MemoryStorage();
    storage.setItem(THEME_STORAGE_KEY, 'dark');

    expect(readStoredThemePreference(storage)).to.equal('dark');
  });

  it('system 選択時は OS 設定から実テーマを解決すること', () => {
    expect(resolveThemePreference('system', { matches: true })).to.equal('dark');
    expect(resolveThemePreference('system', { matches: false })).to.equal('light');
  });

  it('テーマ適用時に data 属性と localStorage が同期されること', () => {
    const root = document.createElement('html');
    const storage = new MemoryStorage();

    const result = applyThemePreference('dark', {
      root,
      storage,
      emit: false,
    });

    expect(result.preference).to.equal('dark');
    expect(result.resolvedTheme).to.equal('dark');
    expect(root.getAttribute(THEME_ATTRIBUTE)).to.equal('dark');
    expect(root.getAttribute(RESOLVED_THEME_ATTRIBUTE)).to.equal('dark');
    expect(root.style.colorScheme).to.equal('dark');
    expect(storage.getItem(THEME_STORAGE_KEY)).to.equal('dark');
  });

  it('system 適用時は color-scheme を light dark に設定すること', () => {
    const root = document.createElement('html');

    const result = applyThemePreference('system', {
      root,
      mediaQueryList: { matches: true },
      emit: false,
      persist: false,
    });

    expect(result.preference).to.equal('system');
    expect(result.resolvedTheme).to.equal('dark');
    expect(root.getAttribute(THEME_ATTRIBUTE)).to.equal('system');
    expect(root.getAttribute(RESOLVED_THEME_ATTRIBUTE)).to.equal('dark');
    expect(root.style.colorScheme).to.equal('light dark');
  });
});

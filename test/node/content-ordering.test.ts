/**
 * _config.json 並び順ユーティリティの単体テスト
 *
 * テスト対象:
 * - applyOrdering()
 */

import { describe, expect, it } from 'vitest';
import { applyOrdering } from '../../build/content/ordering.js';

describe('applyOrdering', () => {
  it('order配列内のアイテムが指定順で先頭に並ぶこと', () => {
    const items = ['c.md', 'a.md', 'b.md'];
    const config = { order: ['b.md', 'a.md'] };

    const result = applyOrdering(items, config);

    expect(result).to.deep.equal(['b.md', 'a.md', 'c.md']);
  });

  it('order配列にないアイテムがアルファベット順で続くこと', () => {
    const items = ['delta.md', 'alpha.md', 'charlie.md', 'bravo.md'];
    const config = { order: ['charlie.md'] };

    const result = applyOrdering(items, config);

    expect(result).to.deep.equal(['charlie.md', 'alpha.md', 'bravo.md', 'delta.md']);
  });

  it('config が undefined の場合、全てアルファベット順になること', () => {
    const items = ['c.md', 'a.md', 'b.md'];

    const result = applyOrdering(items, undefined);

    expect(result).to.deep.equal(['a.md', 'b.md', 'c.md']);
  });

  it('空のorder配列の場合、全てアルファベット順になること', () => {
    const items = ['c.md', 'a.md', 'b.md'];
    const config = { order: [] };

    const result = applyOrdering(items, config);

    expect(result).to.deep.equal(['a.md', 'b.md', 'c.md']);
  });

  it('order配列に存在しないファイル名を含む場合、無視されること', () => {
    const items = ['b.md', 'a.md'];
    const config = { order: ['nonexistent.md', 'a.md'] };

    const result = applyOrdering(items, config);

    // nonexistent.md はアイテムに含まれないため無視、a.md が先頭
    expect(result).to.deep.equal(['a.md', 'b.md']);
  });

  it('ディレクトリ名でもソートできること', () => {
    const items = ['jazz', 'classical', 'rock'];
    const config = { order: ['classical', 'jazz'] };

    const result = applyOrdering(items, config);

    expect(result).to.deep.equal(['classical', 'jazz', 'rock']);
  });

  it('元の配列を変更しないこと（イミュータブル）', () => {
    const items = ['c.md', 'a.md', 'b.md'];
    const original = [...items];
    const config = { order: ['b.md'] };

    applyOrdering(items, config);

    expect(items).to.deep.equal(original);
  });

  it('空の配列を渡すと空の配列を返すこと', () => {
    const result = applyOrdering([], { order: ['a.md'] });

    expect(result).to.deep.equal([]);
  });

  it('日本語名を含むアイテムが正しくソートされること', () => {
    const items = ['バッハ', 'アルビノーニ', 'モーツァルト'];

    const result = applyOrdering(items, undefined);

    // localeCompare('ja') によるソート
    expect(result).to.deep.equal(['アルビノーニ', 'バッハ', 'モーツァルト']);
  });
});

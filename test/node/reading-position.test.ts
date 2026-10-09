import { describe, expect, it } from 'vitest';
import { isPlainHistoryState, readHistoryEntry } from '../../src/navigation/history-entry.js';
import {
  ReadingPositionStore,
  clampReadingPosition,
  validateReadingPosition,
} from '../../src/components/app/navigation/reading-position-store.js';

describe('読書位置のentry/schema契約', () => {
  it('opaque stateと未知予約schemaを管理IDへ読み替えない', () => {
    for (const state of [
      null,
      undefined,
      1,
      'x',
      [],
      new Date(),
      { __rouaultHistoryEntry: { version: 2, id: 'future' } },
      { __rouaultHistoryEntry: { version: 1, id: '' } },
    ])
      expect(readHistoryEntry(state)).toBeNull();
    expect(isPlainHistoryState(new Date())).toBe(false);
    expect(
      readHistoryEntry({ sentinel: 1, __rouaultHistoryEntry: { version: 1, id: 'entry' } }),
    ).toEqual({ version: 1, id: 'entry' });
  });
  it('同じURLの二entryを分け、候補とrecordをコピーして保全する', () => {
    const store = new ReadingPositionStore();
    store.write('A1', { version: 1, url: '/a#heading', x: 12, y: 450 });
    store.write('A2', { version: 1, url: '/a#heading', x: 20, y: 900 });
    const candidate = store.read('A1', '/a#heading');
    store.rebind('A1', '/a#heading', '/a?tab=first#heading');
    expect(candidate?.y).toBe(450);
    expect(store.read('A1', '/a#heading')).toBeNull();
    expect(store.read('A1', '/a?tab=first#heading')?.y).toBe(450);
    expect(store.read('A2', '/a#heading')?.y).toBe(900);
  });
  it('invalid/exact URL mismatchを不採用にし短文化後rangeへclampする', () => {
    for (const y of [-1, NaN, Infinity])
      expect(validateReadingPosition({ version: 1, url: '/a', x: 0, y }, '/a')).toBeNull();
    expect(validateReadingPosition({ version: 1, url: '/a', x: 0, y: 50 }, '/a#x')).toBeNull();
    expect(clampReadingPosition({ version: 1, url: '/a', x: 100, y: 900 }, 0, 300)).toEqual({
      version: 1,
      url: '/a',
      x: 0,
      y: 300,
    });
  });
});

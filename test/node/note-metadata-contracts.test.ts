import { describe, expect, it } from 'vitest';

import { validateNoteMetadataContracts } from '../../build/content/note-metadata-contracts.js';

const baseInput = {
  kind: 'reader' as const,
  chromeProfile: undefined,
  testingArea: undefined,
  sourceLabel: 'content/example.md',
};

describe('validateNoteMetadataContracts', () => {
  it('date と同日の updated を許可する', () => {
    expect(() =>
      validateNoteMetadataContracts({
        ...baseInput,
        date: '2026-07-07',
        updated: '2026-07-07',
      }),
    ).not.toThrow();
  });

  it('date より後の updated を許可する', () => {
    expect(() =>
      validateNoteMetadataContracts({
        ...baseInput,
        date: '2026-07-07',
        updated: '2026-07-08',
      }),
    ).not.toThrow();
  });

  it('date より前の updated を contract violation として拒否する', () => {
    expect(() =>
      validateNoteMetadataContracts({
        ...baseInput,
        date: '2026-07-07',
        updated: '2026-07-06',
      }),
    ).toThrow('updated は date 以降の日付である必要があります');
  });

  it('date のみを許可する', () => {
    expect(() =>
      validateNoteMetadataContracts({
        ...baseInput,
        date: '2026-07-07',
      }),
    ).not.toThrow();
  });

  it('updated のみを許可する', () => {
    expect(() =>
      validateNoteMetadataContracts({
        ...baseInput,
        updated: '2026-07-07',
      }),
    ).not.toThrow();
  });

  it('testing note には testingArea を要求する既存契約を維持する', () => {
    expect(() =>
      validateNoteMetadataContracts({
        ...baseInput,
        kind: 'testing',
      }),
    ).toThrow('testing note には testingArea が必須です');

    expect(() =>
      validateNoteMetadataContracts({
        ...baseInput,
        kind: 'testing',
        testingArea: 'layout',
      }),
    ).not.toThrow();
  });

  it('testing 以外の note では testingArea を拒否する既存契約を維持する', () => {
    expect(() =>
      validateNoteMetadataContracts({
        ...baseInput,
        testingArea: 'layout',
      }),
    ).toThrow('testingArea を指定できるのは testing note のみです');
  });

  it('demo note の reader chromeProfile を拒否する既存契約を維持する', () => {
    expect(() =>
      validateNoteMetadataContracts({
        ...baseInput,
        kind: 'demo',
        chromeProfile: 'reader',
      }),
    ).toThrow("demo note に chromeProfile: 'reader' は指定できません");
  });
});

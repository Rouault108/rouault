import { describe, expect, it } from 'vitest';

import {
  assertCanonicalFootnoteId,
  canonicalizeFootnoteFragment,
  canonicalizeFootnoteId,
  createFootnoteRefId,
  isFootnoteBackrefHref,
  parseFootnoteBackrefHref,
  parseFootnoteRefHref,
  resolveFootnoteRefIdFromHref,
} from '../../shared/footnotes/footnote-id.js';

describe('footnote id shared helper', () => {
  it('raw ID と href fragment の canonicalize 経路を分離すること', () => {
    expect(canonicalizeFootnoteId('fn-note-a')).toBe('fn-note-a');
    expect(canonicalizeFootnoteId('#fn-note-a')).toBeNull();
    expect(() => assertCanonicalFootnoteId('#fn-note-a', 'test')).toThrow('invalid footnote id');
    expect(canonicalizeFootnoteFragment('fn-note-a')).toBeNull();
    expect(parseFootnoteRefHref('fn-note-a')).toEqual({ kind: 'none' });
  });

  it('Unicode/NFKC/user-content-fn を canonical fn-* ID へ正規化すること', () => {
    expect(canonicalizeFootnoteId('note a')).toBe('fn-note-a');
    expect(canonicalizeFootnoteId('ｆｎ-note-a')).toBe('fn-note-a');
    expect(canonicalizeFootnoteId('user-content-fn-note-a')).toBe('fn-note-a');
    expect(canonicalizeFootnoteId('fn-100%-note')).toBe('fn-100-note');
    expect(canonicalizeFootnoteFragment('#fn-100%25-note')).toBe('fn-100-note');
    expect(canonicalizeFootnoteFragment('#fn-%E8%84%9A%E6%B3%A8')).toBe('fn-脚注');
  });

  it('reserved backref-like ID を footnote definition ID として拒否すること', () => {
    expect(canonicalizeFootnoteId('user-content-fnref-note-a')).toBeNull();
    expect(canonicalizeFootnoteId('fnref-note-a')).toBeNull();
    expect(canonicalizeFootnoteId('fn-note-a-ref-1')).toBeNull();
    expect(canonicalizeFootnoteId('fn-a-ref-NaN')).toBeNull();
    expect(canonicalizeFootnoteId('fn-a-ref-')).toBeNull();
    expect(canonicalizeFootnoteId('fn-')).toBeNull();
  });

  it('footnote ref href と backref href を別 parser で扱うこと', () => {
    expect(parseFootnoteRefHref('#fn-note-a')).toEqual({
      kind: 'canonical',
      footnoteId: 'fn-note-a',
    });
    expect(parseFootnoteRefHref('#user-content-fn-note-a')).toEqual({
      kind: 'canonical',
      footnoteId: 'fn-note-a',
    });
    expect(parseFootnoteRefHref('#fn-note-a-ref-1')).toEqual({
      kind: 'invalid',
      reason: 'reserved-backref-shape',
    });
    expect(parseFootnoteRefHref('#user-content-fnref-note-a')).toEqual({
      kind: 'invalid',
      reason: 'reserved-backref-shape',
    });
    expect(resolveFootnoteRefIdFromHref('#fn-note-a')).toBe('fn-note-a');
    expect(resolveFootnoteRefIdFromHref('#fn-note-a-ref-1')).toBeNull();
  });

  it('backref parser が canonical/legacy/malformed を区別すること', () => {
    expect(parseFootnoteBackrefHref('#fn-note-a-ref-1')).toEqual({
      kind: 'canonical',
      footnoteId: 'fn-note-a',
      instance: 1,
    });
    expect(parseFootnoteBackrefHref('#user-content-fnref-note-a')).toEqual({
      kind: 'legacy-user-content-fnref',
      legacyId: 'user-content-fnref-note-a',
    });
    expect(parseFootnoteBackrefHref('#fn-a-ref-NaN')).toEqual({
      kind: 'invalid',
      reason: 'invalid-instance',
    });
    expect(parseFootnoteBackrefHref('#fn-a-ref-01')).toEqual({
      kind: 'invalid',
      reason: 'invalid-instance',
    });
    expect(parseFootnoteBackrefHref('#fn-a-ref-0')).toEqual({
      kind: 'invalid',
      reason: 'invalid-instance',
    });
    expect(parseFootnoteBackrefHref('#fn-a-ref-1-ref-2')).toEqual({
      kind: 'invalid',
      reason: 'invalid-base',
    });
    expect(isFootnoteBackrefHref('#fn-a-ref-0')).toBe(false);
  });

  it('createFootnoteRefId が canonical ID と正の整数 instance だけを受け付けること', () => {
    expect(createFootnoteRefId('fn-note-a', 1)).toBe('fn-note-a-ref-1');
    expect(() => createFootnoteRefId('note-a', 1)).toThrow('canonical footnote id');
    expect(() => createFootnoteRefId('fn-note-a-ref-1', 1)).toThrow('canonical footnote id');
    expect(() => createFootnoteRefId('fn-note-a', 0)).toThrow('footnote ref instance');
    expect(() => createFootnoteRefId('fn-note-a', Number.NaN)).toThrow('footnote ref instance');
  });
});

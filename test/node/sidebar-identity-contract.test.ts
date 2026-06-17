import { describe, expect, it } from 'vitest';

import {
  assertValidSidebarId,
  assertValidSidebarStateScopeId,
  normalizeSidebarId,
  normalizeSidebarStateScopeId,
  validateSidebarIdInput,
  validateSidebarStateScopeIdInput,
} from '../../shared/navigation/sidebar-identity-contract.js';

describe('sidebar identity contract', () => {
  it('sidebarId / stateScopeId は同一 grammar で trim 後 valid value を返すこと', () => {
    expect(validateSidebarIdInput(' note-primary ')).toEqual({
      kind: 'valid',
      value: 'note-primary',
    });
    expect(validateSidebarStateScopeIdInput(' note-navigation ')).toEqual({
      kind: 'valid',
      value: 'note-navigation',
    });
    expect(normalizeSidebarId(' note-primary ')).toBe('note-primary');
    expect(normalizeSidebarStateScopeId(' note-navigation ')).toBe('note-navigation');
    expect(assertValidSidebarId(' note-primary ')).toBe('note-primary');
    expect(assertValidSidebarStateScopeId(' note-navigation ')).toBe('note-navigation');
  });

  it('missing / empty / invalid-type / too-long / invalid-format を区別すること', () => {
    const tooLong = 'x'.repeat(129);

    expect(validateSidebarIdInput(undefined)).toEqual({ kind: 'missing' });
    expect(validateSidebarIdInput(null)).toEqual({ kind: 'missing' });
    expect(validateSidebarIdInput('   ')).toEqual({ kind: 'empty' });
    expect(validateSidebarIdInput(123)).toEqual({ kind: 'invalid-type', value: 123 });
    expect(validateSidebarIdInput(tooLong)).toEqual({ kind: 'too-long', value: tooLong });
    for (const invalid of [
      'note primary',
      'note/primary',
      'note\\primary',
      'note\u0000primary',
      'ノート-primary',
      'note#primary',
      'note?primary',
      'note@primary',
    ]) {
      expect(validateSidebarIdInput(invalid)).toEqual({ kind: 'invalid-format', value: invalid });
      expect(validateSidebarStateScopeIdInput(invalid)).toEqual({
        kind: 'invalid-format',
        value: invalid,
      });
      expect(normalizeSidebarId(invalid)).toBeNull();
      expect(normalizeSidebarStateScopeId(invalid)).toBeNull();
    }
  });
});

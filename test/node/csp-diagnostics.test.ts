import { describe, expect, it } from 'vitest';
import {
  assertMinimalCspDiagnostics,
  blockedOriginOrScheme,
} from '../../build/security/csp-diagnostics.js';

describe('CSP diagnostic minimization', () => {
  it('drops path, query, fragment, credentials and Blob identifiers', () => {
    expect(
      blockedOriginOrScheme(
        'https://user:password@fixture.invalid/private/path?q=private#fragment',
      ),
    ).toBe('https://fixture.invalid');
    expect(blockedOriginOrScheme('blob:https://fixture.invalid/secret-id')).toBe('blob:');
    expect(blockedOriginOrScheme('data:image/png;base64,private')).toBe('data:');
    expect(blockedOriginOrScheme('about:srcdoc')).toBe('about:');
    expect(blockedOriginOrScheme('file:///private/path')).toBe('file:');
    expect(blockedOriginOrScheme('wasm-eval')).toBe('wasm-eval');
    expect(blockedOriginOrScheme('unknown-private-text')).toBe('other');
  });
  it('rejects extra URL/sample fields or a complete blocked URL before persistence', () => {
    const row = {
      buildId: 'fixture',
      browser: 'chromium-csp',
      routeClass: 'home',
      directive: 'script-src-elem',
      disposition: 'report',
      blocked: 'inline',
      status: 200,
      owner: 'fixture',
      classification: 'fixture',
    };
    expect(() => assertMinimalCspDiagnostics([row])).not.toThrow();
    expect(() =>
      assertMinimalCspDiagnostics([
        { ...row, document: 'https://fixture.invalid/private?q=private' },
      ]),
    ).toThrow('unapproved fields');
    expect(() =>
      assertMinimalCspDiagnostics([
        { ...row, blocked: 'https://fixture.invalid/private?q=private' },
      ]),
    ).toThrow('not minimized');
  });
});

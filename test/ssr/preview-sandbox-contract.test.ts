import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('preview-sandbox contract source', () => {
  it('activation-policy の既定値と fallback を visible にしていること', () => {
    const source = readFileSync(
      new URL('../../src/components/ui/preview-sandbox/preview-sandbox.ts', import.meta.url),
      'utf8',
    );

    expect(source).toContain(": 'visible';");
    expect(source).toContain("activationPolicy = 'visible';");
  });

  it('manual の未起動時は iframe ではなく placeholder を描画すること', () => {
    const source = readFileSync(
      new URL('../../src/components/ui/preview-sandbox/preview-sandbox.ts', import.meta.url),
      'utf8',
    );

    expect(source).toContain("this._isActivated");
    expect(source).toContain("role=${this._normalizedActivationPolicy === 'manual' ? 'button' : 'status'}");
    expect(source).toContain('@focus=${this._handleManualActivationRequest}');
  });
});

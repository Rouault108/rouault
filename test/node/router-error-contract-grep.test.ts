import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('router error contract grep boundary', () => {
  it('NavigationEnvelopeBuildMismatchError の利用箇所を legacy alias 定義に限定すること', () => {
    const checkedFiles = [
      'src/router/document-loader.ts',
      'src/router/error-envelope-factory.ts',
      'src/router/navigation-envelope-validator.ts',
      'src/router/router.ts',
      'src/router/router-types.ts',
    ];

    for (const filePath of checkedFiles) {
      expect(readFileSync(filePath, 'utf8'), filePath).not.toContain('NavigationEnvelopeBuildMismatchError');
    }
  });

  it('旧 NavigationEnvelopeValidationError 名称を src/router に残さないこと', () => {
    const checkedFiles = [
      'src/router/document-loader.ts',
      'src/router/error-envelope-factory.ts',
      'src/router/navigation-envelope-errors.ts',
      'src/router/navigation-envelope-validator.ts',
      'src/router/router.ts',
      'src/router/router-types.ts',
    ];

    for (const filePath of checkedFiles) {
      expect(readFileSync(filePath, 'utf8'), filePath).not.toContain('NavigationEnvelopeValidationError');
    }
  });

  it('StrictLoadedNavigationEnvelope は router-types の単一型境界から import すること', () => {
    const source = readFileSync('src/router/navigation-envelope-validator.ts', 'utf8');

    expect(source).toContain("import type { StrictLoadedNavigationEnvelope } from './router-types.js';");
    expect(source).not.toMatch(/type\s+StrictLoadedNavigationEnvelope\s*=/u);
    expect(source).not.toMatch(/interface\s+StrictLoadedNavigationEnvelope/u);
  });
});

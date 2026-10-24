import { readFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { listCssFiles, readCssFile } from './support/css-contract.js';
import {
  auditTokenReferences,
  type TokenReferenceFinding,
  type TokenReferenceLocation,
} from './support/css-token-references.js';

interface KnownFinding extends TokenReferenceFinding {
  readonly count: number;
  readonly reason: string;
}
const known = JSON.parse(
  readFileSync(resolve('test/fixtures/css/known-token-reference-findings.json'), 'utf8'),
) as KnownFinding[];
interface RuntimeSupplier extends TokenReferenceLocation {
  readonly count: number;
  readonly supplier: string;
  readonly evidence: string;
}
const runtime = JSON.parse(
  readFileSync(resolve('test/fixtures/css/runtime-token-suppliers.json'), 'utf8'),
) as RuntimeSupplier[];
interface IntentionalOverride extends TokenReferenceLocation {
  readonly count: number;
  readonly contract: string;
  readonly evidence: string;
  readonly reason: string;
}
const overrides = JSON.parse(
  readFileSync(resolve('test/fixtures/css/intentional-token-overrides.json'), 'utf8'),
) as IntentionalOverride[];
const sources = () =>
  listCssFiles().map((file) => ({
    file: relative(resolve('src/assets/css'), file).replaceAll('\\', '/'),
    css: readCssFile(file).cssText,
  }));
const sort = (items: readonly unknown[]): string[] =>
  items.map((item) => JSON.stringify(item)).sort();

describe('source CSS token reference integrity', () => {
  it('未定義・未証明 scope・循環を検出し、説明付き既知残件の箇所と件数だけを許容する', () => {
    const result = auditTokenReferences(sources(), runtime, overrides);
    const expected = known.flatMap(({ count, reason, ...finding }) => {
      expect(reason.length).toBeGreaterThan(20);
      expect(count).toBeGreaterThan(0);
      return Array.from({ length: count }, () => finding);
    });
    expect(sort(result.findings)).toEqual(sort(expected));
  });

  it('runtime 参照は実際の供給元の source と参照箇所・件数を確認する', () => {
    const audit = auditTokenReferences(sources(), runtime, overrides);
    for (const { count, supplier, evidence, ...location } of runtime) {
      expect(readFileSync(resolve(supplier), 'utf8'), supplier).toContain(evidence);
      expect(
        audit.references.filter(
          (item) =>
            item.category === 'runtime' &&
            item.file === location.file &&
            item.selector === location.selector &&
            item.property === location.property &&
            item.reference === location.reference &&
            JSON.stringify(item.conditions) === JSON.stringify(location.conditions),
        ),
        `${supplier}: ${location.reference}`,
      ).toHaveLength(count);
    }
    expect(audit.references.filter((item) => item.category === 'runtime')).toHaveLength(
      runtime.reduce((sum, item) => sum + item.count, 0),
    );
  });

  it('意図的 override は公開契約の根拠と箇所・条件・件数を固定する', () => {
    const audit = auditTokenReferences(sources(), runtime, overrides);
    for (const { count, contract, evidence, reason, ...location } of overrides) {
      expect(readFileSync(resolve(contract), 'utf8')).toContain(evidence);
      expect(reason.length).toBeGreaterThan(20);
      expect(
        audit.references.filter(
          (item) =>
            item.category === 'fallback' &&
            item.file === location.file &&
            item.selector === location.selector &&
            item.property === location.property &&
            item.reference === location.reference &&
            JSON.stringify(item.conditions) === JSON.stringify(location.conditions),
        ),
      ).toHaveLength(count);
    }
    expect(audit.references.filter((item) => item.category === 'fallback')).toHaveLength(
      overrides.reduce((sum, item) => sum + item.count, 0),
    );
  });

  it('旧 overlay 参照を残さず、親の blocking layer を公開 token として解決する', () => {
    const audit = auditTokenReferences(sources(), runtime, overrides);
    expect(audit.references.filter((item) => item.reference === '--z-overlay')).toEqual([]);
    expect(known.filter((item) => item.reference === '--z-overlay')).toEqual([]);
    // stacking の値・順序は sidebar-overlay-css-contract.test.ts が所有する。
    expect(
      audit.references.filter(
        (item) =>
          item.file === 'layout-sidebar.css' &&
          item.property === 'z-index' &&
          item.reference === '--z-blocking-layer',
      ),
    ).toEqual([
      {
        file: 'layout-sidebar.css',
        selector:
          "[data-sidebar-enhancement-state='active']\n  .layout-sidebar-overlay-layer:has(> [data-layout-sidebar-root][data-mode='overlay'])",
        property: 'z-index',
        reference: '--z-blocking-layer',
        conditions: [],
        category: 'public',
        fallback: '200',
      },
    ]);
  });
});

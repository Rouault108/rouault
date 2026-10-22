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

  it('対象外の --z-overlay は未定義残件として箇所・条件・件数と既存 fallback 100 を固定する', () => {
    expect(
      auditTokenReferences(sources(), runtime, overrides).references.filter(
        (item) => item.reference === '--z-overlay',
      ),
    ).toEqual([
      {
        file: 'layout-sidebar.css',
        selector:
          "[data-sidebar-enhancement-state='active'] [data-layout-sidebar-root][data-mode='overlay']",
        property: 'z-index',
        reference: '--z-overlay',
        conditions: [],
        category: 'unresolved',
        fallback: '100',
      },
      {
        file: 'layout-sidebar.css',
        selector: '[data-layout-sidebar-backdrop]',
        property: 'z-index',
        reference: '--z-overlay',
        conditions: [],
        category: 'unresolved',
        fallback: '100',
      },
    ]);
  });
});

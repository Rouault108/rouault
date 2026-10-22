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
const sources = () =>
  listCssFiles().map((file) => ({
    file: relative(resolve('src/assets/css'), file).replaceAll('\\', '/'),
    css: readCssFile(file).cssText,
  }));
const sort = (items: readonly unknown[]): string[] =>
  items.map((item) => JSON.stringify(item)).sort();

describe('source CSS token reference integrity', () => {
  it('未定義・未証明 scope・循環を検出し、説明付き既知残件の箇所と件数だけを許容する', () => {
    const result = auditTokenReferences(sources(), runtime);
    const expected = known.flatMap(({ count, reason, ...finding }) => {
      expect(reason.length).toBeGreaterThan(20);
      expect(count).toBeGreaterThan(0);
      return Array.from({ length: count }, () => finding);
    });
    expect(sort(result.findings)).toEqual(sort(expected));
  });

  it('runtime 参照は実際の供給元の source と参照箇所・件数を確認する', () => {
    const audit = auditTokenReferences(sources(), runtime);
    for (const { count, supplier, evidence, ...location } of runtime) {
      expect(readFileSync(resolve(supplier), 'utf8'), supplier).toContain(evidence);
      expect(
        audit.references.filter(
          (item) =>
            item.category === 'runtime' &&
            item.file === location.file &&
            item.selector === location.selector &&
            item.property === location.property &&
            item.reference === location.reference,
        ),
        `${supplier}: ${location.reference}`,
      ).toHaveLength(count);
    }
    expect(audit.references.filter((item) => item.category === 'runtime')).toHaveLength(
      runtime.reduce((sum, item) => sum + item.count, 0),
    );
  });

  it('対象外の --z-overlay は fallback 付き既知参照として箇所と件数を固定する', () => {
    expect(
      auditTokenReferences(sources(), runtime).references.filter(
        (item) => item.reference === '--z-overlay',
      ),
    ).toEqual([
      {
        file: 'layout-sidebar.css',
        selector:
          "[data-sidebar-enhancement-state='active'] [data-layout-sidebar-root][data-mode='overlay']",
        property: 'z-index',
        reference: '--z-overlay',
        category: 'fallback',
      },
      {
        file: 'layout-sidebar.css',
        selector: '[data-layout-sidebar-backdrop]',
        property: 'z-index',
        reference: '--z-overlay',
        category: 'fallback',
      },
    ]);
  });
});

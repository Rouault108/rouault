import { afterEach, describe, expect, it } from 'vitest';
import tableCss from '../../src/assets/css/table.css?raw';
import {
  adoptIncomingHistoryTableProof,
  invalidateHistoryTableProof,
  prepareHistoryFonts,
  readHistoryTableProofDiagnostics,
} from '../../src/components/app/controllers/history-presentation-geometry.js';
import { readHistoryTableProof } from '../../src/components/app/controllers/history-table-proof.js';
import {
  prepareHistoryTableFontProfile,
  simpleHistoryTableProfile,
  unreferencedHistoryTableIds,
  serializeHistoryTableAuthored,
} from '../../src/components/app/controllers/history-table-font-profile.js';
import { readPreparedTableGeometry } from '../../src/client/post-hydrate/table-scroll-enhancer.js';
import {
  claimAcceptedIncoming,
  commitHistoryTableIncoming,
  prepareHistoryTableIncoming,
} from '../../src/components/app/controllers/history-table-incoming.js';
import {
  adoptContentBinding,
  beginContentMutation,
  beginNavigationIntent,
  initializeContentContext,
  readContentContext,
  releaseContentContext,
} from '../../src/navigation/content-navigation-context.js';
import { readAddress, readHistoryEntry } from '../../src/navigation/history-entry.js';
import { readCurrentShellCommitId } from '../../src/components/app/shell/app-shell-lifecycle.js';
import type {
  ContentUpdatePayload,
  NavigationCommitReceipt,
} from '../../src/router/router-types.js';
import { fixture, fixtureAbortController } from './harness/browser-fixture.js';

const styles: HTMLStyleElement[] = [];
const faces: FontFace[] = [];
const outsideReferences: HTMLElement[] = [];
const harnessStyles: { style: HTMLStyleElement; parent: Node; next: Node | null }[] = [];
afterEach(() => {
  const root = readContentContext()?.root;
  if (root) invalidateHistoryTableProof(root);
  releaseContentContext(root ?? null);
  styles.splice(0).forEach((style) => style.remove());
  faces.splice(0).forEach((face) => document.fonts.delete(face));
  outsideReferences.splice(0).forEach((element) => element.remove());
  for (const { style, parent, next } of harnessStyles.splice(0))
    parent.insertBefore(style, next?.parentNode === parent ? next : null);
});

const detachHarnessLayoutStyle = (): void => {
  // Vitest固有の二ruleだけをfixture外へ戻す。製品allowlistにテスト例外を作らない。
  for (const sheet of Array.from(document.styleSheets)) {
    const style = sheet.ownerNode;
    if (!(style instanceof HTMLStyleElement) || !style.parentNode || sheet.cssRules.length !== 2)
      continue;
    const rules = Array.from(sheet.cssRules);
    if (!rules.every((rule) => rule instanceof CSSStyleRule)) continue;
    const selectors = rules.map((rule) => (rule as CSSStyleRule).selectorText);
    if (selectors.join(',') !== 'html,body' || !style.textContent.trim().startsWith('html {'))
      continue;
    if (
      !rules.every((rule) =>
        Array.from((rule as CSSStyleRule).style).every(
          (name) =>
            /^(?:padding|margin)(?:-(?:top|right|bottom|left))?$/u.test(name) ||
            name === 'min-height',
        ),
      )
    )
      continue;
    harnessStyles.push({ style, parent: style.parentNode, next: style.nextSibling });
    style.remove();
  }
};

// 製品側のrole分類/fontValuesを期待値生成に呼ばず、実computed値を独立に読む。
const actualFontValues = (element: HTMLElement): string[] => {
  const style = getComputedStyle(element);
  return [
    `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`,
    style.getPropertyValue('font-stretch'),
    style.fontVariant,
    style.fontFeatureSettings,
    style.fontVariationSettings,
    style.fontKerning,
    style.fontOpticalSizing,
    style.lineHeight,
    style.letterSpacing,
    style.wordSpacing,
    style.textTransform,
    ...[
      'font-size-adjust',
      'font-synthesis',
      'font-language-override',
      'text-rendering',
      'direction',
      'writing-mode',
      'text-orientation',
      'white-space',
      'word-break',
      'overflow-wrap',
      'hyphens',
      'tab-size',
      'unicode-bidi',
    ].map((name) => style.getPropertyValue(name)),
  ];
};

const directText = (element: Element): string =>
  Array.from(element.childNodes)
    .filter((node) => node.nodeType === Node.TEXT_NODE)
    .map((node) => node.textContent ?? '')
    .join('')
    .trim();

const fontOracle = (root: HTMLElement) =>
  [root, ...root.querySelectorAll<HTMLElement>('*')]
    .map((element, ordinal) => ({ element, ordinal }))
    .filter(
      ({ element }) =>
        element instanceof HTMLElement &&
        directText(element) !== '' &&
        element.localName !== 'script',
    )
    .map(({ element, ordinal }) => ({
      ordinal,
      tag: element.localName,
      text: directText(element),
      values: actualFontValues(element),
    }));

const assertFingerprintCoverage = (root: HTMLElement, fingerprint: string): void => {
  const parsed: unknown = JSON.parse(fingerprint);
  if (!Array.isArray(parsed) || !Array.isArray(parsed[0]) || !Array.isArray(parsed[1]))
    throw new Error('Expected font group dictionary and complete ordinal coverage');
  const groups: unknown[] = parsed[0];
  const assignments = new Map<number, unknown>();
  for (const assignment of parsed[1]) {
    if (
      !Array.isArray(assignment) ||
      typeof assignment[0] !== 'number' ||
      typeof assignment[1] !== 'number'
    )
      throw new Error('Invalid font ordinal assignment');
    expect(assignments.has(assignment[0])).toBe(false);
    assignments.set(assignment[0], groups[assignment[1]]);
  }
  const actual = fontOracle(root);
  expect(assignments.size).toBe(actual.length);
  for (const record of actual)
    expect(assignments.get(record.ordinal), `${record.ordinal}:${record.text}`).toEqual(
      record.values,
    );
};

const setup = async (rows = 40, extraCss = '', compact = false) => {
  detachHarnessLayoutStyle();
  const style = document.createElement('style');
  style.textContent = tableCss + extraCss;
  styles.push(style);
  document.head.append(style);
  const main =
    await fixture<HTMLElement>(`<main id="main-content" style="display:flow-root;width:320px;font-family:serif">
    <h1>全セルの字体を独立照合</h1><p id="oracle-anchor-a">保存位置 <a href="#oracle-anchor-a">参照</a></p>
    <div class="prose" data-note-static-surface="true" data-hydration-key="note-static-surface-enhancer"
    data-hydration-capability="progressive" data-hydration-trigger="post-commit">
    <div data-table-root="true" role="region" tabindex="0" aria-label="Data table"${compact ? ' data-density="compact"' : ''}><table>
    <thead><tr>${Array.from({ length: 8 }, (_, col) => `<th>見出し${col}</th>`).join('')}</tr></thead>
    <tbody>${Array.from({ length: rows }, (_, row) => `<tr>${Array.from({ length: 8 }, (_, col) => `<td${col === 7 ? ' align="right"' : ''}>${row === rows - 1 && col === 7 ? '遠方固有字Ω' : `行${row}列${col}`}</td>`).join('')}</tr>`).join('')}</tbody>
    </table></div></div></main>`);
  initializeContentContext(main);
  const controller = fixtureAbortController(main);
  const authored = main.innerHTML;
  const { prepareTableGeometry } =
    await import('../../src/client/post-hydrate/table-scroll-enhancer.js');
  const prepare = (): void => {
    expect(
      prepareTableGeometry(main, {
        signal: controller.signal,
        isCurrent: () => readContentContext()?.root === main && !readContentContext()?.mutation,
        beforeGeometryChange: () => invalidateHistoryTableProof(main),
      }),
    ).toBe(true);
  };
  prepare();
  const tableRoot = main.querySelector<HTMLElement>('[data-table-root]');
  if (!tableRoot) throw new Error('Table root missing');
  expect(tableRoot.scrollWidth).toBeGreaterThan(tableRoot.clientWidth);
  expect(readPreparedTableGeometry(tableRoot)?.generatedRootId).toBeTruthy();
  await document.fonts.ready;
  return { main, style, controller, authored, prepare };
};

const sourceCertificate = async (value: Awaited<ReturnType<typeof setup>>) => {
  expect(await prepareHistoryFonts(value.main, value.controller.signal)).toBe(true);
  const proof = readHistoryTableProof(value.main);
  expect(proof).not.toBeNull();
  expect(proof?.certificate).not.toBeNull();
  if (!proof?.certificate) {
    const tables = Array.from(
      value.main.querySelectorAll<HTMLElement>('[data-table-root]'),
      readPreparedTableGeometry,
    ).filter((entry) => entry !== null);
    const roles = new Map<string, Set<string>>();
    for (const cell of value.main.querySelectorAll<HTMLTableCellElement>('th,td')) {
      const key = `${cell.localName}:${cell.getAttribute('align') ?? ''}`;
      const values = roles.get(key) ?? new Set<string>();
      values.add(JSON.stringify(actualFontValues(cell)));
      roles.set(key, values);
    }
    console.log(
      'table-font-oracle-source-missing',
      JSON.stringify({
        profile: !!(await prepareHistoryTableFontProfile(value.main)),
        simple: simpleHistoryTableProfile(tables),
        unreferenced: unreferencedHistoryTableIds(value.main, tables),
        serializable: serializeHistoryTableAuthored(value.main, tables) !== null,
        roles: Array.from(roles, ([key, values]) => [key, Array.from(values)]),
        detachedHarnessStyles: harnessStyles.length,
        sheets: Array.from(document.styleSheets, (sheet) => ({
          href: sheet.href,
          rules: sheet.cssRules.length,
          textStart: sheet.ownerNode?.textContent?.slice(0, 180),
          selectors: Array.from(sheet.cssRules)
            .slice(0, 2)
            .map((rule) => rule.cssText),
        })),
      }),
    );
    throw new Error('Approved source certificate missing');
  }
  assertFingerprintCoverage(value.main, proof.fontFingerprint);
  return proof.certificate;
};

const incoming = async (
  value: Awaited<ReturnType<typeof setup>>,
  html = value.authored,
  afterPreparation?: () => void,
) => {
  const intent = beginNavigationIntent('traverse', readAddress());
  const update: ContentUpdatePayload = { html, navigationUrl: readAddress(), renderedKind: 'page' };
  const ticket = await prepareHistoryTableIncoming(update, {
    signal: intent.signal,
    isCurrent: () => !intent.signal.aborted,
    intent,
  });
  expect(ticket).not.toBeNull();
  if (!ticket) throw new Error('Incoming ticket missing');
  afterPreparation?.();
  const epoch = beginContentMutation(value.main);
  expect(commitHistoryTableIncoming(ticket, update, value.main)).toBe(true);
  adoptContentBinding(readAddress());
  const receipt: NavigationCommitReceipt = Object.freeze({
    commitId: 1,
    intentId: intent.intentId,
    entryId: readHistoryEntry()?.id ?? null,
    url: readAddress(),
    contentEpoch: epoch,
    root: value.main,
    shellCommitId: readCurrentShellCommitId(),
    stateOnly: false,
  });
  ticket.accepted?.(receipt);
  const claimed = claimAcceptedIncoming(value.main, receipt);
  expect(claimed).not.toBeNull();
  if (!claimed) throw new Error('Accepted actual-node claim missing');
  value.prepare();
  return { claimed, receipt };
};

describe('portable table font証跡の独立computed oracle', () => {
  it.each(['href', 'aria-details'] as const)(
    'A→B採用で生成ID証跡をBへ再束縛し、B離脱後の外部%s参照をCで拒否する',
    async (attribute) => {
      const value = await setup();
      const certificateA = await sourceCertificate(value);
      const rootA = value.main.querySelector<HTMLElement>('[data-table-root]');
      const idA = rootA ? readPreparedTableGeometry(rootA)?.generatedRootId : null;
      if (!idA) throw new Error('Generation A ID missing');
      expect(certificateA.generatedIds).toContain(idA);
      const actualFonts = fontOracle(value.main);
      const generationB = await incoming(value);
      expect(fontOracle(value.main)).toEqual(actualFonts);
      expect(
        adoptIncomingHistoryTableProof(
          value.main,
          generationB.receipt,
          certificateA,
          generationB.claimed,
        ),
      ).toBe(true);
      const proofB = readHistoryTableProof(value.main);
      const certificateB = proofB?.certificate;
      if (!certificateB) throw new Error('Generation B certificate missing');
      const rootB = value.main.querySelector<HTMLElement>('[data-table-root]');
      const idB = rootB ? readPreparedTableGeometry(rootB)?.generatedRootId : null;
      if (!idB) throw new Error('Generation B ID missing');
      expect(idB).not.toBe(idA);
      expect(certificateB).not.toBe(certificateA);
      expect(Object.isFrozen(certificateB)).toBe(true);
      expect(certificateB.generatedIds).toEqual([idB]);
      expect(certificateB.generatedIds).not.toContain(idA);
      expect(certificateA.generatedIds).toEqual([idA]);
      expect(certificateB.roles).toBe(certificateA.roles);
      expect(certificateB.structure).toBe(certificateA.structure);
      expect(certificateB.fontFingerprint).toBe(certificateA.fontFingerprint);
      const generationC = await incoming(value, value.authored, () => {
        // Cのintent/fragment準備後に、離脱するBへの外部参照が届く境界を再現する。
        const outside = document.createElement(attribute === 'href' ? 'a' : 'span');
        outside.setAttribute(attribute, attribute === 'href' ? `#${idB}` : idB);
        outsideReferences.push(outside);
        document.body.append(outside);
      });
      const idC = value.main.querySelector('[data-table-root]')?.id;
      expect(idC).toBeTruthy();
      expect(idC).not.toBe(idA);
      expect(idC).not.toBe(idB);
      expect(generationC.receipt.contentEpoch).not.toBe(generationB.receipt.contentEpoch);
      expect(
        adoptIncomingHistoryTableProof(
          value.main,
          generationC.receipt,
          certificateB,
          generationC.claimed,
        ),
      ).toBe(false);
      expect(readHistoryTableProof(value.main)).toBeNull();
    },
  );

  it('小さい同形表は実受理receiptと新cellを採用でき、拒否caseの対照になる', async () => {
    const value = await setup();
    const certificate = await sourceCertificate(value);
    const source = fontOracle(value.main);
    const oldCell = value.main.querySelector('td');
    const { receipt, claimed } = await incoming(value);
    expect(value.main.querySelector('td')).not.toBe(oldCell);
    expect(fontOracle(value.main)).toEqual(source);
    expect(adoptIncomingHistoryTableProof(value.main, receipt, certificate, claimed)).toBe(true);
    const adopted = readHistoryTableProof(value.main);
    expect(adopted).not.toBeNull();
    if (!adopted) throw new Error('Adopted small table proof missing');
    assertFingerprintCoverage(value.main, adopted.fontFingerprint);
  });

  it.each(['href', 'aria-details'] as const)(
    'source証明完成後に外部%sが旧生成IDを参照した場合は新IDへ移植しない',
    async (attribute) => {
      const value = await setup();
      const certificate = await sourceCertificate(value);
      const sourceTableRoot = value.main.querySelector<HTMLElement>('[data-table-root]');
      const oldId = sourceTableRoot
        ? readPreparedTableGeometry(sourceTableRoot)?.generatedRootId
        : null;
      expect(oldId).toBeTruthy();
      if (!oldId) throw new Error('Source generated ID missing');
      const outside = document.createElement(attribute === 'href' ? 'a' : 'span');
      outside.setAttribute(attribute, attribute === 'href' ? `#${oldId}` : oldId);
      outsideReferences.push(outside);
      document.body.append(outside);
      const { receipt, claimed } = await incoming(value);
      expect(value.main.querySelector('[data-table-root]')?.id).not.toBe(oldId);
      expect(adoptIncomingHistoryTableProof(value.main, receipt, certificate, claimed)).toBe(false);
      expect(readHistoryTableProof(value.main)).toBeNull();
    },
  );

  it('733行全セルの実computed値とsource役割辞書・新DOMの採用証跡が等価', async () => {
    const value = await setup(733);
    const certificate = await sourceCertificate(value);
    const source = fontOracle(value.main);
    const oldCell = value.main.querySelector('td');
    const oldEpoch = readContentContext()?.contentEpoch;
    const roles = new Map(certificate.roles);
    for (const cell of value.main.querySelectorAll<HTMLTableCellElement>('th,td')) {
      const role = `0:${cell.localName}:${cell.getAttribute('align') ?? ''}`;
      expect(roles.get(role), role).toEqual(actualFontValues(cell));
    }
    expect(value.main.querySelectorAll('th,td')).toHaveLength(5872);
    expect(source.some((record) => record.text === '遠方固有字Ω')).toBe(true);
    const { receipt, claimed } = await incoming(value);
    expect(value.main.querySelector('td')).not.toBe(oldCell);
    expect(receipt.contentEpoch).not.toBe(oldEpoch);
    // 全セルoracleはlayoutをwarmする。dirty実頁の8ms/first-frame証拠には数えない。
    expect(fontOracle(value.main)).toEqual(source);
    for (const cell of value.main.querySelectorAll<HTMLTableCellElement>('th,td')) {
      const role = `0:${cell.localName}:${cell.getAttribute('align') ?? ''}`;
      expect(roles.get(role), role).toEqual(actualFontValues(cell));
    }
    const started = performance.now();
    const adoptedResult = adoptIncomingHistoryTableProof(value.main, receipt, certificate, claimed);
    if (!adoptedResult)
      console.log(
        'table-font-oracle-adoption-failure',
        JSON.stringify({
          elapsed: performance.now() - started,
          diagnostic: readHistoryTableProofDiagnostics(value.main),
          current: claimed.isCurrent(),
          authoredEqual: claimed.authoredSerialization === certificate.authoredSerialization,
          normalizedEqual:
            serializeHistoryTableAuthored(
              value.main,
              Array.from(
                value.main.querySelectorAll<HTMLElement>('[data-table-root]'),
                readPreparedTableGeometry,
              ).filter((entry) => entry !== null),
            ) === certificate.authoredSerialization,
        }),
      );
    expect(adoptedResult).toBe(true);
    const adopted = readHistoryTableProof(value.main);
    expect(adopted).not.toBeNull();
    if (!adopted) throw new Error('Adopted actual-root proof missing');
    assertFingerprintCoverage(value.main, adopted.fontFingerprint);
    expect(fontOracle(value.main)).toEqual(source);
    expect(claimed.tables[0]?.table).toBe(value.main.querySelector('table'));
  }, 15_000);

  it.each(['preexisting-nth-font', 'compact', 'unknown-inline'] as const)(
    '%sはsource準備前から同じでもportable roleへ誤分類しない',
    async (mode) => {
      const value = await setup(
        40,
        mode === 'preexisting-nth-font'
          ? '\n.prose tbody tr:nth-child(40) td:nth-child(8){font-weight:650}'
          : '',
        mode === 'compact',
      );
      if (mode === 'unknown-inline')
        value.main
          .querySelector('tbody tr:last-child td:last-child')
          ?.setAttribute('style', 'font-weight:650');
      await prepareHistoryFonts(value.main, value.controller.signal);
      expect(readHistoryTableProof(value.main)?.certificate ?? null).toBeNull();
    },
  );

  it.each(['ancestor-token', 'cssom', 'new-glyph', 'id-reference', 'font-face'] as const)(
    '%s変更は字体やIDの誤った橋渡しを拒否する',
    async (mode) => {
      const value = await setup();
      const certificate = await sourceCertificate(value);
      let html = value.authored;
      if (mode === 'ancestor-token') value.main.style.setProperty('--font-medium', '650');
      else if (mode === 'cssom')
        value.style.sheet?.insertRule(
          '.prose tbody tr:nth-child(40) td:nth-child(8){font-weight:650}',
          value.style.sheet.cssRules.length,
        );
      else if (mode === 'new-glyph') html = html.replace('遠方固有字Ω', '遠方固有字Ж');
      else if (mode === 'id-reference')
        html = html.replace('id="oracle-anchor-a"', 'id="oracle-anchor-b"');
      else {
        const face = new FontFace('HistoryOracleDistantFace', 'local("serif")', {
          unicodeRange: 'U+03A9',
        });
        faces.push(face);
        document.fonts.add(face);
      }
      const { receipt, claimed } = await incoming(value, html);
      expect(adoptIncomingHistoryTableProof(value.main, receipt, certificate, claimed)).toBe(false);
      expect(readHistoryTableProof(value.main)).toBeNull();
    },
  );
});

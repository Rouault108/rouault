import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { page } from 'vitest/browser';
import tableProfileCss from '../../src/assets/css/table.css?raw';

import {
  captureHistoryGeometry,
  matchesHistoryGeometry,
  prepareHistoryFonts,
  readHistoryGeometryAnchor,
  invalidateHistoryTableProof,
  readHistoryTableProofDiagnostics,
  type HistoryGeometryCheckpoint,
} from '../../src/components/app/controllers/history-presentation-geometry.js';
import type { ReadingPosition } from '../../src/components/app/navigation/reading-position-store.js';
import {
  adoptContentBinding,
  beginContentMutation,
  beginNavigationIntent,
  initializeContentContext,
  markContentRecoveryRequired,
  readContentContext,
  releaseContentContext,
} from '../../src/navigation/content-navigation-context.js';
import { fixture, fixtureAbortController } from './harness/browser-fixture.js';
import {
  prepareTableGeometry,
  enhanceTableScroll,
  readPreparedTableGeometry,
} from '../../src/client/post-hydrate/table-scroll-enhancer.js';
import { readHistoryTableProof } from '../../src/components/app/controllers/history-table-proof.js';

const source = '/notes/testing/reader-basic';
const target = '/notes/testing/toc-readable-long-heading';
const proseId = 'note-content-testing-toc-readable-long-heading';
const originalUrl = location.pathname + location.search + location.hash;
const originalState: unknown = history.state;
const originalRootFontSize = document.documentElement.style.fontSize;
let viewportChanged = false;
const detachedProfileHarnessStyles: { node: HTMLStyleElement; parent: Node; next: Node | null }[] =
  [];

const readAddress = (): string => location.pathname + location.search + location.hash;
const settleHistoryQuota = (): Promise<void> =>
  new Promise((resolve) => window.setTimeout(resolve, 10_000));

beforeAll(async () => {
  // WebKitのquotaは同じtop-level sessionの前suiteから引き継ぐ。
  // URL検証に必要な実書込みだけを、quota期間を空けて開始する。
  await settleHistoryQuota();
  history.replaceState(originalState, '', target);
}, 15_000);

afterEach(async () => {
  for (const { node, parent, next } of detachedProfileHarnessStyles.splice(0))
    parent.insertBefore(node, next?.parentNode === parent ? next : null);
  const activeRoot = readContentContext()?.root;
  if (activeRoot) invalidateHistoryTableProof(activeRoot);
  releaseContentContext(readContentContext()?.root ?? null);
  document.querySelectorAll('[data-history-table-test-style]').forEach((style) => style.remove());
  vi.restoreAllMocks();
  document.documentElement.style.fontSize = originalRootFontSize;
  if (viewportChanged) {
    await page.viewport(1280, 720);
    viewportChanged = false;
  }
  if (readAddress() !== target || JSON.stringify(history.state) !== JSON.stringify(originalState))
    history.replaceState(originalState, '', target);
});

afterAll(async () => {
  history.replaceState(originalState, '', originalUrl);
  // 次suiteの既存履歴試験がこのsuiteの書込みをquotaとして負担しない。
  await settleHistoryQuota();
}, 15_000);

const setup = async (tocTrack = '240px') => {
  const main =
    await fixture<HTMLElement>(`<main id="main-content" style="display:flow-root;width:720px;font-family:serif">
    <section class="note-shell" data-hydration-scope="note-shell" style="--note-toc-track:${tocTrack};display:grid;grid-template-columns:minmax(0,1fr) var(--note-toc-track);gap:32px;align-items:start"><article data-hydration-scope="note-content" style="grid-column:1;min-width:0">
      <header data-article-header><h1>TOC Readable Long Heading</h1></header>
      <div class="prose" id="${proseId}" data-note-static-surface="true"
        data-hydration-key="note-static-surface-enhancer" data-hydration-capability="progressive"
        data-hydration-trigger="post-commit">
        <p>このノートは静的な日本語本文です。</p>
        ${Array.from({ length: 12 }, (_, i) => `<h2 id="heading-${i}" style="margin-top:110px"><span class="heading-text">第${i + 1}章 読書用見出し</span><a data-heading-permalink="true" href="#heading-${i}" style="opacity:0"><svg><path></path></svg></a></h2><p>本文の位置と字体を確認します。</p>`).join('')}
      </div></article>
      <div data-layout-toc-root style="position:sticky;top:64px;align-self:start;height:calc(100vh - 64px);max-height:calc(100vh - 64px);grid-column:2;min-width:0;overflow:hidden">
      ${Array.from({ length: 12 }, (_, i) => `<a href="#heading-${i}" style="font-weight:400;display:block"><span>第${i + 1}章の目次</span></a>`).join('')}
      </div>
      <script id="toc-source-testing-toc-readable-long-heading" type="application/json" data-hydration-marker="toc-source" data-hydration-scope="note-toc">[]</script>
      <layout-toc-controller source-id="toc-source-testing-toc-readable-long-heading"
        toc-runtime-id="toc-source-testing-toc-readable-long-heading"
        toc-owner-id="toc-owner-testing-toc-readable-long-heading"
        capabilities-json='{"activeTracking":true,"dynamicScopes":false,"mobilePanel":true}'
        data-toc-trigger-reserved="true" data-hydration-deferred="toc-trigger"
        data-hydration-scope="note-toc" data-hydration-trigger="initial"
        data-hydration-capability="interactive" content-root-id="${proseId}"></layout-toc-controller>
    </section></main>`);
  await document.fonts.ready;
  const position: ReadingPosition = { version: 1, url: target, x: 0, y: 650 };
  const prose = main.querySelector<HTMLElement>('.prose');
  if (!prose) throw new Error('prose missing');
  return { main, prose, position };
};

const checkpoint = (root: HTMLElement, position: ReadingPosition): HistoryGeometryCheckpoint => {
  const captured = captureHistoryGeometry(root, position, 'verified-layout');
  expect(captured).not.toBeNull();
  if (!captured) throw new Error('checkpoint missing');
  return captured;
};

describe('大きな静的表の完了証跡と予算', () => {
  const setupTable = async (rows = 733, columns = 8) => {
    const style = document.createElement('style');
    style.setAttribute('data-history-table-test-style', '');
    style.textContent = `[data-history-table-fixture] [data-table-root]{width:720px;overflow-x:auto}
      [data-history-table-fixture] table{border-collapse:collapse;table-layout:auto;width:1200px}
      [data-history-table-fixture] th,[data-history-table-fixture] td{padding:4px 8px}
      [data-history-table-fixture] [data-table-scroll-rail]{height:14px;overflow-x:auto;overflow-y:hidden}
      [data-history-table-fixture] [data-table-scroll-rail-spacer]{height:1px}`;
    document.head.append(style);
    const main =
      await fixture<HTMLElement>(`<main id="main-content" data-history-table-fixture style="display:flow-root;width:720px;font-family:serif">
      <h1>全内容と行の幾何を分離する表</h1><div class="prose" data-note-static-surface="true"
      data-hydration-key="note-static-surface-enhancer" data-hydration-capability="progressive" data-hydration-trigger="post-commit">
      <div data-table-root="true" role="region" tabindex="0" aria-label="Data table"><table>
      <thead><tr>${Array.from({ length: columns }, (_, column) => `<th>列${column.toString()}</th>`).join('')}</tr></thead>
      <tbody>${Array.from({ length: rows }, (_, row) => `<tr>${Array.from({ length: columns }, (_, column) => `<td>${row === rows - 1 && column === columns - 1 ? '遠方最終行の独自字体Ω' : `行${row.toString()}列${column.toString()}`}</td>`).join('')}</tr>`).join('')}</tbody></table></div></div></main>`);
    const epoch = initializeContentContext(main);
    const controller = fixtureAbortController(main);
    const current = (): boolean =>
      readContentContext()?.root === main && readContentContext()?.contentEpoch === epoch;
    expect(
      prepareTableGeometry(main, {
        isCurrent: current,
        beforeGeometryChange: () => invalidateHistoryTableProof(main),
        signal: controller.signal,
      }),
    ).toBe(true);
    await document.fonts.ready;
    const tableRoot = main.querySelector<HTMLElement>('[data-table-root]');
    const table = tableRoot?.querySelector('table');
    if (!tableRoot || !table) throw new Error('table fixture missing');
    const position: ReadingPosition = { version: 1, url: target, x: 0, y: 0 };
    return { main, tableRoot, table, position, controller, style };
  };

  const setupPortableTable = async () => {
    const result = await setupTable(24);
    // runnerの画面用CSSをfixtureのCSS集合から外し、監査済みstylesheetだけで契約を検査する。
    for (const sheet of Array.from(document.styleSheets)) {
      const node = sheet.ownerNode;
      if (
        node instanceof HTMLStyleElement &&
        sheet.cssRules.length === 2 &&
        node.textContent.trim().startsWith('html {') &&
        node.parentNode
      ) {
        detachedProfileHarnessStyles.push({
          node,
          parent: node.parentNode,
          next: node.nextSibling,
        });
        node.remove();
      }
    }
    result.style.textContent = tableProfileCss;
    return result;
  };

  it('監査済みCSSと単純cellから純粋dataの移植証跡を発行する', async () => {
    const { main, controller } = await setupPortableTable();
    expect(await prepareHistoryFonts(main, controller.signal)).toBe(true);
    const certificate = readHistoryTableProof(main)?.certificate;

    expect(certificate).toBeDefined();
    expect(certificate?.roles.map(([key]) => key).sort()).toEqual(['0:td:', '0:th:']);
    expect(certificate?.authoredSerialization).not.toContain('data-table-scroll-rail');
    expect(certificate?.authoredSerialization).not.toContain('table-scroll-root-');
    const pureData = (value: unknown): boolean =>
      value === null ||
      typeof value !== 'object' ||
      (Object.isFrozen(value) && Object.values(value).every(pureData));
    expect(pureData(certificate)).toBe(true);
    const captured = checkpoint(main, { version: 1, url: target, x: 0, y: 0 });
    expect(captured.tableCertificate).toBe(certificate);
  });

  it('有限col幅・align役割・明示brの実表構造も全量証明する', async () => {
    const { main, controller, table } = await setupPortableTable();
    const columns = document.createElement('colgroup');
    for (let i = 0; i < 8; i++) {
      const col = document.createElement('col');
      col.dataset['tableColWidth'] = i % 2 ? 'numeric' : 'wide';
      columns.append(col);
    }
    table.prepend(columns);
    for (const row of table.rows) {
      row.cells.item(1)?.setAttribute('align', 'center');
      row.cells.item(2)?.setAttribute('align', 'right');
    }
    const cell = table.rows.item(1)?.cells.item(0);
    if (!cell) throw new Error('missing cell');
    const br = document.createElement('br');
    br.dataset['tableCellBreak'] = 'true';
    cell.append(br, document.createTextNode('追加の全文glyph'));
    expect(await prepareHistoryFonts(main, controller.signal)).toBe(true);
    expect(
      readHistoryTableProof(main)
        ?.certificate?.roles.map(([key]) => key)
        .sort(),
    ).toEqual(['0:td:', '0:td:center', '0:td:right', '0:th:', '0:th:center', '0:th:right']);
  });

  it('CSS監査await中の同epoch rowspan変更を事前走査から除外する', async () => {
    const { main, controller, table } = await setupPortableTable();
    const digest = crypto.subtle.digest.bind(crypto.subtle);
    vi.spyOn(crypto.subtle, 'digest').mockImplementationOnce(async (algorithm, data) => {
      table.rows.item(1)?.cells.item(0)?.setAttribute('rowspan', '2');
      return digest(algorithm, data);
    });
    expect(await prepareHistoryFonts(main, controller.signal)).toBe(false);
    expect(readHistoryTableProof(main)).toBeNull();
  });

  it.each(['aria-details', 'aria-errormessage', 'aria-flowto', 'xlink:href'])(
    'main外の%sも生成ID参照として拒否する',
    async (attribute) => {
      const { main, controller, tableRoot } = await setupPortableTable();
      const reference = document.createElementNS('http://www.w3.org/2000/svg', 'a');
      if (attribute === 'xlink:href')
        reference.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', `#${tableRoot.id}`);
      else reference.setAttribute(attribute, tableRoot.id);
      document.body.append(reference);
      try {
        await prepareHistoryFonts(main, controller.signal);
        expect(readHistoryTableProof(main)?.certificate).toBeUndefined();
      } finally {
        reference.remove();
      }
    },
  );

  it('移植profileは全cellに先行する未知nth overrideを許可しない', async () => {
    const { main, controller, style } = await setupPortableTable();
    style.textContent += ' table td:nth-child(7){font-family:monospace}';
    await prepareHistoryFonts(main, controller.signal);
    expect(readHistoryTableProof(main)?.certificate).toBeUndefined();
  });

  it('移植profileはcompact密度とcell言語上書きを通常証跡から区別する', async () => {
    const { main, controller, tableRoot, table } = await setupPortableTable();
    tableRoot.setAttribute('data-density', 'compact');
    await prepareHistoryFonts(main, controller.signal);
    expect(readHistoryTableProof(main)?.certificate).toBeUndefined();
    tableRoot.removeAttribute('data-density');
    table.rows.item(1)?.cells.item(0)?.setAttribute('lang', 'tr');
    await prepareHistoryFonts(main, controller.signal);
    expect(readHistoryTableProof(main)?.certificate).toBeUndefined();
  });

  it('main外のpercent encoded fragment参照があれば生成IDを正規化しない', async () => {
    const { main, controller, tableRoot } = await setupPortableTable();
    const link = document.createElement('a');
    link.href = `${location.origin}${target}#${encodeURIComponent(tableRoot.id)}`;
    document.body.append(link);
    try {
      await prepareHistoryFonts(main, controller.signal);
      expect(readHistoryTableProof(main)?.certificate).toBeUndefined();
    } finally {
      link.remove();
    }
  });

  it('profileが依存しないreading診断属性だけはsource証跡を失効させない', async () => {
    const { main, controller } = await setupPortableTable();
    expect(await prepareHistoryFonts(main, controller.signal)).toBe(true);
    const proof = readHistoryTableProof(main);
    expect(proof?.certificate).toBeDefined();
    main.dataset['readingPositionStatus'] = 'pending';
    main.dataset['historyPresentationEligibility'] = 'unavailable';
    expect(readHistoryTableProof(main)).toBe(proof);
  });

  it('既知html paint markerの空値切替だけは完成font証跡を取消さない', async () => {
    const { main, controller } = await setupPortableTable();
    expect(await prepareHistoryFonts(main, controller.signal)).toBe(true);
    const proof = readHistoryTableProof(main);
    expect(proof?.certificate).toBeDefined();
    try {
      document.documentElement.setAttribute('data-content-transition', '');
      expect(readHistoryTableProof(main)).toBe(proof);
      document.documentElement.removeAttribute('data-content-transition');
      expect(readHistoryTableProof(main)).toBe(proof);
      document.documentElement.setAttribute('data-content-transition', 'unknown');
      expect(readHistoryTableProof(main)).toBeNull();
    } finally {
      document.documentElement.removeAttribute('data-content-transition');
    }
  });

  it.each(['url(#rouault-table-root-unknown)', 'url(#rouault\\2d table-root-unknown)'])(
    '文書外側の未知CSS参照%sはportable正規化を拒否する',
    async (value) => {
      const { main, controller } = await setupPortableTable();
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('filter', value);
      document.body.append(svg);
      try {
        await prepareHistoryFonts(main, controller.signal);
        expect(readHistoryTableProof(main)?.certificate).toBeUndefined();
      } finally {
        svg.remove();
      }
    },
  );

  it('文書外側のSMIL参照はportable正規化を拒否する', async () => {
    const { main, controller } = await setupPortableTable();
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const animation = document.createElementNS(svg.namespaceURI, 'animate');
    animation.setAttribute('begin', 'unknown.click');
    svg.append(animation);
    document.body.append(svg);
    try {
      await prepareHistoryFonts(main, controller.signal);
      expect(readHistoryTableProof(main)?.certificate).toBeUndefined();
    } finally {
      svg.remove();
    }
  });

  it('同ownerの完了proofを再準備で破棄せず字体検査も繰り返さない', async () => {
    const { main, controller } = await setupPortableTable();
    expect(await prepareHistoryFonts(main, controller.signal)).toBe(true);
    const proof = readHistoryTableProof(main);
    expect(proof?.certificate).toBeDefined();
    const check = vi.spyOn(document.fonts, 'check');
    expect(await prepareHistoryFonts(main, controller.signal)).toBe(true);
    expect(readHistoryTableProof(main)).toBe(proof);
    expect(check).not.toHaveBeenCalled();
  });

  it('未完了proofの照会は同ownerの字体準備を取消さない', async () => {
    const { main, controller } = await setupTable(24);
    let waiting = true;
    let finishLoad: ((faces: FontFace[]) => void) | undefined;
    vi.spyOn(document.fonts, 'check').mockImplementation(() => !waiting);
    const load = vi.spyOn(document.fonts, 'load').mockImplementation(
      () =>
        new Promise((resolve) => {
          finishLoad = resolve;
        }),
    );
    const pending = prepareHistoryFonts(main, controller.signal);
    await vi.waitFor(() => expect(load).toHaveBeenCalled());
    expect(readHistoryTableProof(main)).toBeNull();
    expect(readHistoryTableProof(main)).toBeNull();
    waiting = false;
    finishLoad?.([]);
    expect(await pending).toBe(true);
    expect(readHistoryTableProof(main)).not.toBeNull();
  });

  it('完成cache後の遠方cellのfinished filled字体効果を静的証跡へ転用しない', async () => {
    const { main, controller, table, position } = await setupPortableTable();
    main.style.lineHeight = '24px';
    expect(await prepareHistoryFonts(main, controller.signal)).toBe(true);
    expect(readHistoryTableProof(main)?.certificate).toBeDefined();
    const cell = table.rows.item(24)?.cells.item(7);
    if (!cell) throw new Error('missing far cell');
    const rowHeight = cell.parentElement?.getBoundingClientRect().height;
    const animation = cell.animate([{ fontFamily: 'serif' }, { fontFamily: 'monospace' }], {
      duration: 10000,
      fill: 'forwards',
    });
    try {
      animation.finish();
      await animation.finished;
      expect(animation.playState).toBe('finished');
      expect(animation.effect?.getComputedTiming().progress).toBe(1);
      expect(getComputedStyle(cell).fontFamily).toBe('monospace');
      expect(cell.parentElement?.getBoundingClientRect().height).toBe(rowHeight);
      expect(readHistoryTableProof(main)).toBeNull();
      expect(captureHistoryGeometry(main, position, 'verified-layout')).toBeNull();
      expect(readHistoryTableProofDiagnostics(main)?.invalidation).toBe('current:filled-animation');
    } finally {
      animation.cancel();
    }
  });

  it('733行8列の全構造・全字体・全行検査と実際の予算fallbackを区別する', async () => {
    const { main, table, position, controller } = await setupTable();
    expect(main.querySelectorAll('*').length).toBeGreaterThan(6000);
    expect(captureHistoryGeometry(main, position, 'verified-layout')).toBeNull();
    const scroll = vi.spyOn(window, 'scrollTo');
    const focus = vi.spyOn(HTMLElement.prototype, 'focus');
    const load = vi.spyOn(document.fonts, 'load');
    const prepared = await prepareHistoryFonts(main, controller.signal);
    const readOnly = (): void => {
      expect(load).not.toHaveBeenCalled();
      expect(scroll).not.toHaveBeenCalled();
      expect(focus).not.toHaveBeenCalled();
    };
    if (!prepared) {
      const diagnostic = readHistoryTableProofDiagnostics(main);
      expect(diagnostic?.preparation?.outcome).toBe('budget-exceeded');
      expect(diagnostic?.preparation?.elapsedMilliseconds).toBeGreaterThanOrEqual(1000);
      expect(captureHistoryGeometry(main, position, 'verified-layout')).toBeNull();
      readOnly();
      console.log(
        'history-table-proof-budget',
        JSON.stringify({ classification: 'preparation-budget-fallback', diagnostic }),
      );
      return;
    }
    const proof = readHistoryTableProof(main);
    expect(proof).not.toBeNull();
    expect(proof?.structure).toContain('遠方最終行の独自字体Ω');
    expect(proof?.structure).toContain('thead');
    expect(proof?.fontFingerprint).toContain('serif');
    expect(
      proof?.elements.filter((element) => element instanceof HTMLTableRowElement),
    ).toHaveLength(734);
    expect(
      proof?.elements.filter((element) => element instanceof HTMLTableCellElement),
    ).toHaveLength(8);
    const row = table.rows.item(48);
    if (!row) throw new Error('source row missing');
    const saved = { ...position, y: row.getBoundingClientRect().top + scrollY };
    const captureStarted = performance.now();
    const captured = captureHistoryGeometry(main, saved, 'verified-layout');
    console.log(
      'history-table-capture-budget',
      JSON.stringify({
        milliseconds: performance.now() - captureStarted,
        accepted: captured !== null,
      }),
    );
    if (!captured) {
      const diagnostic = readHistoryTableProofDiagnostics(main);
      expect(diagnostic?.capture?.outcome).toBe('budget-exceeded');
      expect(diagnostic?.capture?.elapsedMilliseconds).toBeGreaterThan(8);
      readOnly();
      console.log(
        'history-table-proof-budget',
        JSON.stringify({ classification: 'capture-budget-fallback', diagnostic }),
      );
      return;
    }
    expect(readHistoryGeometryAnchor(main, captured)).toBe(row);
    const matched = matchesHistoryGeometry(main, captured, 'verified-layout');
    if (!matched) {
      const diagnostic = readHistoryTableProofDiagnostics(main);
      expect(diagnostic?.capture?.outcome).toBe('budget-exceeded');
      expect(diagnostic?.capture?.elapsedMilliseconds).toBeGreaterThan(8);
    }
    readOnly();
    console.log(
      'history-table-proof-budget',
      JSON.stringify({
        classification: matched ? 'complete-and-matched' : 'match-budget-fallback',
        rows: table.rows.length,
        elements: main.querySelectorAll('*').length,
        geometryNumbers: captured.geometry.length,
        structureBytes: new TextEncoder().encode(captured.structure).byteLength,
        fontBytes: new TextEncoder().encode(captured.fontFingerprint).byteLength,
        preparedMilliseconds: proof?.preparedMilliseconds,
        maximumChunkMilliseconds: proof?.maximumChunkMilliseconds,
      }),
    );
  });

  it.each([
    'last-text',
    'row-order',
    'colgroup',
    'column-width',
    'font',
    'rowspan',
    'colspan',
    'individual-style',
  ] as const)('近傍が同じでも%sを変えた未配送mutationは証跡を拒否する', async (change) => {
    const { main, table, position, controller, style } = await setupTable(40);
    expect(await prepareHistoryFonts(main, controller.signal)).toBe(true);
    const captured = checkpoint(main, position);
    const lastRow = table.rows.item(40);
    const last = lastRow?.cells[7];
    if (!last || !lastRow) throw new Error('last cell missing');
    if (change === 'last-text') last.textContent = '遠方だけを変更';
    else if (change === 'row-order') table.tBodies[0]?.prepend(lastRow);
    else if (change === 'colgroup') table.prepend(document.createElement('colgroup'));
    else if (change === 'column-width')
      style.sheet?.insertRule(
        '[data-history-table-fixture] table{width:1300px}',
        style.sheet.cssRules.length,
      );
    else if (change === 'font')
      style.sheet?.insertRule(
        '[data-history-table-fixture] td:last-child{font-family:monospace}',
        style.sheet.cssRules.length,
      );
    else if (change === 'rowspan') last.rowSpan = 2;
    else if (change === 'colspan') last.colSpan = 2;
    else last.style.paddingLeft = '40px';
    expect(matchesHistoryGeometry(main, captured, 'verified-layout')).toBe(false);
    expect(readHistoryTableProof(main)).toBeNull();
  });

  it.each([
    'rowspan',
    'colspan',
    'individual-style',
    'transform',
    'pseudo',
    'table-layout',
    'col-span',
    'svg',
    'mathml',
  ] as const)('%sの未知複雑表は規模内でも準備を許可しない', async (condition) => {
    const { main, table, controller, style, position } = await setupTable(24);
    const cell = table.rows[1]?.cells[0];
    if (!cell) throw new Error('cell');
    if (condition === 'svg' || condition === 'mathml') {
      const namespace =
        condition === 'svg' ? 'http://www.w3.org/2000/svg' : 'http://www.w3.org/1998/Math/MathML';
      const element = document.createElementNS(namespace, condition === 'svg' ? 'svg' : 'math');
      const text = document.createElementNS(namespace, condition === 'svg' ? 'text' : 'mi');
      text.textContent = '未知字体';
      element.append(text);
      cell.append(element);
    } else if (condition === 'rowspan') cell.rowSpan = 2;
    else if (condition === 'colspan') cell.colSpan = 2;
    else if (condition === 'individual-style') cell.style.color = 'red';
    else if (condition === 'col-span') {
      const group = document.createElement('colgroup');
      const col = document.createElement('col');
      col.span = 8;
      group.append(col);
      table.prepend(group);
    } else
      style.sheet?.insertRule(
        condition === 'transform'
          ? '[data-history-table-fixture] tr{transform:translateX(1px)}'
          : condition === 'pseudo'
            ? '[data-history-table-fixture] td::before{content:"追加文字"}'
            : '[data-history-table-fixture] table{table-layout:fixed}',
        style.sheet.cssRules.length,
      );
    expect(await prepareHistoryFonts(main, controller.signal)).toBe(false);
    expect(captureHistoryGeometry(main, position, 'verified-layout')).toBeNull();
  });

  it('同じ内容の別DOMへURLだけで完了証跡を流用せず、準備し直した実rootだけを認める', async () => {
    const { main, position, controller } = await setupTable(24);
    expect(await prepareHistoryFonts(main, controller.signal)).toBe(true);
    const clone = main.cloneNode(true);
    if (!(clone instanceof HTMLElement)) throw new Error('clone');
    main.replaceWith(clone);
    initializeContentContext(clone);
    expect(captureHistoryGeometry(clone, position, 'verified-layout')).toBeNull();
    expect(readHistoryTableProof(clone)).toBeNull();
  });

  it.each([
    'table-transform',
    'outside-transform',
    'generated-text',
    'outside-svg',
    'outside-mathml',
    'list-marker',
  ] as const)('%sの未確認glyphをrawtextの字体確認だけで準備完了にしない', async (condition) => {
    const { main, controller, style } = await setupTable(24);
    if (condition === 'outside-svg' || condition === 'outside-mathml') {
      const svg = condition === 'outside-svg';
      const namespace = svg ? 'http://www.w3.org/2000/svg' : 'http://www.w3.org/1998/Math/MathML';
      const element = document.createElementNS(namespace, svg ? 'svg' : 'math');
      const text = document.createElementNS(namespace, svg ? 'text' : 'mi');
      if (svg) {
        element.setAttribute('width', '100');
        element.setAttribute('height', '30');
        text.setAttribute('y', '20');
      }
      text.textContent = '未確認glyph';
      element.append(text);
      main.append(element);
    } else if (condition === 'list-marker') {
      const list = document.createElement('ul');
      const item = document.createElement('li');
      item.textContent = 'marker glyph';
      list.append(item);
      main.append(list);
    } else
      style.sheet?.insertRule(
        condition === 'table-transform'
          ? '[data-history-table-fixture] td{text-transform:uppercase}'
          : condition === 'outside-transform'
            ? '[data-history-table-fixture] h1{text-transform:uppercase}'
            : '[data-history-table-fixture] h1::before{content:"未知glyph"}',
        style.sheet.cssRules.length,
      );
    expect(await prepareHistoryFonts(main, controller.signal)).toBe(false);
    expect(readHistoryTableProof(main)).toBeNull();
  });

  it('生成IDが別の実rootで変われば旧IDへのhrefが残る内容を同じ証跡と認めない', async () => {
    const { main, tableRoot, controller, position } = await setupTable(24);
    const sourceId = tableRoot.id;
    expect(sourceId).not.toBe('');
    const link = document.createElement('a');
    link.href = `#${sourceId}`;
    link.textContent = '表への参照';
    main.append(link);
    expect(await prepareHistoryFonts(main, controller.signal)).toBe(true);
    const captured = checkpoint(main, position);
    const clone = main.cloneNode(true);
    if (!(clone instanceof HTMLElement)) throw new Error('clone');
    clone.querySelectorAll('[data-table-scroll-rail]').forEach((rail) => rail.remove());
    const nextRoot = clone.querySelector<HTMLElement>('[data-table-root]');
    if (!nextRoot) throw new Error('next table');
    nextRoot.removeAttribute('id');
    main.replaceWith(clone);
    const epoch = initializeContentContext(clone);
    const nextController = fixtureAbortController(clone);
    expect(
      prepareTableGeometry(clone, {
        isCurrent: () =>
          readContentContext()?.root === clone && readContentContext()?.contentEpoch === epoch,
        beforeGeometryChange: () => invalidateHistoryTableProof(clone),
        signal: nextController.signal,
      }),
    ).toBe(true);
    expect(nextRoot.id).not.toBe(sourceId);
    expect(clone.querySelector('a')?.getAttribute('href')).toBe(`#${sourceId}`);
    expect(await prepareHistoryFonts(clone, nextController.signal)).toBe(true);
    const current = checkpoint(clone, position);
    expect(current.geometry).toEqual(captured.geometry);
    expect(current.structure).not.toBe(captured.structure);
    expect(matchesHistoryGeometry(clone, captured, 'verified-layout')).toBe(false);
  });

  it.each(['root-focus', 'checked-property'] as const)(
    '%sだけで字体が変わる場合もDOM mutation無しのcacheを拒否する',
    async (condition) => {
      const { main, table, position, controller, style } = await setupTable(24);
      main.tabIndex = -1;
      const control = await fixture<HTMLInputElement>(
        '<input type="checkbox" data-history-table-switch>',
      );
      style.sheet?.insertRule(
        condition === 'root-focus'
          ? 'main:focus td{font-family:monospace}'
          : 'body:has(input[data-history-table-switch]:checked) td{font-family:monospace}',
        style.sheet.cssRules.length,
      );
      expect(await prepareHistoryFonts(main, controller.signal)).toBe(true);
      const cell = table.rows.item(1)?.cells.item(0);
      if (!cell) throw new Error('cell');
      const before = getComputedStyle(cell).fontFamily;
      if (condition === 'root-focus') main.focus({ preventScroll: true });
      else control.checked = true;
      expect(getComputedStyle(cell).fontFamily).not.toBe(before);
      expect(captureHistoryGeometry(main, position, 'verified-layout')).toBeNull();
      expect(readHistoryTableProof(main)).toBeNull();
    },
  );

  it('import先のCSSOMを固定できないstylesheetがある場合は準備を拒否する', async () => {
    const { main, controller, style } = await setupTable(24);
    style.sheet?.insertRule('@import url("data:text/css,td%7Bcolor:red%7D");', 0);
    expect(style.sheet?.cssRules.item(0)).toBeInstanceOf(CSSImportRule);
    expect(await prepareHistoryFonts(main, controller.signal)).toBe(false);
    expect(readHistoryTableProof(main)).toBeNull();
  });

  it('DOM mutation無しで変わる未追跡のdefined selectorがある場合も準備を拒否する', async () => {
    const { main, controller, style } = await setupTable(24);
    style.sheet?.insertRule(
      '.history-external:defined ~ main td{font-family:monospace}',
      style.sheet.cssRules.length,
    );
    expect(await prepareHistoryFonts(main, controller.signal)).toBe(false);
    expect(readHistoryTableProof(main)).toBeNull();
  });

  it('viewportと独立して変化するcontainer queryのあるstylesheetは拒否する', async () => {
    const { main, controller, style } = await setupTable(24);
    style.sheet?.insertRule(
      '@container (min-width:1px){td{font-family:monospace}}',
      style.sheet.cssRules.length,
    );
    expect(await prepareHistoryFonts(main, controller.signal)).toBe(false);
    expect(readHistoryTableProof(main)).toBeNull();
  });

  it('FontFaceSetのface追加はloaded状態でもcacheを失効する', async () => {
    const { main, controller } = await setupTable(24);
    expect(await prepareHistoryFonts(main, controller.signal)).toBe(true);
    const face = new FontFace('history-table-added', 'local(serif)');
    document.fonts.add(face);
    try {
      expect(readHistoryTableProof(main)).toBeNull();
    } finally {
      document.fonts.delete(face);
    }
  });

  it('再準備後のrowboxと字体文字列が同じでもCSS環境の異なる旧証跡は一致しない', async () => {
    const { main, controller, position, style } = await setupTable(24);
    expect(await prepareHistoryFonts(main, controller.signal)).toBe(true);
    const captured = checkpoint(main, position);
    style.sheet?.insertRule(
      '[data-history-table-fixture] td{text-align:center}',
      style.sheet.cssRules.length,
    );
    expect(await prepareHistoryFonts(main, controller.signal)).toBe(true);
    const current = checkpoint(main, position);
    expect(current.geometry).toEqual(captured.geometry);
    expect(current.tableEnvironment).not.toBe(captured.tableEnvironment);
    expect(matchesHistoryGeometry(main, captured, 'verified-layout')).toBe(false);
  });

  it('同期全行測定中にownerが変われば帰る直前の再照合で証跡を返さない', async () => {
    const { main, table, controller, position } = await setupTable(24);
    expect(await prepareHistoryFonts(main, controller.signal)).toBe(true);
    const row = table.rows.item(24);
    if (!row) throw new Error('row');
    const read = row.getBoundingClientRect.bind(row);
    let changed = false;
    vi.spyOn(row, 'getBoundingClientRect').mockImplementation(() => {
      if (!changed) {
        changed = true;
        beginContentMutation(main);
      }
      return read();
    });
    expect(captureHistoryGeometry(main, position, 'verified-layout')).toBeNull();
    expect(changed).toBe(true);
    expect(readContentContext()?.mutation).toBe(true);
  });

  it.each(['nodes', 'rows', 'columns', 'text', 'serialized', 'font-groups'] as const)(
    '%s予算超過は準備完了を作らず通常fallbackにする',
    async (condition) => {
      const { main, table, controller, style } = await setupTable(
        condition === 'nodes' ? 910 : condition === 'rows' ? 1025 : 24,
        condition === 'columns' ? 33 : 8,
      );
      const cell = table.rows.item(1)?.cells.item(0);
      if (!cell) throw new Error('cell');
      if (condition === 'text') cell.textContent = '字'.repeat(128_001);
      else if (condition === 'serialized')
        cell.setAttribute('data-full-fingerprint', 'x'.repeat(524_289));
      else if (condition === 'font-groups')
        for (let i = 1; i <= 20; i++)
          style.sheet?.insertRule(
            `[data-history-table-fixture] tbody tr:nth-child(${i.toString()}) td{font-size:${(10 + i).toString()}px}`,
            style.sheet.cssRules.length,
          );
      expect(await prepareHistoryFonts(main, controller.signal)).toBe(false);
      expect(readHistoryTableProof(main)).toBeNull();
    },
  );

  it('同期予算8msを超えた測定結果は採用せず保存位置を書き換えない', async () => {
    const { main, controller, position } = await setupTable(24);
    expect(await prepareHistoryFonts(main, controller.signal)).toBe(true);
    const scroll = vi.spyOn(window, 'scrollTo');
    let time = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => (time += 9));
    expect(captureHistoryGeometry(main, position, 'verified-layout')).toBeNull();
    expect(scroll).not.toHaveBeenCalled();
    expect(position.y).toBe(0);
  });

  it('巨大font待機も実1000msの期限で終了して完了証跡を残さない', async () => {
    const { main, controller } = await setupTable(24);
    vi.spyOn(document.fonts, 'check').mockReturnValue(false);
    vi.spyOn(document.fonts, 'load').mockImplementation(
      () =>
        new Promise<FontFace[]>(() => {
          /* 期限を検証する未完了load。 */
        }),
    );
    const started = performance.now();
    expect(await prepareHistoryFonts(main, controller.signal)).toBe(false);
    expect(performance.now() - started).toBeGreaterThanOrEqual(950);
    expect(readHistoryTableProof(main)).toBeNull();
  });

  it('旧font待機のfinallyが同mainの新epoch準備の診断を上書きしない', async () => {
    const { main, controller } = await setupTable(24);
    const check = document.fonts.check.bind(document.fonts);
    let first = true;
    vi.spyOn(document.fonts, 'check').mockImplementation((font, text) => {
      if (first) {
        first = false;
        return false;
      }
      return check(font, text);
    });
    let release: () => void = () => {
      throw new Error('load not started');
    };
    const load = vi.spyOn(document.fonts, 'load').mockImplementation(
      () =>
        new Promise<FontFace[]>((resolve) => {
          release = () => resolve([]);
        }),
    );
    const previous = prepareHistoryFonts(main, controller.signal);
    await expect.poll(() => load.mock.calls.length).toBe(1);
    const epoch = beginContentMutation(main);
    adoptContentBinding(target);
    const nextController = fixtureAbortController(main);
    expect(
      prepareTableGeometry(main, {
        isCurrent: () =>
          readContentContext()?.root === main && readContentContext()?.contentEpoch === epoch,
        beforeGeometryChange: () => invalidateHistoryTableProof(main),
        signal: nextController.signal,
      }),
    ).toBe(true);
    expect(await prepareHistoryFonts(main, nextController.signal)).toBe(true);
    const latest = readHistoryTableProofDiagnostics(main);
    expect(latest).toMatchObject({
      contentEpoch: epoch,
      url: target,
      preparation: { outcome: 'ready' },
    });
    release();
    expect(await previous).toBe(false);
    expect(readHistoryTableProofDiagnostics(main)).toBe(latest);
    expect(readHistoryTableProof(main)).not.toBeNull();
  });

  it.each(['abort', 'mutation', 'recovery', 'viewport', 'font-loading', 'ancestor-style'] as const)(
    '準備中の%sは全走査を続けず通常fallbackへ戻す',
    async (condition) => {
      const { main, controller } = await setupTable();
      const pending = prepareHistoryFonts(main, controller.signal);
      if (condition === 'abort') controller.abort();
      else if (condition === 'mutation') beginContentMutation(main);
      else if (condition === 'recovery')
        markContentRecoveryRequired(main, readContentContext()?.contentEpoch ?? -1);
      else if (condition === 'viewport') window.dispatchEvent(new Event('resize'));
      else if (condition === 'font-loading') {
        vi.spyOn(document.fonts, 'status', 'get').mockReturnValue('loading');
        document.fonts.dispatchEvent(new Event('loading'));
      } else document.body.style.setProperty('--history-table-test', 'changed');
      try {
        expect(await pending).toBe(false);
        expect(readHistoryTableProof(main)).toBeNull();
      } finally {
        document.body.style.removeProperty('--history-table-test');
      }
    },
  );

  it('未読込glyphは遠方セルを含む実text/fontの小分けで準備し、deadlineとabortを守る', async () => {
    const { main, controller } = await setupTable(24);
    const original = document.fonts.check.bind(document.fonts);
    let requested = false;
    vi.spyOn(document.fonts, 'check').mockImplementation((font, text) =>
      text?.includes('Ω') && !requested ? false : original(font, text),
    );
    const load = vi.spyOn(document.fonts, 'load').mockImplementation(async () => {
      requested = true;
      return [];
    });
    expect(await prepareHistoryFonts(main, controller.signal)).toBe(true);
    expect(
      load.mock.calls.some(
        ([font, text]) => font.includes('serif') && text?.includes('遠方最終行の独自字体Ω'),
      ),
    ).toBe(true);
    expect(load.mock.calls.every(([, text]) => Array.from(text ?? '').length <= 128)).toBe(true);
  });

  it('preparedからactivationへの属性解除は同じ全行boxとowned rail証跡を保つ', async () => {
    const { main, tableRoot, position, controller } = await setupTable(24);
    expect(await prepareHistoryFonts(main, controller.signal)).toBe(true);
    const captured = checkpoint(main, position);
    const before = readPreparedTableGeometry(tableRoot);
    enhanceTableScroll(main, controller.signal);
    await Promise.resolve();
    const after = readPreparedTableGeometry(tableRoot);
    expect(after?.rail).toBe(before?.rail);
    expect(after?.geometryVersion).toBe(before?.geometryVersion);
    expect(matchesHistoryGeometry(main, captured, 'verified-layout')).toBe(true);
    invalidateHistoryTableProof(main);
    expect(await prepareHistoryFonts(main, controller.signal)).toBe(true);
    expect(matchesHistoryGeometry(main, captured, 'verified-layout')).toBe(true);
  });
});

const staticPage = async (content: string) => {
  const main = await fixture<HTMLElement>(
    `<main id="main-content" style="display:flow-root;width:720px;min-height:3600px;font-family:serif"><article>${content}</article></main>`,
  );
  await document.fonts.ready;
  const position: ReadingPosition = { version: 1, url: target, x: 0, y: 650 };
  return { main, position };
};

const paragraphs = (): string =>
  Array.from(
    { length: 12 },
    (_, index) => `<p style="margin-top:100px">第${index + 1}段落の静的な本文です。</p>`,
  ).join('');

const loadedImage = async (root: HTMLElement): Promise<HTMLImageElement> => {
  const image = document.createElement('img');
  image.setAttribute('width', '40');
  image.setAttribute('height', '30');
  image.alt = '寸法の確定した画像';
  image.src = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="40" height="30"><rect width="40" height="30" fill="black"/></svg>')}`;
  root.append(image);
  await image.decode();
  return image;
};

const mobilePage = async (width = 390) => {
  viewportChanged = true;
  await page.viewport(width, 844);
  const { main, position } = await setup();
  const shell = main.querySelector<HTMLElement>('.note-shell');
  const toc = main.querySelector<HTMLElement>('[data-layout-toc-root]');
  const link = toc?.querySelector<HTMLElement>('a');
  if (!shell || !toc || !link) throw new Error('mobile TOC fixture missing');
  main.style.width = '360px';
  shell.style.gridTemplateColumns = 'minmax(0,1fr)';
  toc.style.cssText =
    'position:static;height:0;min-height:0;max-height:0;overflow:hidden;grid-column:1';
  for (const child of toc.children) {
    if (!(child instanceof HTMLElement)) throw new Error('mobile TOC child missing');
    child.hidden = true;
    child.style.display = 'none';
  }
  return { main, position, shell, toc, link };
};

const nativeCssTransition = async (
  element: HTMLElement,
  property: 'color' | 'transform' | 'opacity',
  from: string,
  to: string,
): Promise<CSSTransition> => {
  element.style.setProperty(property, from);
  element.style.transition = `${property} 70ms linear`;
  // 最初の描画状態を確定させ、WAAPI mockではなく実CSS transitionを発生させる。
  await new Promise<void>((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
  );
  element.style.setProperty(property, to);
  const transition = element
    .getAnimations()
    .find(
      (animation): animation is CSSTransition =>
        animation instanceof CSSTransition && animation.transitionProperty === property,
    );
  if (!transition) throw new Error(`Expected native CSS ${property} transition`);
  transition.pause();
  transition.currentTime = 35;
  await transition.ready;
  return transition;
};

describe('履歴本文の幾何checkpoint', () => {
  it('検証済みTOCの実color transitionは異なるactive色の途中も本文幾何とfontを保つ', async () => {
    const { main, position } = await setup();
    const link = main.querySelector<HTMLElement>('[data-layout-toc-root] a');
    if (!link) throw new Error('TOC link missing');
    link.classList.add('layout-toc__link');
    const captured = checkpoint(main, position);
    const transition = await nativeCssTransition(
      link,
      'color',
      'rgb(10, 20, 30)',
      'rgb(110, 140, 170)',
    );
    try {
      expect(transition).toBeInstanceOf(CSSTransition);
      expect(transition.transitionProperty).toBe('color');
      const intermediate = getComputedStyle(link).color;
      expect(intermediate).not.toBe('rgb(10, 20, 30)');
      expect(intermediate).not.toBe('rgb(110, 140, 170)');
      const during = checkpoint(main, position);
      expect(during.geometry).toEqual(captured.geometry);
      expect(during.fontFingerprint).toBe(captured.fontFingerprint);
      expect(matchesHistoryGeometry(main, captured, 'verified-layout')).toBe(true);
      transition.finish();
      await transition.finished;
      expect(getComputedStyle(link).color).toBe('rgb(110, 140, 170)');
      expect(matchesHistoryGeometry(main, captured, 'verified-layout')).toBe(true);
    } finally {
      transition.cancel();
    }
  });

  it.each([
    ['transform', 'translateX(0px)', 'translateX(1px)'],
    ['opacity', '1', '0.9'],
  ] as const)('TOC linkでも実%s transitionはcolorの例外へ含めない', async (property, from, to) => {
    const { main, position } = await setup();
    const link = main.querySelector<HTMLElement>('[data-layout-toc-root] a');
    if (!link) throw new Error('TOC link missing');
    link.classList.add('layout-toc__link');
    const transition = await nativeCssTransition(link, property, from, to);
    try {
      expect(captureHistoryGeometry(main, position, 'verified-layout')).toBeNull();
    } finally {
      transition.cancel();
    }
  });

  it('同じlink classでもTOC外の実color transitionは拒否する', async () => {
    const { main, prose, position } = await setup();
    const text = prose.querySelector('p');
    if (!text) throw new Error('body paragraph missing');
    text.classList.add('layout-toc__link');
    const transition = await nativeCssTransition(
      text,
      'color',
      'rgb(10, 20, 30)',
      'rgb(110, 140, 170)',
    );
    try {
      expect(captureHistoryGeometry(main, position, 'verified-layout')).toBeNull();
    } finally {
      transition.cancel();
    }
  });

  it('TOC内colorでもtrackが未検証なら実CSS transitionを許可しない', async () => {
    const { main, position } = await setup();
    const link = main.querySelector<HTMLElement>('[data-layout-toc-root] a');
    const shell = main.querySelector<HTMLElement>('.note-shell');
    if (!link || !shell) throw new Error('TOC fixture missing');
    link.classList.add('layout-toc__link');
    shell.style.gridTemplateColumns = 'minmax(0,1fr) 250px';
    const transition = await nativeCssTransition(
      link,
      'color',
      'rgb(10, 20, 30)',
      'rgb(110, 140, 170)',
    );
    try {
      expect(captureHistoryGeometry(main, position, 'verified-layout')).toBeNull();
    } finally {
      transition.cancel();
    }
  });

  it('検証済みTOC内でもWAAPI colorをCSS color transitionと同一視しない', async () => {
    const { main, position } = await setup();
    const link = main.querySelector<HTMLElement>('[data-layout-toc-root] a');
    if (!link) throw new Error('TOC link missing');
    link.classList.add('layout-toc__link');
    const animation = link.animate(
      [{ color: 'rgb(10, 20, 30)' }, { color: 'rgb(110, 140, 170)' }],
      { duration: 70 },
    );
    animation.pause();
    try {
      await animation.ready;
      expect(animation).not.toBeInstanceOf(CSSTransition);
      expect(captureHistoryGeometry(main, position, 'verified-layout')).toBeNull();
    } finally {
      animation.cancel();
    }
  });

  it('使用字体がすでにload済みならloadを呼ばずDOM/scroll/focusを変更しない', async () => {
    const { main } = await staticPage('<p style="font:400 18px serif">日本語の本文</p>');
    const check = vi.spyOn(document.fonts, 'check').mockReturnValue(true);
    const load = vi.spyOn(document.fonts, 'load').mockResolvedValue([]);
    const scroll = vi.spyOn(window, 'scrollTo');
    const focus = vi.spyOn(main, 'focus');
    const html = main.outerHTML;
    let mutations = 0;
    const observer = new MutationObserver((records) => {
      mutations += records.length;
    });
    observer.observe(main, {
      subtree: true,
      childList: true,
      attributes: true,
      characterData: true,
    });
    try {
      expect(await prepareHistoryFonts(main, new AbortController().signal)).toBe(true);
      await Promise.resolve();
      expect(check).toHaveBeenCalledWith('normal 400 18px serif', '日本語の本文');
      expect(load).not.toHaveBeenCalled();
      expect(main.outerHTML).toBe(html);
      expect(mutations + observer.takeRecords().length).toBe(0);
      expect(scroll).not.toHaveBeenCalled();
      expect(focus).not.toHaveBeenCalled();
    } finally {
      observer.disconnect();
    }
  });

  it('可視の実textを字体ごとに重複排除し正確なfont/textでloadを要求する', async () => {
    const { main } = await staticPage(
      '<p style="font:400 18px serif">日本語A</p><p style="font:400 18px serif">ASCII B</p><p style="font:400 18px serif">日本語A</p><p style="font:500 18px serif">太字C</p><p hidden style="font:400 18px serif">非表示D</p>',
    );
    vi.spyOn(document.fonts, 'check').mockReturnValue(false);
    const load = vi.spyOn(document.fonts, 'load').mockResolvedValue([]);
    expect(await prepareHistoryFonts(main, new AbortController().signal)).toBe(true);
    expect(load.mock.calls).toEqual([
      ['normal 400 18px serif', '日本語AASCII B'],
      ['normal 500 18px serif', '太字C'],
    ]);
  });

  it('font loadのrejectを位置jobへ伝播せずfalseで返す', async () => {
    const { main } = await staticPage('<p>未読込の字体</p>');
    vi.spyOn(document.fonts, 'check').mockReturnValue(false);
    vi.spyOn(document.fonts, 'load').mockRejectedValue(new Error('font request rejected'));
    await expect(prepareHistoryFonts(main, new AbortController().signal)).resolves.toBe(false);
  });

  it('静的surface検査のDOM API例外もrejectせずfalseで返す', async () => {
    const { main } = await staticPage('<p>検査対象の本文</p>');
    vi.spyOn(main, 'querySelector').mockImplementationOnce(() => {
      throw new Error('surface inspection unavailable');
    });
    const load = vi.spyOn(document.fonts, 'load');
    await expect(prepareHistoryFonts(main, new AbortController().signal)).resolves.toBe(false);
    expect(load).not.toHaveBeenCalled();
  });

  it('開始前のabortでは字体loadを要求しない', async () => {
    const { main } = await staticPage('<p>取消済みの本文</p>');
    const signal = new AbortController();
    signal.abort();
    const load = vi.spyOn(document.fonts, 'load');
    expect(await prepareHistoryFonts(main, signal.signal)).toBe(false);
    expect(load).not.toHaveBeenCalled();
  });

  it('未完了font loadを待つ間のabortを受理しfalseで終了する', async () => {
    const { main } = await staticPage('<p>待機中の本文</p>');
    vi.spyOn(document.fonts, 'check').mockReturnValue(false);
    vi.spyOn(document.fonts, 'load').mockImplementation(
      () => new Promise<FontFace[]>(() => undefined),
    );
    const controller = new AbortController();
    const waiting = prepareHistoryFonts(main, controller.signal);
    controller.abort();
    await expect(waiting).resolves.toBe(false);
  });

  it('font loadが終わらなくても実時間1000msの期限でfalseへ縮退する', async () => {
    const { main } = await staticPage('<p>応答のない字体</p>');
    vi.spyOn(document.fonts, 'check').mockReturnValue(false);
    vi.spyOn(document.fonts, 'load').mockImplementation(
      () => new Promise<FontFace[]>(() => undefined),
    );
    const started = performance.now();
    expect(await prepareHistoryFonts(main, new AbortController().signal)).toBe(false);
    expect(performance.now() - started).toBeGreaterThanOrEqual(900);
  });

  it.each([390, 639])(
    '幅%sの閉鎖TOCは単一track/static/高さ0/子rect0のとき採取できる',
    async (width) => {
      const { main, position, toc } = await mobilePage(width);
      expect(toc.getBoundingClientRect().height).toBe(0);
      expect(
        [...toc.querySelectorAll('*')].every(
          (child) =>
            child.getBoundingClientRect().width === 0 && child.getBoundingClientRect().height === 0,
        ),
      ).toBe(true);
      const captured = checkpoint(main, position);
      expect(matchesHistoryGeometry(main, captured, 'verified-layout')).toBe(true);
    },
  );

  it('body配下の全mobile panelがhidden/inert/aria-hiddenかつrect0の時だけ閉鎖TOCを許可する', async () => {
    const { main, position } = await mobilePage();
    const panel = await fixture<HTMLElement>(
      '<aside data-layout-toc-mobile-panel hidden inert aria-hidden="true" style="display:none">閉じた目次</aside>',
    );
    expect(captureHistoryGeometry(main, position, 'verified-layout')).not.toBeNull();
    for (const attribute of ['hidden', 'inert', 'aria-hidden']) {
      panel.removeAttribute(attribute);
      expect(captureHistoryGeometry(main, position, 'verified-layout')).toBeNull();
      panel.setAttribute(attribute, attribute === 'aria-hidden' ? 'true' : '');
    }
    const open = await fixture<HTMLElement>(
      '<aside data-layout-toc-mobile-panel style="width:200px;height:100px">別の開いた目次</aside>',
    );
    expect(open.getBoundingClientRect().width).toBeGreaterThan(0);
    expect(captureHistoryGeometry(main, position, 'verified-layout')).toBeNull();
    open.hidden = true;
    open.inert = true;
    open.setAttribute('aria-hidden', 'true');
    open.style.display = 'none';
    expect(captureHistoryGeometry(main, position, 'verified-layout')).not.toBeNull();
  });

  it.each(['visible-child', 'nonzero-height', 'two-tracks', 'sticky-position', 'tablet-boundary'])(
    'mobile閉鎖TOCの%sは独立表示の安全証明として扱わない',
    async (condition) => {
      const { main, position, shell, toc, link } = await mobilePage(
        condition === 'tablet-boundary' ? 640 : 390,
      );
      if (condition === 'visible-child') {
        link.hidden = false;
        link.style.display = 'block';
        expect(link.getBoundingClientRect().height).toBeGreaterThan(0);
      } else if (condition === 'nonzero-height') {
        toc.style.height = '1px';
        toc.style.maxHeight = '1px';
      } else if (condition === 'two-tracks') shell.style.gridTemplateColumns = 'minmax(0,1fr) 20px';
      else if (condition === 'sticky-position') toc.style.position = 'sticky';
      expect(captureHistoryGeometry(main, position, 'verified-layout')).toBeNull();
    },
  );

  it.each([
    ['root', 'running'],
    ['root', 'paused'],
    ['root', 'pending'],
    ['descendant', 'running'],
    ['descendant', 'paused'],
    ['descendant', 'pending'],
    ['ancestor', 'running'],
    ['ancestor', 'paused'],
    ['ancestor', 'pending'],
  ])('%sの%s WAAPIがあれば採取せずfinish/cancel後の静的状態は許可する', async (scope, state) => {
    const { main, position } = await staticPage(paragraphs());
    const element =
      scope === 'root' ? main : scope === 'ancestor' ? main.parentElement : main.querySelector('p');
    if (!element) throw new Error('animation surface missing');
    const animation = element.animate([{ transform: 'none' }, { transform: 'none' }], {
      duration: 10_000,
      fill: 'none',
    });
    try {
      if (state === 'pending') expect(animation.pending).toBe(true);
      else {
        if (state === 'paused') animation.pause();
        await animation.ready;
        expect(animation.playState).toBe(state);
      }
      expect(captureHistoryGeometry(main, position, 'verified-layout')).toBeNull();
      animation.finish();
      await animation.finished;
      expect(captureHistoryGeometry(main, position, 'verified-layout')).not.toBeNull();
      animation.cancel();
      expect(captureHistoryGeometry(main, position, 'verified-layout')).not.toBeNull();
    } finally {
      animation.cancel();
    }
  });

  it.each(['root', 'descendant', 'ancestor'])(
    '%sのfinished fill効果は残存中だけcaptureを拒否する',
    async (scope) => {
      const { main, position } = await staticPage(paragraphs());
      const element =
        scope === 'root'
          ? main
          : scope === 'ancestor'
            ? main.parentElement
            : main.querySelector('p');
      if (!element) throw new Error('missing effect target');
      const animation = element.animate([{ opacity: 1 }, { opacity: 1 }], {
        duration: 10000,
        fill: 'forwards',
      });
      try {
        animation.finish();
        await animation.finished;
        expect(animation.effect?.getComputedTiming().progress).toBe(1);
        expect(captureHistoryGeometry(main, position, 'verified-layout')).toBeNull();
        animation.cancel();
        expect(captureHistoryGeometry(main, position, 'verified-layout')).not.toBeNull();
      } finally {
        animation.cancel();
      }
    },
  );

  it.each(['animate', 'animateMotion', 'animateTransform', 'set'])(
    'SMIL %s要素があればWAAPI一覧が空でも拒否し除去後だけ許可する',
    async (tag) => {
      const { main, position } = await staticPage(paragraphs());
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      const animation = document.createElementNS('http://www.w3.org/2000/svg', tag);
      animation.setAttribute('attributeName', 'opacity');
      animation.setAttribute('values', '1;1');
      animation.setAttribute('dur', '10000s');
      svg.append(animation);
      main.append(svg);
      expect(main.getAnimations({ subtree: true })).toHaveLength(0);
      expect(captureHistoryGeometry(main, position, 'verified-layout')).toBeNull();
      animation.remove();
      expect(captureHistoryGeometry(main, position, 'verified-layout')).not.toBeNull();
    },
  );

  it('addressが先に進んだ時は表示中の旧root/entry/epochの明示ownerだけで同期採取する', async () => {
    const { main, position } = await staticPage(paragraphs());
    const entryId = 'geometry-displayed-source';
    history.replaceState({ __rouaultHistoryEntry: { version: 1, id: entryId } }, '', target);
    const contentEpoch = initializeContentContext(main);
    history.replaceState(
      { __rouaultHistoryEntry: { version: 1, id: 'geometry-next-entry' } },
      '',
      source,
    );
    beginNavigationIntent('traverse', source);
    expect(readContentContext()?.displayedBinding).toEqual({ entryId, url: target });
    expect(readContentContext()?.addressBinding.url).toBe(source);
    expect(captureHistoryGeometry(main, position, 'verified-layout')).toBeNull();
    const captured = captureHistoryGeometry(main, position, 'verified-layout', {
      entryId,
      contentEpoch,
    });
    expect(captured).not.toBeNull();
    expect(captured?.position).toEqual(position);
    expect(captured?.text).toContain('静的な本文');
  });

  it.each(['entry', 'epoch', 'root', 'displayed-url', 'mutation', 'recovery'])(
    '旧DOM採取でも%sが表示ownerと不一致なら許可しない',
    async (mismatch) => {
      const { main, position } = await staticPage(paragraphs());
      const entryId = 'geometry-displayed-source';
      history.replaceState({ __rouaultHistoryEntry: { version: 1, id: entryId } }, '', target);
      const contentEpoch = initializeContentContext(main);
      history.replaceState(
        { __rouaultHistoryEntry: { version: 1, id: 'geometry-next-entry' } },
        '',
        source,
      );
      beginNavigationIntent('traverse', source);
      const owner = { entryId, contentEpoch };
      if (mismatch === 'entry') owner.entryId = 'geometry-next-entry';
      else if (mismatch === 'epoch') owner.contentEpoch++;
      else if (mismatch === 'root')
        initializeContentContext(await fixture('<main id="other-root">別root</main>'));
      else if (mismatch === 'displayed-url') adoptContentBinding('/different-displayed', entryId);
      else if (mismatch === 'mutation') beginContentMutation(main);
      else markContentRecoveryRequired(main, contentEpoch);
      expect(captureHistoryGeometry(main, position, 'verified-layout', owner)).toBeNull();
    },
  );

  it.each(['entry', 'epoch', 'mutation', 'recovery'])(
    'addressが同じURLでも明示ownerの%s不正をURL一致だけで許可しない',
    async (mismatch) => {
      const { main, position } = await staticPage(paragraphs());
      const entryId = 'geometry-displayed-source';
      history.replaceState({ __rouaultHistoryEntry: { version: 1, id: entryId } }, '', target);
      const contentEpoch = initializeContentContext(main);
      const owner = { entryId, contentEpoch };
      if (mismatch === 'entry') owner.entryId = 'same-url-other-entry';
      else if (mismatch === 'epoch') owner.contentEpoch++;
      else if (mismatch === 'mutation') beginContentMutation(main);
      else markContentRecoveryRequired(main, contentEpoch);
      expect(readAddress()).toBe(position.url);
      expect(captureHistoryGeometry(main, position, 'verified-layout', owner)).toBeNull();
    },
  );

  it.each(['272px', '252.5px'])(
    '宣言された%sの独立TOC trackと実trackが一致すればcaptureと照合を許可する',
    async (track) => {
      const { main, position } = await setup(track);
      const shell = main.querySelector<HTMLElement>('.note-shell');
      if (!shell) throw new Error('shell missing');
      const actual = getComputedStyle(shell).gridTemplateColumns.split(' ')[1];
      expect(parseFloat(actual ?? '')).toBeCloseTo(parseFloat(track), 1);
      const captured = checkpoint(main, position);
      expect(matchesHistoryGeometry(main, captured, 'verified-layout')).toBe(true);
    },
  );

  it('実viewportのclampとroot font変更後のrem解決を許可し以前のcheckpointは適用しない', async () => {
    viewportChanged = true;
    await page.viewport(1645, 720);
    document.documentElement.style.fontSize = '16px';
    const { main, position } = await setup('clamp(15rem, 18vw, 17rem)');
    const shell = main.querySelector<HTMLElement>('.note-shell');
    if (!shell) throw new Error('shell missing');
    const trackWidth = (): number =>
      parseFloat(getComputedStyle(shell).gridTemplateColumns.split(' ')[1] ?? '');
    expect(window.innerWidth).toBe(1645);
    expect(trackWidth()).toBeCloseTo(272, 1);
    const captured = checkpoint(main, position);
    expect(matchesHistoryGeometry(main, captured, 'verified-layout')).toBe(true);
    document.documentElement.style.fontSize = '20px';
    expect(trackWidth()).toBeCloseTo(300, 1);
    expect(matchesHistoryGeometry(main, captured, 'verified-layout')).toBe(false);
    const resizedFont = checkpoint(main, position);
    expect(matchesHistoryGeometry(main, resizedFont, 'verified-layout')).toBe(true);
  });

  it('clampの実trackがviewport変更で変わった場合は古いcheckpointを拒否する', async () => {
    viewportChanged = true;
    await page.viewport(1645, 720);
    document.documentElement.style.fontSize = '16px';
    const { main, position } = await setup('clamp(15rem, 18vw, 17rem)');
    const captured = checkpoint(main, position);
    await page.viewport(1440, 720);
    const shell = main.querySelector<HTMLElement>('.note-shell');
    if (!shell) throw new Error('shell missing');
    expect(parseFloat(getComputedStyle(shell).gridTemplateColumns.split(' ')[1] ?? '')).toBeCloseTo(
      259.2,
      1,
    );
    expect(matchesHistoryGeometry(main, captured, 'verified-layout')).toBe(false);
    expect(captureHistoryGeometry(main, position, 'verified-layout')).not.toBeNull();
  });

  it.each([
    '',
    'auto',
    '1fr',
    'minmax(200px, 240px)',
    '25%',
    'var(--missing-toc-track)',
    'calc(240px)',
    '0px',
    '-240px',
    'clamp(0rem, 18vw, 17rem)',
    'clamp(17rem, 18vw, 15rem)',
    `${'9'.repeat(400)}px`,
  ])('未知または非正のTOC宣言%sは見かけの幅が240pxでも許可しない', async (track) => {
    const { main, position } = await setup();
    const shell = main.querySelector<HTMLElement>('.note-shell');
    if (!shell) throw new Error('shell missing');
    // 見かけの幅だけでは、宣言の解決が証明されたことにならない。
    shell.style.gridTemplateColumns = 'minmax(0,1fr) 240px';
    shell.style.setProperty('--note-toc-track', track);
    expect(captureHistoryGeometry(main, position, 'verified-layout')).toBeNull();
  });

  it('正のtoken宣言と実track幅が不一致ならcaptureを拒否する', async () => {
    const { main, position } = await setup();
    const shell = main.querySelector<HTMLElement>('.note-shell');
    if (!shell) throw new Error('shell missing');
    shell.style.setProperty('--note-toc-track', '272px');
    shell.style.gridTemplateColumns = 'minmax(0,1fr) 240px';
    expect(captureHistoryGeometry(main, position, 'verified-layout')).toBeNull();
  });

  it.each([
    source,
    '/notes/other',
    '/tags/reading?sort=name#section',
    '/discovery?query=静的#results',
    '/about/',
  ])('以前のpairの逆方向を含む%sも保存URLと実addressのexact一致時に採取する', async (url) => {
    const { main, position } = await staticPage(paragraphs());
    history.replaceState(originalState, '', url);
    // 非ASCIIを含むaddressはbrowserがserializeした値を正本にする。
    const exact = { ...position, url: readAddress() };
    const captured = checkpoint(main, exact);
    expect(captured.position.url).toBe(readAddress());
    expect(matchesHistoryGeometry(main, captured, 'verified-layout')).toBe(true);
    expect(
      captureHistoryGeometry(main, { ...exact, url: `${exact.url}-different` }, 'verified-layout'),
    ).toBeNull();
  });

  it.each([0, 1, 3, 20])(
    '%s個の見出しを持つ静的本文も固定12個に限定せず採取する',
    async (count) => {
      const headings = Array.from(
        { length: count },
        (_, index) => `<h2 id="arbitrary-heading-${index}">第${index + 1}章</h2>`,
      ).join('');
      const { main, position } = await staticPage(headings + paragraphs());
      const captured = checkpoint(main, position);
      expect(captured.headingIds).toHaveLength(count);
      expect(matchesHistoryGeometry(main, captured, 'verified-layout')).toBe(true);
    },
  );

  it('見出しもIDもない本文ではparagraphのpathを保持し別DOM世代で同じanchorを解決する', async () => {
    const { main, position } = await staticPage(paragraphs());
    const captured = checkpoint(main, position);
    expect(captured.anchorId).toBe('');
    expect(captured.anchorPath.length).toBeGreaterThan(0);
    expect(captured.headingIds).toEqual([]);
    const anchor = readHistoryGeometryAnchor(main, captured);
    expect(anchor?.localName).toBe('p');
    const restored = main.cloneNode(true);
    if (!(restored instanceof HTMLElement)) throw new Error('restored main missing');
    main.replaceWith(restored);
    const restoredAnchor = readHistoryGeometryAnchor(restored, captured);
    expect(restoredAnchor).not.toBe(anchor);
    expect(restoredAnchor?.textContent).toBe(anchor?.textContent);
    expect(matchesHistoryGeometry(restored, captured, 'verified-layout')).toBe(true);
    expect(readHistoryGeometryAnchor(restored, { ...captured, anchorPath: [999] })).toBeNull();
    expect(readHistoryGeometryAnchor(restored, { ...captured, anchorId: 'missing' })).toBeNull();
  });

  it('複数proseと任意の本文IDを持つTOCなしの静的pageも実text/font/構造で照合する', async () => {
    const { main, position } = await staticPage(
      `<section class="prose" id="first-prose"><h2 id="first-topic">最初の章</h2>${paragraphs()}</section><section class="prose" id="second-prose"><h3 id="second-topic">次の章</h3><p>別の本文領域です。</p></section>`,
    );
    const captured = checkpoint(main, position);
    expect(main.querySelector('[data-layout-toc-root]')).toBeNull();
    expect(captured.headingIds).toEqual(['first-topic', 'second-topic']);
    expect(matchesHistoryGeometry(main, captured, 'verified-layout')).toBe(true);
    main.querySelector('#second-prose p')?.append('変更');
    expect(matchesHistoryGeometry(main, captured, 'verified-layout')).toBe(false);
  });

  it('深い保存位置と先頭位置はどちらも同じ静的pageの実幾何から採取する', async () => {
    const { main, position } = await staticPage(paragraphs());
    const top = checkpoint(main, { ...position, y: 0 });
    const deep = checkpoint(main, { ...position, y: 1900 });
    expect(top.position.y).toBe(0);
    expect(deep.position.y).toBe(1900);
    expect(matchesHistoryGeometry(main, top, 'verified-layout')).toBe(true);
    expect(matchesHistoryGeometry(main, deep, 'verified-layout')).toBe(true);
  });

  it('decode済みで寸法属性と実boxを持つ画像は採取し寸法変更後の照合を拒否する', async () => {
    const { main, position } = await staticPage(paragraphs());
    const image = await loadedImage(main);
    expect(image.complete).toBe(true);
    expect(image.naturalWidth).toBeGreaterThan(0);
    const captured = checkpoint(main, position);
    expect(matchesHistoryGeometry(main, captured, 'verified-layout')).toBe(true);
    image.setAttribute('height', '45');
    expect(matchesHistoryGeometry(main, captured, 'verified-layout')).toBe(false);
  });

  it.each(['pending', 'broken', 'missing-width', 'missing-height', 'unknown-enhancer'])(
    '%sの画像は寸法確定済みの静的画像と同一視しない',
    async (state) => {
      const { main, position } = await staticPage(paragraphs());
      let image = await loadedImage(main);
      if (state === 'pending') vi.spyOn(image, 'complete', 'get').mockReturnValue(false);
      else if (state === 'broken') {
        const broken = document.createElement('img');
        broken.width = 40;
        broken.height = 30;
        const failed = new Promise<void>((resolve) =>
          broken.addEventListener('error', () => resolve(), { once: true }),
        );
        image.replaceWith(broken);
        image = broken;
        image.src = 'data:image/png;base64,broken';
        // 旧decoded imageを表示し続けるUAの移行期間を、破損確定と取り違えない。
        await failed;
        expect(image.complete).toBe(true);
        expect(image.naturalWidth).toBe(0);
      } else if (state === 'missing-width') image.removeAttribute('width');
      else if (state === 'missing-height') image.removeAttribute('height');
      else image.setAttribute('data-hydration-key', 'unknown-image-enhancer');
      expect(captureHistoryGeometry(main, position, 'verified-layout')).toBeNull();
    },
  );

  it('plain本文の実幾何・本文・実使用font・近傍anchorと保存座標を保持する', async () => {
    const { main, position } = await setup();
    const captured = checkpoint(main, position);
    expect(captured.position).toEqual(position);
    expect(captured.position).not.toBe(position);
    expect(captured.anchorId).toMatch(/^heading-/u);
    expect(captured.anchorY).toBeGreaterThan(0);
    expect(captured.fontFingerprint).toContain('serif');
    expect(captured.text).toContain('静的な日本語本文');
    expect(captured.headingIds).toHaveLength(12);
    expect(matchesHistoryGeometry(main, captured, 'verified-layout')).toBe(true);
    // 復元先は別DOM世代でもよい。要素参照の一致を幾何の一致に代用しない。
    const restored = main.cloneNode(true);
    if (!(restored instanceof HTMLElement)) throw new Error('restored root missing');
    main.replaceWith(restored);
    expect(matchesHistoryGeometry(restored, captured, 'verified-layout')).toBe(true);
  });

  it.each(['table', 'img', 'pre', 'details', 'iframe', 'video', 'unknown-widget'])(
    '%sがある本文は安全未証明として拒否する',
    async (tag) => {
      const { main, prose, position } = await setup();
      prose.append(document.createElement(tag));
      expect(captureHistoryGeometry(main, position, 'verified-layout')).toBeNull();
    },
  );

  it.each(['unknown-hydrator', 'root-hydrator', 'copy-target', 'unreserved-toc', 'unknown-scope'])(
    '%sを許可済み汎用surfaceと同一視しない',
    async (change) => {
      const { main, prose, position } = await setup();
      if (change === 'unknown-hydrator') prose.dataset['hydrationKey'] = 'future-enhancer';
      else if (change === 'root-hydrator') main.dataset['hydrationKey'] = 'future-enhancer';
      else if (change === 'copy-target') prose.setAttribute('data-copy-button', '');
      else if (change === 'unreserved-toc')
        main.querySelector('layout-toc-controller')?.removeAttribute('data-toc-trigger-reserved');
      else prose.setAttribute('data-hydration-scope', 'future-scope');
      expect(captureHistoryGeometry(main, position, 'verified-layout')).toBeNull();
    },
  );

  it('rootの種類・非接続・非表示と対象以外のaddressを拒否する', async () => {
    const { main, position } = await setup();
    const wrong = document.createElement('div');
    wrong.id = 'main-content';
    expect(captureHistoryGeometry(wrong, position, 'verified-layout')).toBeNull();
    main.hidden = true;
    expect(captureHistoryGeometry(main, position, 'verified-layout')).toBeNull();
    main.hidden = false;
    main.style.visibility = 'hidden';
    expect(captureHistoryGeometry(main, position, 'verified-layout')).toBeNull();
    main.style.visibility = 'visible';
    const parent = main.parentElement;
    if (!parent) throw new Error('parent missing');
    parent.style.opacity = '0';
    expect(captureHistoryGeometry(main, position, 'verified-layout')).toBeNull();
    parent.style.opacity = '1';
    history.replaceState(originalState, '', `${target}#heading-1`);
    expect(captureHistoryGeometry(main, position, 'verified-layout')).toBeNull();
    history.replaceState(originalState, '', target);
    main.remove();
    expect(captureHistoryGeometry(main, position, 'verified-layout')).toBeNull();
  });

  it('scopeはtrailing slashを許可し保存URLと実addressのexact一致は維持する', async () => {
    const { main, position } = await setup();
    history.replaceState(originalState, '', `${target}/`);
    expect(captureHistoryGeometry(main, position, 'verified-layout')).toBeNull();
    const exact = { ...position, url: `${target}/` };
    const captured = checkpoint(main, exact);
    expect(captured.position.url).toBe(`${target}/`);
    expect(matchesHistoryGeometry(main, captured, 'verified-layout')).toBe(true);
    history.replaceState(originalState, '', target);
    expect(matchesHistoryGeometry(main, captured, 'verified-layout')).toBe(false);
  });

  it('一時的なrange不足へのclampをreadyとして保存しない', async () => {
    const { main, position } = await setup();
    expect(captureHistoryGeometry(main, { ...position, y: 100_000 }, 'verified-layout')).toBeNull();
    expect(captureHistoryGeometry(main, { ...position, x: 100_000 }, 'verified-layout')).toBeNull();
    expect(captureHistoryGeometry(main, { ...position, y: NaN }, 'verified-layout')).toBeNull();
    expect(
      captureHistoryGeometry(main, { ...position, url: source }, 'verified-layout'),
    ).toBeNull();
  });

  it.each(['shell', 'text', 'main-width', 'anchor', 'font', 'range', 'viewport'])(
    '%s変更後は以前のcheckpointを適用しない',
    async (change) => {
      const { main, prose, position } = await setup();
      const captured = checkpoint(main, position);
      let layout = 'verified-layout';
      if (change === 'shell') layout = 'changed-layout';
      else if (change === 'text') prose.querySelector('p')?.append('追記');
      else if (change === 'main-width') main.style.width = '680px';
      else if (change === 'anchor') {
        const anchor = main.querySelector<HTMLElement>(`#${captured.anchorId}`);
        if (!anchor) throw new Error('anchor missing');
        anchor.style.paddingTop = '12px';
      } else if (change === 'font') prose.style.fontFamily = 'monospace';
      else if (change === 'viewport')
        vi.spyOn(window, 'devicePixelRatio', 'get').mockReturnValue(window.devicePixelRatio + 0.5);
      else main.style.paddingBottom = '25px';
      expect(matchesHistoryGeometry(main, captured, layout)).toBe(false);
    },
  );

  it('既知reserved TOCのactivation完了状態は同runtime headerとの整合時だけ許可する', async () => {
    const { main, position } = await setup();
    await import('../../src/components/layout/layout-toc-controller.js');
    const header = await fixture(`<header data-layout-header><a data-toc-trigger="true"
      data-toc-runtime-id="toc-source-testing-toc-readable-long-heading"
      data-toc-hydration-state="hydrated" data-toc-trigger-interactive="true"></a></header>`);
    const controller = main.querySelector('layout-toc-controller');
    const trigger = header.querySelector('a');
    if (!controller || !trigger) throw new Error('TOC fixture missing');
    controller.removeAttribute('data-toc-trigger-reserved');
    const captured = checkpoint(main, position);
    expect(matchesHistoryGeometry(main, captured, 'verified-layout')).toBe(true);
    trigger.setAttribute('data-toc-hydration-state', 'hydrating');
    expect(matchesHistoryGeometry(main, captured, 'verified-layout')).toBe(false);
    trigger.setAttribute('data-toc-hydration-state', 'hydrated');
    controller.setAttribute(
      'capabilities-json',
      '{"activeTracking":true,"dynamicScopes":true,"mobilePanel":true}',
    );
    expect(matchesHistoryGeometry(main, captured, 'verified-layout')).toBe(false);
  });

  it.each(['240px', '272px', '252.5px', 'clamp(15rem, 20vw, 17rem)'])(
    '独立TOCの%sでは全12項目の400/500切替を許可し実使用fontのloadは確認する',
    async (track) => {
      const { main, position } = await setup(track);
      const captured = checkpoint(main, position);
      const links = main.querySelectorAll<HTMLElement>('[data-layout-toc-root] a');
      expect(links).toHaveLength(12);
      for (const link of links) {
        link.style.fontWeight = '500';
        expect(matchesHistoryGeometry(main, captured, 'verified-layout')).toBe(true);
        link.style.fontWeight = '400';
      }
      const check = vi
        .spyOn(document.fonts, 'check')
        .mockImplementation((font, text) => !(font.includes(' 500 ') && text?.includes('目次')));
      expect(matchesHistoryGeometry(main, captured, 'verified-layout')).toBe(false);
      expect(
        check.mock.calls.some(([font, text]) => font.includes(' 500 ') && text?.includes('目次')),
      ).toBe(true);
    },
  );

  it.each(['track', 'position', 'height', 'overflow'])(
    'TOCの%s制約が崩れた場合はfont差分を安全扱いしない',
    async (constraint) => {
      const { main, position } = await setup();
      const captured = checkpoint(main, position);
      const toc = main.querySelector<HTMLElement>('[data-layout-toc-root]');
      const shell = main.querySelector<HTMLElement>('.note-shell');
      if (!toc || !shell) throw new Error('toc shell missing');
      if (constraint === 'track') shell.style.gridTemplateColumns = 'minmax(0,1fr) 250px';
      else if (constraint === 'position') toc.style.position = 'static';
      else if (constraint === 'height') toc.style.height = 'auto';
      else toc.style.overflow = 'visible';
      expect(matchesHistoryGeometry(main, captured, 'verified-layout')).toBe(false);
    },
  );

  it('font未確定・check失敗・API例外はいずれも演出不可に縮退する', async () => {
    const { main, position } = await setup();
    const captured = checkpoint(main, position);
    const status = vi.spyOn(document.fonts, 'status', 'get').mockReturnValue('loading');
    expect(captureHistoryGeometry(main, position, 'verified-layout')).toBeNull();
    expect(matchesHistoryGeometry(main, captured, 'verified-layout')).toBe(false);
    status.mockRestore();
    const check = vi.spyOn(document.fonts, 'check').mockReturnValue(false);
    expect(captureHistoryGeometry(main, position, 'verified-layout')).toBeNull();
    check.mockImplementation(() => {
      throw new Error('font check unavailable');
    });
    expect(captureHistoryGeometry(main, position, 'verified-layout')).toBeNull();
  });

  it('測定だけでscrollやfocusを書き込まない', async () => {
    const { main, position } = await setup();
    const scroll = vi.spyOn(window, 'scrollTo');
    const focus = vi.spyOn(main, 'focus');
    const captured = checkpoint(main, position);
    expect(matchesHistoryGeometry(main, captured, 'verified-layout')).toBe(true);
    expect(scroll).not.toHaveBeenCalled();
    expect(focus).not.toHaveBeenCalled();
  });
});

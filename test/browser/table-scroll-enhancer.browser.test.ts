import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  enhanceTableScroll,
  prepareTableGeometry,
  readPreparedTableGeometry,
} from '../../src/client/post-hydrate/table-scroll-enhancer.js';
import { waitForCondition } from './harness/browser-test-utilities.js';

const nextFrame = async (): Promise<void> => {
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve());
  });
};

const createTableFixture = ({
  rootWidth = 120,
  tableWidth = 360,
  caption,
  rootId,
  rowCount = 1,
}: {
  readonly rootWidth?: number;
  readonly tableWidth?: number;
  readonly caption?: string;
  readonly rootId?: string;
  readonly rowCount?: number;
} = {}): HTMLElement => {
  const root = document.createElement('div');
  root.dataset['tableRoot'] = 'true';
  if (rootId) {
    root.id = rootId;
  }
  root.tabIndex = 0;
  root.style.inlineSize = `${rootWidth}px`;
  root.style.overflowX = 'auto';
  const rows = Array.from({ length: rowCount }, (_, index) => {
    const label = (index + 1).toString();
    return `
        <tr>
          <td>Alpha ${label}</td>
          <td>Beta ${label}</td>
          <td>Gamma ${label}</td>
        </tr>`;
  }).join('');
  root.innerHTML = `
    <table style="inline-size: ${tableWidth}px; min-inline-size: ${tableWidth}px;">
      ${caption === undefined ? '' : `<caption>${caption}</caption>`}
      <tbody>
${rows}
      </tbody>
    </table>
  `;
  document.body.append(root);
  return root;
};

const createEligibleTableFixture = (
  options: Parameters<typeof createTableFixture>[0] = {},
): HTMLElement => {
  return createTableFixture({ rowCount: 16, ...options });
};

const getOwnedTableInFixture = (root: HTMLElement): HTMLTableElement | null => {
  return root.querySelector<HTMLTableElement>(':scope > table');
};

const getRail = (root: HTMLElement): HTMLElement | null => {
  const rail = root.previousElementSibling;

  return rail instanceof HTMLElement && rail.matches('[data-table-scroll-rail]') ? rail : null;
};

const createStaleRail = (): HTMLElement => {
  const rail = document.createElement('div');
  rail.dataset['tableScrollRail'] = 'true';
  return rail;
};

const makeRailScrollableInFixture = (root: HTMLElement): HTMLElement | null => {
  const rail = getRail(root);
  if (rail) {
    rail.style.display = 'block';
    rail.style.inlineSize = `${root.clientWidth}px`;
    rail.style.width = `${root.clientWidth}px`;
    rail.style.overflowX = 'auto';
    const spacer = rail.querySelector<HTMLElement>('[data-table-scroll-rail-spacer]');
    if (spacer) {
      spacer.style.display = 'block';
      spacer.style.inlineSize = `${Math.max(root.scrollWidth, root.clientWidth)}px`;
      spacer.style.width = `${Math.max(root.scrollWidth, root.clientWidth)}px`;
      spacer.style.blockSize = '1px';
    }
  }

  return rail;
};

describe('table-scroll-enhancer native asynchronous scroll synchronization', () => {
  const controllers: AbortController[] = [];

  afterEach(() => {
    for (const controller of controllers) controller.abort();
    controllers.length = 0;
    document.body.replaceChildren();
  });

  const createPair = async () => {
    const controller = new AbortController();
    controllers.push(controller);
    const root = createEligibleTableFixture();
    enhanceTableScroll(root, controller.signal);
    await nextFrame();
    const rail = makeRailScrollableInFixture(root);
    if (!rail) throw new Error('Eligible overflow table requires a rail');
    await nextFrame();
    await nextFrame();
    return { root, rail, signal: controller.signal };
  };

  for (const direction of ['rail', 'root'] as const) {
    it(`${direction} の次の操作値を遅れて届く同期先の native scroll echo で巻き戻さないこと`, async () => {
      const { root, rail, signal } = await createPair();
      const source = direction === 'rail' ? rail : root;
      const target = direction === 'rail' ? root : rail;
      let advanced = false;
      const sourcePositionsAfterEcho: number[] = [];

      target.addEventListener(
        'scroll',
        () => {
          if (advanced) return;
          advanced = true;
          // drag の次の位置が同期先の通知より先に到着する順序を固定する。
          source.scrollLeft = 160;
        },
        { capture: true, signal },
      );
      target.addEventListener(
        'scroll',
        () => {
          sourcePositionsAfterEcho.push(source.scrollLeft);
        },
        { signal },
      );

      source.scrollLeft = 80;
      await waitForCondition(() => advanced, 'Native target scroll event was not delivered');
      await nextFrame();
      await nextFrame();

      expect(sourcePositionsAfterEcho.length).to.be.greaterThan(0);
      expect(sourcePositionsAfterEcho.every((position) => Math.abs(position - 160) <= 1)).to.equal(
        true,
      );
      expect(root.scrollLeft).to.be.closeTo(160, 1);
      expect(rail.scrollLeft).to.be.closeTo(160, 1);
    });

    it(`${direction} からの同期先で新しい操作が起きた場合は echo として捨てず逆方向へ同期すること`, async () => {
      const { root, rail, signal } = await createPair();
      const source = direction === 'rail' ? rail : root;
      const target = direction === 'rail' ? root : rail;
      let advanced = false;

      target.addEventListener(
        'scroll',
        () => {
          if (advanced) return;
          advanced = true;
          target.scrollLeft = 160;
        },
        { capture: true, signal },
      );

      source.scrollLeft = 80;
      await waitForCondition(() => advanced, 'Native target scroll event was not delivered');
      await nextFrame();
      await nextFrame();

      expect(root.scrollLeft).to.be.closeTo(160, 1);
      expect(rail.scrollLeft).to.be.closeTo(160, 1);
    });
  }

  it('同期先の clamp 後の実到達値を echo として扱い操作元へ書き戻さないこと', async () => {
    const { root, rail } = await createPair();
    rail.style.inlineSize = '200px';
    rail.style.width = '200px';
    await nextFrame();
    await nextFrame();

    root.scrollLeft = 240;
    await waitForCondition(
      () => rail.scrollLeft > 0,
      'Native source scroll event was not delivered',
    );
    await nextFrame();
    await nextFrame();

    expect(rail.scrollLeft).to.be.lessThan(240);
    expect(root.scrollLeft).to.be.closeTo(240, 1);
  });

  it('複数の native scroll 入力が合流しても最新の subpixel 到達値を両方向へ同期すること', async () => {
    const { root, rail } = await createPair();
    for (const source of [rail, root]) {
      source.scrollLeft = 40.25;
      source.scrollLeft = 80.5;
      source.scrollLeft = 160.75;
      const reached = source.scrollLeft;
      await waitForCondition(
        () => Math.abs(root.scrollLeft - rail.scrollLeft) <= 1,
        'Native scroll input did not converge',
      );
      await nextFrame();
      await nextFrame();
      expect(root.scrollLeft).to.be.closeTo(reached, 1);
      expect(rail.scrollLeft).to.be.closeTo(reached, 1);
    }
  });
});

describe('table-scroll-enhancer overflow/fade state', () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it('右端未到達時は right fade、中間では left/right、右端では right を解除し左端復帰で left を解除すること', async () => {
    const root = createTableFixture();

    enhanceTableScroll(root);
    await nextFrame();

    expect(root.dataset['overflow']).to.equal('true');
    expect(root.dataset['fadeRight']).to.equal('true');
    expect(root.dataset['fadeLeft']).to.equal(undefined);

    root.scrollLeft = 80;
    root.dispatchEvent(new Event('scroll'));
    expect(root.dataset['fadeLeft']).to.equal('true');
    expect(root.dataset['fadeRight']).to.equal('true');

    root.scrollLeft = root.scrollWidth - root.clientWidth;
    root.dispatchEvent(new Event('scroll'));
    expect(root.dataset['fadeLeft']).to.equal('true');
    expect(root.dataset['fadeRight']).to.equal(undefined);

    root.scrollLeft = 0;
    root.dispatchEvent(new Event('scroll'));
    expect(root.dataset['fadeLeft']).to.equal(undefined);
    expect(root.dataset['fadeRight']).to.equal('true');
  });
});

describe('table-scroll-enhancer non-overflow / overflow解消', () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it('非overflow表には state を付与しないこと', async () => {
    const root = createTableFixture({ rootWidth: 360, tableWidth: 120 });

    enhanceTableScroll(root);
    await nextFrame();

    expect(root.dataset['overflow']).to.equal(undefined);
    expect(root.dataset['fadeLeft']).to.equal(undefined);
    expect(root.dataset['fadeRight']).to.equal(undefined);
  });

  it('overflow解消時に state をすべて削除すること', async () => {
    const root = createTableFixture();
    const table = getOwnedTableInFixture(root);

    enhanceTableScroll(root);
    await nextFrame();
    expect(root.dataset['overflow']).to.equal('true');

    root.style.inlineSize = '420px';
    if (table) {
      table.style.inlineSize = '120px';
      table.style.minInlineSize = '120px';
    }
    root.dispatchEvent(new Event('scroll'));

    expect(root.dataset['overflow']).to.equal(undefined);
    expect(root.dataset['fadeLeft']).to.equal(undefined);
    expect(root.dataset['fadeRight']).to.equal(undefined);
  });
});

describe('table-scroll-enhancer lifecycle', () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it('複数回 enhance しても同一要素の state が破綻しないこと', async () => {
    const root = createTableFixture();

    enhanceTableScroll(root);
    enhanceTableScroll(root);
    await nextFrame();

    expect(root.dataset['overflow']).to.equal('true');
    expect(root.dataset['fadeRight']).to.equal('true');
  });

  it('AbortSignal解除後に同じ表を再有効化できること', async () => {
    const root = createTableFixture();
    const first = new AbortController();
    const second = new AbortController();

    enhanceTableScroll(root, first.signal);
    await nextFrame();
    expect(root.dataset['overflow']).to.equal('true');

    first.abort();
    root.removeAttribute('data-overflow');
    root.removeAttribute('data-fade-right');

    root.scrollLeft = 0;
    root.dispatchEvent(new Event('scroll'));
    expect(root.dataset['overflow']).to.equal(undefined);

    enhanceTableScroll(root, second.signal);
    await nextFrame();

    expect(root.dataset['overflow']).to.equal('true');
    expect(root.dataset['fadeRight']).to.equal('true');
  });

  it('abort済み signal では登録せず state も付与しないこと', async () => {
    const root = createTableFixture();
    const controller = new AbortController();
    controller.abort();

    enhanceTableScroll(root, controller.signal);
    await nextFrame();

    expect(root.dataset['overflow']).to.equal(undefined);
    expect(root.dataset['fadeLeft']).to.equal(undefined);
    expect(root.dataset['fadeRight']).to.equal(undefined);
  });
});

describe('table-scroll-enhancer targeting / DOM contract', () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it('root自身が data-table-root の場合も対象にできること', async () => {
    const root = createTableFixture();

    enhanceTableScroll(root);
    await nextFrame();

    expect(root.dataset['overflow']).to.equal('true');
  });

  it('rail を table root 内や semantic table subtree へ追加しないこと', async () => {
    const root = createEligibleTableFixture();
    const before = root.querySelectorAll('*').length;

    enhanceTableScroll(root);
    await nextFrame();

    expect(root.querySelectorAll('*').length).to.equal(before);
    expect(getRail(root)?.parentElement).to.equal(document.body);
    expect(root.contains(getRail(root))).to.equal(false);
  });
});

describe('table-scroll-enhancer Phase3B accessible top scroll rail', () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it('eligible overflow 表で rail を生成し、non-overflow 表では生成しないこと', async () => {
    const overflowRoot = createEligibleTableFixture();
    const nonOverflowRoot = createTableFixture({ rootWidth: 360, tableWidth: 120 });

    enhanceTableScroll(overflowRoot);
    enhanceTableScroll(nonOverflowRoot);
    await nextFrame();

    expect(getRail(overflowRoot)).to.not.equal(null);
    expect(getRail(nonOverflowRoot)).to.equal(null);
  });

  it('eligibility なし overflow 表では rail を生成せず overflow / fade state を維持し runtime id も生成しないこと', async () => {
    const root = createTableFixture();

    enhanceTableScroll(root);
    await nextFrame();

    expect(getRail(root)).to.equal(null);
    expect(root.id).to.equal('');
    expect(root.dataset['overflow']).to.equal('true');
    expect(root.dataset['fadeRight']).to.equal('true');
    expect(root.dataset['fadeLeft']).to.equal(undefined);
  });

  it('rowCount 境界では 15 行は rail なし、16 行は rail ありにすること', async () => {
    const shortRoot = createTableFixture({ rowCount: 15 });
    const eligibleRoot = createTableFixture({ rowCount: 16 });

    expect(shortRoot.clientHeight).to.be.lessThan(640);

    enhanceTableScroll(document.body);
    await nextFrame();

    expect(getRail(shortRoot)).to.equal(null);
    expect(getRail(eligibleRoot)).to.not.equal(null);
  });

  it('clientHeight 境界では短表でも 640px 以上なら rail を生成すること', async () => {
    const root = createTableFixture();
    root.style.blockSize = '640px';

    expect(root.clientHeight).to.be.at.least(640);

    enhanceTableScroll(root);
    await nextFrame();

    expect(getRail(root)).to.not.equal(null);
  });

  it('owned table がない data-table-root は高さ条件だけでは eligible にしないこと', async () => {
    const root = document.createElement('div');
    root.dataset['tableRoot'] = 'true';
    root.tabIndex = 0;
    root.style.inlineSize = '120px';
    root.style.blockSize = '640px';
    root.style.overflowX = 'auto';
    const inner = document.createElement('div');
    inner.style.inlineSize = '360px';
    inner.style.blockSize = '1px';
    root.append(inner);
    document.body.append(root);

    expect(root.clientHeight).to.be.at.least(640);

    enhanceTableScroll(root);
    await nextFrame();

    expect(root.dataset['overflow']).to.equal('true');
    expect(getRail(root)).to.equal(null);
  });

  it('owned table がない data-table-root は descendant table の行数だけでは eligible にしないこと', async () => {
    const root = document.createElement('div');
    root.dataset['tableRoot'] = 'true';
    root.tabIndex = 0;
    root.style.inlineSize = '120px';
    root.style.overflowX = 'auto';
    const inner = document.createElement('div');
    inner.style.inlineSize = '360px';
    inner.innerHTML = `
      <table style="inline-size: 360px; min-inline-size: 360px;">
        <tbody>
          ${Array.from({ length: 16 }, () => '<tr><td>Descendant</td></tr>').join('')}
        </tbody>
      </table>
    `;
    root.append(inner);
    document.body.append(root);

    enhanceTableScroll(root);
    await nextFrame();

    expect(root.dataset['overflow']).to.equal('true');
    expect(root.id).to.equal('');
    expect(getRail(root)).to.equal(null);
  });

  it('nested table の行数や caption を owned table として扱わないこと', async () => {
    const root = createTableFixture();
    const table = getOwnedTableInFixture(root);
    const firstCell = table?.rows.item(0)?.cells.item(0);
    if (firstCell) {
      firstCell.innerHTML = `
        <table>
          <caption>入れ子表</caption>
          <tbody>
            ${Array.from({ length: 16 }, () => '<tr><td>Nested</td></tr>').join('')}
          </tbody>
        </table>
      `;
    }

    enhanceTableScroll(root);
    await nextFrame();

    expect(getRail(root)).to.equal(null);
    expect(root.id).to.equal('');
  });

  it('short overflow / non-overflow / AbortSignal 解除でも所有不明の隣接 rail を削除しないこと', async () => {
    const shortRoot = createTableFixture();
    const shortStaleA = createStaleRail();
    const shortStaleB = createStaleRail();
    shortRoot.before(shortStaleA, shortStaleB);

    enhanceTableScroll(shortRoot);
    await nextFrame();

    expect(shortStaleA.isConnected).to.equal(true);
    expect(shortStaleB.isConnected).to.equal(true);
    expect(readPreparedTableGeometry(shortRoot)).to.equal(null);

    const nonOverflowRoot = createTableFixture({ rootWidth: 360, tableWidth: 120 });
    const nonOverflowStale = createStaleRail();
    nonOverflowRoot.before(nonOverflowStale);

    enhanceTableScroll(nonOverflowRoot);
    await nextFrame();

    expect(nonOverflowStale.isConnected).to.equal(true);
    expect(readPreparedTableGeometry(nonOverflowRoot)).to.equal(null);

    const eligibleRoot = createEligibleTableFixture();
    const controller = new AbortController();
    enhanceTableScroll(eligibleRoot, controller.signal);
    await nextFrame();
    const activeRail = getRail(eligibleRoot);
    const abortStale = createStaleRail();
    eligibleRoot.before(abortStale);

    controller.abort();
    await nextFrame();

    expect(activeRail?.isConnected).to.equal(false);
    expect(abortStale.isConnected).to.equal(true);
    expect(readPreparedTableGeometry(eligibleRoot)).to.equal(null);
  });

  it('eligible overflow 更新時も未知 rail を保持し、自分の rail だけを root 直前へ置くこと', async () => {
    const root = createEligibleTableFixture();
    const staleA = createStaleRail();
    const staleB = createStaleRail();
    root.before(staleA, staleB);

    enhanceTableScroll(root);
    await nextFrame();

    const rail = getRail(root);
    expect(rail).to.not.equal(null);
    expect(staleA.isConnected).to.equal(true);
    expect(staleB.isConnected).to.equal(true);
    expect(rail).to.not.equal(staleA);
    expect(rail).to.not.equal(staleB);
    expect(document.body.querySelectorAll('[data-table-scroll-rail]').length).to.equal(3);
    expect(readPreparedTableGeometry(root)).to.equal(null);
  });

  it('state.rail が接続済みで root 直前から外れている場合は eligible 更新で戻すこと', async () => {
    const root = createEligibleTableFixture();

    enhanceTableScroll(root);
    await nextFrame();
    const rail = getRail(root);
    expect(rail).to.not.equal(null);

    if (rail) {
      document.body.append(rail);
    }
    expect(getRail(root)).to.equal(null);

    root.dispatchEvent(new Event('scroll'));
    await nextFrame();

    expect(getRail(root)).to.equal(rail);
  });

  it('state.rail が未接続の場合は root 直前の未知 rail を採用せず新規 rail に listener を束縛すること', async () => {
    const root = createEligibleTableFixture();

    enhanceTableScroll(root);
    await nextFrame();
    const originalRail = getRail(root);
    originalRail?.remove();

    const unknownRail = createStaleRail();
    root.before(unknownRail);

    root.dispatchEvent(new Event('scroll'));
    await nextFrame();
    const newRail = makeRailScrollableInFixture(root);

    expect(newRail).to.not.equal(null);
    expect(newRail).to.not.equal(originalRail);
    expect(newRail).to.not.equal(unknownRail);
    expect(unknownRail.isConnected).to.equal(true);

    if (newRail) {
      newRail.scrollLeft = 150;
      newRail.dispatchEvent(new Event('scroll'));
    }
    expect(root.scrollLeft).to.equal(150);
  });

  it('state.rail が未接続の場合は eligible 更新で新規 rail を作り直し scroll 同期を復旧すること', async () => {
    const root = createEligibleTableFixture();

    enhanceTableScroll(root);
    await nextFrame();
    const originalRail = getRail(root);
    originalRail?.remove();

    root.dispatchEvent(new Event('scroll'));
    await nextFrame();
    const newRail = makeRailScrollableInFixture(root);

    expect(newRail).to.not.equal(null);
    expect(newRail).to.not.equal(originalRail);

    if (newRail) {
      newRail.scrollLeft = 130;
      newRail.dispatchEvent(new Event('scroll'));
    }
    expect(root.scrollLeft).to.equal(130);
  });

  it('active rail が同一でも spacer が不正なら active rail 直下で再取得または再作成すること', async () => {
    const root = createEligibleTableFixture();

    enhanceTableScroll(root);
    await nextFrame();
    const rail = getRail(root);
    expect(rail).to.not.equal(null);

    const firstSpacer = rail?.querySelector<HTMLElement>(
      ':scope > [data-table-scroll-rail-spacer]',
    );
    firstSpacer?.remove();
    root.dispatchEvent(new Event('scroll'));
    await nextFrame();
    const recreatedSpacer = rail?.querySelector<HTMLElement>(
      ':scope > [data-table-scroll-rail-spacer]',
    );

    expect(recreatedSpacer).to.not.equal(null);
    expect(recreatedSpacer).to.not.equal(firstSpacer);

    const otherRail = createStaleRail();
    document.body.append(otherRail);
    if (recreatedSpacer) {
      otherRail.append(recreatedSpacer);
    }
    root.dispatchEvent(new Event('scroll'));
    await nextFrame();
    const reparentedReplacement = rail?.querySelector<HTMLElement>(
      ':scope > [data-table-scroll-rail-spacer]',
    );

    expect(reparentedReplacement).to.not.equal(null);
    expect(reparentedReplacement).to.not.equal(recreatedSpacer);

    rail?.replaceChildren();
    root.dispatchEvent(new Event('scroll'));
    await nextFrame();

    expect(rail?.querySelector(':scope > [data-table-scroll-rail-spacer]')).to.not.equal(null);
  });

  it('eligible overflow から short overflow へ変化した場合は rail だけ削除し id と overflow state を維持すること', async () => {
    const root = createEligibleTableFixture();
    const table = getOwnedTableInFixture(root);

    enhanceTableScroll(root);
    await nextFrame();
    const generatedId = root.id;
    expect(getRail(root)).to.not.equal(null);

    while (table && table.rows.length > 1) {
      table.deleteRow(1);
    }
    root.dispatchEvent(new Event('scroll'));
    await nextFrame();

    expect(getRail(root)).to.equal(null);
    expect(root.id).to.equal(generatedId);
    expect(root.dataset['overflow']).to.equal('true');
    expect(root.dataset['fadeRight']).to.equal('true');
  });

  it('caption label 解決では直下 table の caption だけを使い nested caption を拾わないこと', async () => {
    const root = createEligibleTableFixture();
    const table = getOwnedTableInFixture(root);
    const firstCell = table?.rows.item(0)?.cells.item(0);
    if (firstCell) {
      firstCell.innerHTML =
        '<table><caption>入れ子 caption</caption><tbody><tr><td>N</td></tr></tbody></table>';
    }

    enhanceTableScroll(root);
    await nextFrame();

    expect(getRail(root)?.getAttribute('aria-label')).to.equal('直後の表の横スクロール補助');
  });

  it('初期 non-overflow から overflow 化した場合に rail を生成すること', async () => {
    const root = createEligibleTableFixture({ rootWidth: 360, tableWidth: 120 });
    const table = getOwnedTableInFixture(root);

    enhanceTableScroll(root);
    await nextFrame();
    expect(getRail(root)).to.equal(null);

    root.style.inlineSize = '120px';
    if (table) {
      table.style.inlineSize = '360px';
      table.style.minInlineSize = '360px';
    }
    root.dispatchEvent(new Event('scroll'));
    await nextFrame();

    expect(getRail(root)).to.not.equal(null);
  });

  it('初期 overflow から overflow 解消時に rail を削除し、再 overflow 化で同じ id を参照すること', async () => {
    const root = createEligibleTableFixture();
    const table = getOwnedTableInFixture(root);

    enhanceTableScroll(root);
    await nextFrame();
    const generatedId = root.id;
    expect(getRail(root)?.getAttribute('aria-controls')).to.equal(generatedId);

    root.style.inlineSize = '420px';
    if (table) {
      table.style.inlineSize = '120px';
      table.style.minInlineSize = '120px';
    }
    root.dispatchEvent(new Event('scroll'));
    await nextFrame();

    expect(getRail(root)).to.equal(null);
    expect(root.id).to.equal(generatedId);

    root.style.inlineSize = '120px';
    if (table) {
      table.style.inlineSize = '360px';
      table.style.minInlineSize = '360px';
    }
    root.dispatchEvent(new Event('scroll'));
    await nextFrame();

    expect(getRail(root)?.getAttribute('aria-controls')).to.equal(generatedId);
  });

  it('root scroll と rail scroll を別々の値で双方向同期すること', async () => {
    const root = createEligibleTableFixture();

    enhanceTableScroll(root);
    await nextFrame();
    const rail = makeRailScrollableInFixture(root);
    expect(rail).to.not.equal(null);

    root.scrollLeft = 80;
    root.dispatchEvent(new Event('scroll'));
    // Firefoxのsubpixel scroll量子化だけを吸収し、同期値の契約は1px以内に限定する。
    expect(rail?.scrollLeft).to.be.closeTo(80, 1);

    if (rail) {
      rail.scrollLeft = 160;
      rail.dispatchEvent(new Event('scroll'));
    }
    expect(root.scrollLeft).to.be.closeTo(160, 1);
  });

  it('scroll 同期が scroll event の明確な無限ループを起こさないこと', async () => {
    const root = createEligibleTableFixture();
    let rootScrollCount = 0;
    let railScrollCount = 0;

    enhanceTableScroll(root);
    await nextFrame();
    const rail = makeRailScrollableInFixture(root);
    expect(rail).to.not.equal(null);

    root.addEventListener('scroll', () => {
      rootScrollCount += 1;
    });
    rail?.addEventListener('scroll', () => {
      railScrollCount += 1;
    });

    if (rail) {
      rail.scrollLeft = 120;
      rail.dispatchEvent(new Event('scroll'));
    }
    await nextFrame();

    expect(root.scrollLeft).to.equal(120);
    expect(rootScrollCount).to.be.lessThan(4);
    expect(railScrollCount).to.be.lessThan(4);
  });

  it('複数回 enhance しても rail を重複生成しないこと', async () => {
    const root = createEligibleTableFixture();

    enhanceTableScroll(root);
    enhanceTableScroll(root);
    enhanceTableScroll(document.body);
    await nextFrame();

    expect(document.body.querySelectorAll('[data-table-scroll-rail]').length).to.equal(1);
  });

  it('AbortSignal 解除で rail を削除し、abort 済み signal では生成しないこと', async () => {
    const root = createEligibleTableFixture();
    const first = new AbortController();

    enhanceTableScroll(root, first.signal);
    await nextFrame();
    expect(getRail(root)).to.not.equal(null);

    first.abort();
    await nextFrame();
    expect(getRail(root)).to.equal(null);

    const aborted = new AbortController();
    aborted.abort();
    enhanceTableScroll(root, aborted.signal);
    await nextFrame();
    expect(getRail(root)).to.equal(null);
  });

  it('AbortSignal 解除後に別 signal で再 enhance でき、scroll 同期も復旧すること', async () => {
    const root = createEligibleTableFixture();
    const first = new AbortController();
    const second = new AbortController();

    enhanceTableScroll(root, first.signal);
    await nextFrame();
    const generatedId = root.id;
    first.abort();
    await nextFrame();

    enhanceTableScroll(root, second.signal);
    await nextFrame();
    const rail = makeRailScrollableInFixture(root);

    expect(rail).to.not.equal(null);
    expect(root.id).to.equal(generatedId);
    expect(rail?.getAttribute('aria-controls')).to.equal(generatedId);

    if (rail) {
      rail.scrollLeft = 140;
      rail.dispatchEvent(new Event('scroll'));
    }
    expect(root.scrollLeft).to.be.closeTo(140, 1);

    root.scrollLeft = 40;
    root.dispatchEvent(new Event('scroll'));
    // Firefoxのsubpixel scroll量子化だけを吸収し、同期値の契約は1px以内に限定する。
    expect(rail?.scrollLeft).to.be.closeTo(40, 1);
  });

  it('accessible region 属性、caption 由来 name、aria-controls、tabindex を持つこと', async () => {
    const root = createEligibleTableFixture({
      caption: '  岩波\n  文庫\t一覧  ',
      rootId: 'existing-table-root',
    });

    enhanceTableScroll(root);
    await nextFrame();
    const rail = makeRailScrollableInFixture(root);

    expect(root.id).to.equal('existing-table-root');
    expect(rail?.hasAttribute('aria-hidden')).to.equal(false);
    expect(rail?.getAttribute('role')).to.equal('region');
    expect(rail?.getAttribute('aria-label')).to.equal('岩波 文庫 一覧の横スクロール補助');
    expect(rail?.getAttribute('aria-controls')).to.equal('existing-table-root');
    expect(rail?.getAttribute('tabindex')).to.equal('0');
  });

  it('caption なし表では fallback accessible name を使うこと', async () => {
    const root = createEligibleTableFixture();

    enhanceTableScroll(root);
    await nextFrame();

    expect(getRail(root)?.getAttribute('aria-label')).to.equal('直後の表の横スクロール補助');
  });

  it('caption 正規化後に空文字の場合は fallback accessible name を使うこと', async () => {
    const root = createEligibleTableFixture({ caption: ' \n\t ' });

    enhanceTableScroll(root);
    await nextFrame();

    expect(getRail(root)?.getAttribute('aria-label')).to.equal('直後の表の横スクロール補助');
  });

  it('root に id がない場合は重複しない runtime id を付与すること', async () => {
    const firstRoot = createEligibleTableFixture();
    const secondRoot = createEligibleTableFixture();

    enhanceTableScroll(document.body);
    await nextFrame();

    expect(firstRoot.id).to.match(/^rouault-table-root-\d+$/u);
    expect(secondRoot.id).to.match(/^rouault-table-root-\d+$/u);
    expect(firstRoot.id).to.not.equal(secondRoot.id);
    expect(getRail(firstRoot)?.getAttribute('aria-controls')).to.equal(firstRoot.id);
    expect(getRail(secondRoot)?.getAttribute('aria-controls')).to.equal(secondRoot.id);
  });

  it('rail focus 中の scroll event でも root へ同期されること', async () => {
    const root = createEligibleTableFixture();

    enhanceTableScroll(root);
    await nextFrame();
    const rail = getRail(root);
    expect(rail).to.not.equal(null);

    rail?.focus();
    expect(document.activeElement).to.equal(rail);
    makeRailScrollableInFixture(root);

    if (rail) {
      rail.scrollLeft = 120;
      rail.dispatchEvent(new Event('scroll'));
    }
    expect(root.scrollLeft).to.equal(120);
  });

  it('fine pointer 相当では sentinel 直後の focusable rail として DOM 順序に入ること', async () => {
    const sentinel = document.createElement('button');
    sentinel.textContent = 'before';
    document.body.append(sentinel);
    const root = createEligibleTableFixture();
    const after = document.createElement('button');
    after.textContent = 'after';
    document.body.append(after);

    enhanceTableScroll(root);
    await nextFrame();
    const rail = getRail(root);

    sentinel.focus();
    expect(document.activeElement).to.equal(sentinel);
    expect(sentinel.nextElementSibling).to.equal(rail);
    expect(rail?.nextElementSibling).to.equal(root);
    expect(root.nextElementSibling).to.equal(after);

    rail?.focus();
    expect(document.activeElement).to.equal(rail);
  });

  it('Phase1 の overflow / fade state 更新を維持すること', async () => {
    const root = createTableFixture();

    enhanceTableScroll(root);
    await nextFrame();

    expect(root.dataset['overflow']).to.equal('true');
    expect(root.dataset['fadeRight']).to.equal('true');
    expect(root.dataset['fadeLeft']).to.equal(undefined);

    root.scrollLeft = 80;
    root.dispatchEvent(new Event('scroll'));

    expect(root.dataset['fadeLeft']).to.equal('true');
    expect(root.dataset['fadeRight']).to.equal('true');
  });
});

describe('table-scroll-enhancer synchronous geometry preparation and ownership', () => {
  const controllers: AbortController[] = [];

  afterEach(() => {
    for (const controller of controllers) controller.abort();
    controllers.length = 0;
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    document.body.replaceChildren();
  });

  const controller = (): AbortController => {
    const value = new AbortController();
    controllers.push(value);
    return value;
  };

  const options = (signal?: AbortSignal) => ({
    isCurrent: () => true,
    beforeGeometryChange: vi.fn(),
    ...(signal ? { signal } : {}),
  });

  const controlResizeObservers = (): (() => void)[] => {
    const queued: (() => void)[] = [];
    class ControlledResizeObserver implements ResizeObserver {
      constructor(callback: ResizeObserverCallback) {
        queued.push(() => callback([], this));
      }
      observe(): void {
        /* 配信済み callback を明示的に再生して旧世代を検証する。 */
      }
      unobserve(): void {
        /* native observer の購読状態は今回の検証対象外。 */
      }
      disconnect(): void {
        /* 切断後も queued callback を再生できるよう保持する。 */
      }
    }
    vi.stubGlobal('ResizeObserver', ControlledResizeObserver);
    return queued;
  };

  it('同期 prepare は非操作 rail を作り、activation と初回 RO は同じ geometry を採用すること', () => {
    const queued = controlResizeObservers();
    const root = createEligibleTableFixture();
    const style = document.createElement('style');
    style.textContent =
      '[data-table-scroll-rail]{overflow-x:auto;block-size:14px;inline-size:120px;margin-block:4px -4px}[data-table-scroll-rail-spacer]{block-size:1px}';
    document.body.prepend(style);
    const owner = options(controller().signal);
    const focus = document.createElement('button');
    document.body.prepend(focus);
    focus.focus();
    const scroll = vi.spyOn(window, 'scrollTo');
    const historyPush = vi.spyOn(history, 'pushState');
    const historyReplace = vi.spyOn(history, 'replaceState');

    expect(prepareTableGeometry(root, owner)).toBe(true);
    const prepared = readPreparedTableGeometry(root);
    if (!prepared?.rail || !prepared.spacer) throw new Error('Missing prepared rail');
    expect(prepared.phase).toBe('prepared');
    expect(prepared.rail.inert).toBe(true);
    expect(prepared.rail.getAttribute('aria-hidden')).toBe('true');
    expect(prepared.rail.tabIndex).toBe(-1);
    prepared.rail.focus();
    expect(document.activeElement).toBe(focus);
    expect(root.inert).toBe(false);
    expect(root.hasAttribute('aria-hidden')).toBe(false);
    const before = [root, prepared.table, prepared.rail, prepared.spacer].map((element) =>
      element.getBoundingClientRect().toJSON(),
    );
    const version = prepared.geometryVersion;
    owner.beforeGeometryChange.mockClear();
    const mutation = new MutationObserver(() => undefined);
    mutation.observe(prepared.spacer, { attributes: true, childList: true });

    enhanceTableScroll(root, controller().signal);
    queued[0]?.();
    const active = readPreparedTableGeometry(root);
    expect(active?.phase).toBe('active');
    expect(active?.rail).toBe(prepared.rail);
    expect(active?.spacer).toBe(prepared.spacer);
    expect(active?.generation).toBe(prepared.generation);
    expect(active?.geometryVersion).toBe(version);
    expect(
      [root, prepared.table, prepared.rail, prepared.spacer].map((element) =>
        element.getBoundingClientRect().toJSON(),
      ),
    ).toEqual(before);
    expect(owner.beforeGeometryChange).not.toHaveBeenCalled();
    expect(mutation.takeRecords()).toEqual([]);
    mutation.disconnect();
    expect(prepared.rail.inert).toBe(false);
    expect(prepared.rail.hasAttribute('aria-hidden')).toBe(false);
    expect(prepared.rail.tabIndex).toBe(0);
    prepared.rail.focus();
    expect(document.activeElement).toBe(prepared.rail);
    expect(scroll).not.toHaveBeenCalled();
    expect(historyPush).not.toHaveBeenCalled();
    expect(historyReplace).not.toHaveBeenCalled();
  });

  it('初期 SSR 相当の document 準備を複数表の activation が二重生成せず採用すること', () => {
    const first = createEligibleTableFixture();
    const second = createEligibleTableFixture({ rootId: 'author-table-id' });
    expect(prepareTableGeometry(document, options(controller().signal))).toBe(true);
    const a = readPreparedTableGeometry(first);
    const b = readPreparedTableGeometry(second);
    enhanceTableScroll(document.body, controller().signal);
    expect(getRail(first)).toBe(a?.rail);
    expect(getRail(second)).toBe(b?.rail);
    expect(document.querySelectorAll('[data-table-scroll-rail]')).toHaveLength(2);
    expect(a?.generatedRootId).toBe(first.id);
    expect(b?.generatedRootId).toBe(null);
    expect(getRail(first)?.getAttribute('aria-controls')).toBe(first.id);
    expect(getRail(second)?.getAttribute('aria-controls')).toBe('author-table-id');
  });

  it('prepare 専用の最新 intent 判定は終了後の content lifetime に持ち込まないこと', () => {
    const root = createEligibleTableFixture();
    let canPrepare = true;
    expect(
      prepareTableGeometry(root, { ...options(controller().signal), canPrepare: () => canPrepare }),
    ).toBe(true);
    canPrepare = false;
    enhanceTableScroll(root, controller().signal);
    expect(readPreparedTableGeometry(root)?.phase).toBe('active');
    const rail = makeRailScrollableInFixture(root);
    if (!rail) throw new Error('Missing active rail');
    rail.scrollLeft = 100;
    rail.dispatchEvent(new Event('scroll'));
    expect(root.scrollLeft).toBeCloseTo(100, 0);
  });

  it('準備の最初の書込み前に intent が変われば部分 DOM を残さないこと', () => {
    const root = createEligibleTableFixture();
    let currentIntent = true;
    expect(
      prepareTableGeometry(root, {
        isCurrent: () => true,
        canPrepare: () => currentIntent,
        beforeGeometryChange: () => {
          currentIntent = false;
        },
        signal: controller().signal,
      }),
    ).toBe(false);
    expect(getRail(root)).toBe(null);
    expect(root.hasAttribute('data-overflow')).toBe(false);
    expect(readPreparedTableGeometry(root)).toBe(null);
  });

  it('rail 挿入中の例外は自分の部分準備だけ清掃し未知隣接 rail を残すこと', () => {
    const root = createEligibleTableFixture();
    const unknown = createStaleRail();
    root.before(unknown);
    const original = root.before.bind(root);
    vi.spyOn(root, 'before').mockImplementation((...nodes) => {
      original(...nodes);
      throw new Error('insertion failed');
    });
    expect(prepareTableGeometry(root, options(controller().signal))).toBe(false);
    expect(unknown.isConnected).toBe(true);
    expect(document.querySelectorAll('[data-table-scroll-rail]')).toHaveLength(1);
    expect(readPreparedTableGeometry(root)).toBe(null);
  });

  it('既知 geometry の変化は spacer 書換えより前に証跡を失効すること', () => {
    const queued = controlResizeObservers();
    const root = createEligibleTableFixture();
    const table = getOwnedTableInFixture(root);
    const owner = options(controller().signal);
    expect(prepareTableGeometry(root, owner)).toBe(true);
    enhanceTableScroll(root, controller().signal);
    const old = readPreparedTableGeometry(root);
    const spacer = old?.spacer;
    if (!table || !spacer || !old) throw new Error('Missing preparation');
    const oldWidth = spacer.style.inlineSize;
    const observed: string[] = [];
    owner.beforeGeometryChange.mockImplementation(() => {
      observed.push(spacer.style.inlineSize);
    });
    table.style.inlineSize = '480px';
    table.style.minInlineSize = '480px';
    queued[0]?.();
    expect(observed).toEqual([oldWidth]);
    expect(spacer.style.inlineSize).toBe(`${root.scrollWidth}px`);
    expect(readPreparedTableGeometry(root)?.geometryVersion).toBeGreaterThan(old.geometryVersion);
  });

  it('失効 hook で新 owner へ再採用しても旧 callback は新 spacer を書き換えないこと', () => {
    const queued = controlResizeObservers();
    const root = createEligibleTableFixture();
    const table = getOwnedTableInFixture(root);
    const owner = options(controller().signal);
    expect(prepareTableGeometry(root, owner)).toBe(true);
    enhanceTableScroll(root, controller().signal);
    const rail = getRail(root);
    owner.beforeGeometryChange.mockImplementation(() => {
      expect(prepareTableGeometry(root, options(controller().signal))).toBe(true);
      enhanceTableScroll(root, controller().signal);
    });
    if (!table) throw new Error('Missing table');
    table.style.inlineSize = '480px';
    table.style.minInlineSize = '480px';
    queued[0]?.();
    expect(getRail(root)).toBe(rail);
    expect(readPreparedTableGeometry(root)?.spacer?.style.inlineSize).toBe(`${root.scrollWidth}px`);
    expect(readPreparedTableGeometry(root)?.phase).toBe('active');
  });

  it('旧 abort と queued RO/root/rail scroll は再採用 state の rail と WeakMap を消さないこと', () => {
    const queued = controlResizeObservers();
    const root = createEligibleTableFixture();
    const rootAdd = vi.spyOn(root, 'addEventListener');
    const first = controller();
    const oldOwner = options(controller().signal);
    expect(prepareTableGeometry(root, oldOwner)).toBe(true);
    const rail = getRail(root);
    if (!rail) throw new Error('Missing prepared rail');
    const railAdd = vi.spyOn(rail, 'addEventListener');
    enhanceTableScroll(root, first.signal);
    const oldRootScroll = rootAdd.mock.calls.find(([type]) => type === 'scroll')?.[1];
    const oldRailScroll = railAdd.mock.calls.find(([type]) => type === 'scroll')?.[1];
    root.scrollLeft = 40;
    root.dispatchEvent(new Event('scroll'));
    const old = readPreparedTableGeometry(root);
    expect(prepareTableGeometry(root, options(controller().signal))).toBe(true);
    enhanceTableScroll(root, controller().signal);
    const adopted = readPreparedTableGeometry(root);
    expect(adopted?.generation).not.toBe(old?.generation);
    expect(adopted?.rail).toBe(rail);
    const unknown = createStaleRail();
    rail.before(unknown);
    first.abort();
    queued[0]?.();
    if (typeof oldRootScroll === 'function') oldRootScroll.call(root, new Event('scroll'));
    if (typeof oldRailScroll === 'function') oldRailScroll.call(rail, new Event('scroll'));
    expect(rail.isConnected).toBe(true);
    expect(unknown.isConnected).toBe(true);
    unknown.remove();
    expect(readPreparedTableGeometry(root)?.generation).toBe(adopted?.generation);
    const activeRail = makeRailScrollableInFixture(root);
    if (!activeRail) throw new Error('Missing adopted rail');
    activeRail.scrollLeft = 140;
    activeRail.dispatchEvent(new Event('scroll'));
    expect(root.scrollLeft).toBeCloseTo(140, 0);
  });

  it('rollback 相当の同 DOM 再採用は生成 ID と rail 実体を保ち旧 owner abort から独立すること', () => {
    const root = createEligibleTableFixture();
    const oldOwner = controller();
    let epoch = 1;
    expect(
      prepareTableGeometry(root, { ...options(oldOwner.signal), isCurrent: () => epoch === 1 }),
    ).toBe(true);
    enhanceTableScroll(root, controller().signal);
    const old = readPreparedTableGeometry(root);
    epoch = 2;
    expect(
      prepareTableGeometry(root, { ...options(controller().signal), isCurrent: () => epoch === 2 }),
    ).toBe(true);
    enhanceTableScroll(root, controller().signal);
    oldOwner.abort();
    expect(readPreparedTableGeometry(root)?.rail).toBe(old?.rail);
    expect(root.id).toBe(old?.generatedRootId);
    expect(readPreparedTableGeometry(root)?.generatedRootId).toBe(root.id);
    expect(getRail(root)?.getAttribute('aria-controls')).toBe(root.id);
  });

  it('同じ root の abort→再準備でも ID は安定し、生成接頭辞に似た author ID は正規化根拠にしないこと', () => {
    const root = createEligibleTableFixture();
    const owner = controller();
    expect(prepareTableGeometry(root, options(owner.signal))).toBe(true);
    const id = root.id;
    owner.abort();
    expect(prepareTableGeometry(root, options(controller().signal))).toBe(true);
    expect(root.id).toBe(id);
    expect(readPreparedTableGeometry(root)?.generatedRootId).toBe(id);
    const author = createEligibleTableFixture({ rootId: 'rouault-table-root-999999' });
    expect(prepareTableGeometry(author, options(controller().signal))).toBe(true);
    expect(readPreparedTableGeometry(author)?.generatedRootId).toBe(null);
  });

  it('重複する author ID を書換えず rail の ARIA 参照と証跡を拒否すること', () => {
    const root = createEligibleTableFixture({ rootId: 'duplicate-table-id' });
    const other = document.createElement('div');
    other.id = root.id;
    document.body.append(other);
    expect(prepareTableGeometry(root, options(controller().signal))).toBe(false);
    expect(root.id).toBe('duplicate-table-id');
    expect(getRail(root)).toBe(null);
    expect(readPreparedTableGeometry(root)).toBe(null);
  });

  it('新 DOM へ複製された ID を旧 root の生成 provenance として採用しないこと', () => {
    const root = createEligibleTableFixture();
    expect(prepareTableGeometry(root, options(controller().signal))).toBe(true);
    const replacement = root.cloneNode(true);
    if (!(replacement instanceof HTMLElement)) throw new Error('Missing cloned table');
    root.replaceWith(replacement);
    getRail(replacement)?.remove();
    expect(prepareTableGeometry(replacement, options(controller().signal))).toBe(true);
    expect(readPreparedTableGeometry(replacement)?.generatedRootId).toBe(null);
    expect(readPreparedTableGeometry(root)).toBe(null);
  });

  it('content owner 失効後の queued callback は root の新しい本文世代へ書き込まないこと', () => {
    const queued = controlResizeObservers();
    const root = createEligibleTableFixture();
    let current = true;
    const owner = options(controller().signal);
    expect(prepareTableGeometry(root, { ...owner, isCurrent: () => current })).toBe(true);
    enhanceTableScroll(root, controller().signal);
    const rail = getRail(root);
    const version = readPreparedTableGeometry(root)?.geometryVersion;
    current = false;
    root.removeAttribute('data-overflow');
    queued[0]?.();
    root.dispatchEvent(new Event('scroll'));
    rail?.dispatchEvent(new Event('scroll'));
    enhanceTableScroll(root, controller().signal);
    expect(root.hasAttribute('data-overflow')).toBe(false);
    expect(owner.beforeGeometryChange).toHaveBeenCalled();
    expect(readPreparedTableGeometry(root)).toBe(null);
    expect(version).toBeGreaterThan(0);
  });
});

describe('table-scroll-enhancer preparation provenance validation', () => {
  const controllers: AbortController[] = [];
  afterEach(() => {
    for (const controller of controllers) controller.abort();
    controllers.length = 0;
    document.body.replaceChildren();
  });
  const prepare = (root: HTMLElement): AbortController => {
    const owner = new AbortController();
    controllers.push(owner);
    expect(
      prepareTableGeometry(root, {
        isCurrent: () => true,
        beforeGeometryChange: () => undefined,
        signal: owner.signal,
      }),
    ).toBe(true);
    return owner;
  };

  for (const phase of ['prepared', 'active'] as const) {
    for (const attribute of [
      'inert',
      'aria-hidden',
      'tabindex',
      'role',
      'aria-label',
      'aria-controls',
      'pointer-events',
    ] as const) {
      it(`${phase} の ${attribute} が既知の値と異なれば provenance を返さないこと`, () => {
        const root = createEligibleTableFixture({ caption: '正規 caption' });
        prepare(root);
        if (phase === 'active') {
          const activation = new AbortController();
          controllers.push(activation);
          enhanceTableScroll(root, activation.signal);
        }
        const rail = getRail(root);
        if (!rail) throw new Error('Missing owned rail');
        expect(readPreparedTableGeometry(root)?.phase).toBe(phase);
        if (attribute === 'inert') rail.toggleAttribute('inert', phase === 'active');
        else if (attribute === 'pointer-events') rail.style.pointerEvents = 'auto';
        else rail.setAttribute(attribute, 'unknown-value');
        expect(readPreparedTableGeometry(root)).toBe(null);
      });
    }
  }

  it('caption が変わっても古い accessible name の rail を証跡として採用しないこと', () => {
    const root = createEligibleTableFixture({ caption: '旧 caption' });
    prepare(root);
    const table = getOwnedTableInFixture(root);
    if (!table?.caption) throw new Error('Missing caption');
    table.caption.textContent = '新 caption';
    expect(readPreparedTableGeometry(root)).toBe(null);
  });

  it('準備と activation は 0 以外の root 横位置を reset せず rail へ採用すること', () => {
    const style = document.createElement('style');
    style.textContent =
      '[data-table-scroll-rail]{overflow-x:auto;block-size:14px;inline-size:120px}[data-table-scroll-rail-spacer]{block-size:1px}';
    document.body.append(style);
    const root = createEligibleTableFixture();
    root.scrollLeft = 83.5;
    const reached = root.scrollLeft;
    prepare(root);
    const rail = getRail(root);
    expect(root.scrollLeft).toBe(reached);
    expect(rail?.scrollLeft).toBeCloseTo(reached, 0);
    const activation = new AbortController();
    controllers.push(activation);
    enhanceTableScroll(root, activation.signal);
    expect(root.scrollLeft).toBe(reached);
    expect(rail?.scrollLeft).toBeCloseTo(reached, 0);
  });
});

describe('table-scroll-enhancer legacy activation proof boundary', () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it('従来 activation は UI を維持するが明示 geometry owner の採用までは証跡にしないこと', () => {
    const root = createEligibleTableFixture();
    const legacy = new AbortController();
    const owner = new AbortController();
    const activation = new AbortController();
    enhanceTableScroll(root, legacy.signal);
    const rail = makeRailScrollableInFixture(root);
    if (!rail) throw new Error('Missing legacy rail');
    rail.scrollLeft = 60;
    rail.dispatchEvent(new Event('scroll'));
    expect(root.scrollLeft).toBeCloseTo(60, 0);
    expect(readPreparedTableGeometry(root)).toBe(null);
    const invalidated = vi.fn();
    expect(
      prepareTableGeometry(root, {
        isCurrent: () => true,
        beforeGeometryChange: invalidated,
        signal: owner.signal,
      }),
    ).toBe(true);
    enhanceTableScroll(root, activation.signal);
    legacy.abort();
    expect(readPreparedTableGeometry(root)?.rail).toBe(rail);
    expect(readPreparedTableGeometry(root)?.phase).toBe('active');
    owner.abort();
    activation.abort();
  });
});

describe('table-scroll-enhancer activation subscription reentry', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    document.body.replaceChildren();
  });

  it('RO 初回 observe 中の owner abort 後は追加 observe をせず購読と queued callback を無効にすること', () => {
    const root = createEligibleTableFixture();
    const owner = new AbortController();
    const activation = new AbortController();
    const observed: Element[] = [];
    let disconnected = 0;
    let queued: (() => void) | undefined;
    class ReentrantResizeObserver implements ResizeObserver {
      constructor(callback: ResizeObserverCallback) {
        queued = () => callback([], this);
      }
      observe(target: Element): void {
        observed.push(target);
        owner.abort();
      }
      unobserve(): void {
        /* 明示的な owner abort でまとめて解放する。 */
      }
      disconnect(): void {
        disconnected += 1;
      }
    }
    vi.stubGlobal('ResizeObserver', ReentrantResizeObserver);
    expect(
      prepareTableGeometry(root, {
        isCurrent: () => true,
        beforeGeometryChange: () => undefined,
        signal: owner.signal,
      }),
    ).toBe(true);
    enhanceTableScroll(root, activation.signal);
    expect(observed).toEqual([root]);
    expect(disconnected).toBeGreaterThan(0);
    expect(getRail(root)).toBe(null);
    root.removeAttribute('data-overflow');
    queued?.();
    root.dispatchEvent(new Event('scroll'));
    expect(root.hasAttribute('data-overflow')).toBe(false);
    expect(readPreparedTableGeometry(root)).toBe(null);
    activation.abort();
  });
});

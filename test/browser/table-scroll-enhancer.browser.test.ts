import { afterEach, describe, expect, it } from 'vitest';

import { enhanceTableScroll } from '../../src/client/post-hydrate/table-scroll-enhancer.js';

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

  it('short overflow / non-overflow / AbortSignal 解除時に root 直前の stale rail を削除すること', async () => {
    const shortRoot = createTableFixture();
    const shortStaleA = createStaleRail();
    const shortStaleB = createStaleRail();
    shortRoot.before(shortStaleA, shortStaleB);

    enhanceTableScroll(shortRoot);
    await nextFrame();

    expect(shortStaleA.isConnected).to.equal(false);
    expect(shortStaleB.isConnected).to.equal(false);
    expect(getRail(shortRoot)).to.equal(null);

    const nonOverflowRoot = createTableFixture({ rootWidth: 360, tableWidth: 120 });
    const nonOverflowStale = createStaleRail();
    nonOverflowRoot.before(nonOverflowStale);

    enhanceTableScroll(nonOverflowRoot);
    await nextFrame();

    expect(nonOverflowStale.isConnected).to.equal(false);
    expect(getRail(nonOverflowRoot)).to.equal(null);

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
    expect(abortStale.isConnected).to.equal(false);
    expect(getRail(eligibleRoot)).to.equal(null);
  });

  it('eligible overflow 更新時に root 直前の連続 stale rail を 1 つの active rail へ正規化すること', async () => {
    const root = createEligibleTableFixture();
    const staleA = createStaleRail();
    const staleB = createStaleRail();
    root.before(staleA, staleB);

    enhanceTableScroll(root);
    await nextFrame();

    const rail = getRail(root);
    expect(rail).to.not.equal(null);
    expect(staleA.isConnected).to.equal(false);
    expect(staleB.isConnected).to.equal(false);
    expect(document.body.querySelectorAll('[data-table-scroll-rail]').length).to.equal(1);
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
    expect(unknownRail.isConnected).to.equal(false);

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

    const firstSpacer = rail?.querySelector<HTMLElement>(':scope > [data-table-scroll-rail-spacer]');
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
      firstCell.innerHTML = '<table><caption>入れ子 caption</caption><tbody><tr><td>N</td></tr></tbody></table>';
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

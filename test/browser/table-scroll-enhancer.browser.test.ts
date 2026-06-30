import { expect } from '@open-wc/testing';

import { enhanceTableScroll } from '../../src/client/post-hydrate/table-scroll-enhancer.js';

const nextFrame = async (): Promise<void> => {
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve());
  });
};

const createTableFixture = ({
  rootWidth = 120,
  tableWidth = 360,
}: {
  readonly rootWidth?: number;
  readonly tableWidth?: number;
} = {}): HTMLElement => {
  const root = document.createElement('div');
  root.dataset['tableRoot'] = 'true';
  root.tabIndex = 0;
  root.style.inlineSize = `${rootWidth}px`;
  root.style.overflowX = 'auto';
  root.innerHTML = `
    <table style="inline-size: ${tableWidth}px; min-inline-size: ${tableWidth}px;">
      <tbody>
        <tr>
          <td>Alpha</td>
          <td>Beta</td>
          <td>Gamma</td>
        </tr>
      </tbody>
    </table>
  `;
  document.body.append(root);
  return root;
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
    const table = root.querySelector<HTMLTableElement>('table');

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

  it('Phase1では DOM を追加しないこと', async () => {
    const root = createTableFixture();
    const before = root.querySelectorAll('*').length;

    enhanceTableScroll(root);
    await nextFrame();

    expect(root.querySelectorAll('*').length).to.equal(before);
  });
});

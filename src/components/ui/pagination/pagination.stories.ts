import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import './pagination';
import type { Pagination } from './pagination';

type PaginationMode = 'regular' | 'compact';

interface StoryArgs {
  current: number;
  total: number;
  mode: PaginationMode;
}

const defaultHref = (page: number): string => `?page=${String(page)}`;

function renderPagination(args: StoryArgs, id = 'pagination'): ReturnType<typeof html> {
  return html`
    <ui-pagination
      id="${id}"
      current="${args.current}"
      total="${args.total}"
      mode="${args.mode}"
      .getHref="${defaultHref}"
    ></ui-pagination>
  `;
}

function getPagination(canvasElement: HTMLElement, id = 'pagination'): Pagination {
  const element = canvasElement.querySelector<Pagination>(`#${id}`);
  if (!element) {
    throw new Error(`ui-pagination#${id} が見つかりません`);
  }
  return element;
}

function getShadowRoot(element: Pagination): ShadowRoot {
  const shadowRoot = element.shadowRoot;
  if (!shadowRoot) {
    throw new Error('shadowRoot が見つかりません');
  }
  return shadowRoot;
}

function getRenderedItems(shadowRoot: ShadowRoot): string[] {
  const list = shadowRoot.querySelector('[part="list"]');
  if (!list) {
    throw new Error('part="list" が見つかりません');
  }

  return Array.from(list.children).map((item) => {
    const control = item.firstElementChild;
    if (!(control instanceof HTMLElement)) {
      throw new Error('ページ項目が不正です');
    }

    if (control.classList.contains('ellipsis')) {
      return '…';
    }

    if (control.classList.contains('nav-btn')) {
      return control.getAttribute('aria-label') === '前のページへ移動' ? 'Prev' : 'Next';
    }

    return control.textContent.trim();
  });
}

function getPageLinks(shadowRoot: ShadowRoot): HTMLAnchorElement[] {
  return Array.from(shadowRoot.querySelectorAll<HTMLAnchorElement>('a.page-btn'));
}

function getCurrentPageLink(shadowRoot: ShadowRoot): HTMLAnchorElement {
  const currentLink = shadowRoot.querySelector<HTMLAnchorElement>('a.page-btn[aria-current="page"]');
  if (!currentLink) {
    throw new Error('現在ページリンクが見つかりません');
  }
  return currentLink;
}

function getNavLinks(shadowRoot: ShadowRoot): HTMLAnchorElement[] {
  return Array.from(shadowRoot.querySelectorAll<HTMLAnchorElement>('a.nav-btn'));
}

function getDisabledNavButtons(shadowRoot: ShadowRoot): HTMLSpanElement[] {
  return Array.from(shadowRoot.querySelectorAll<HTMLSpanElement>('span.nav-btn[aria-disabled="true"]'));
}

function getEllipses(shadowRoot: ShadowRoot): HTMLSpanElement[] {
  return Array.from(shadowRoot.querySelectorAll<HTMLSpanElement>('span.ellipsis'));
}

function expectItems(actual: string[], expected: string[], storyName: string): void {
  const actualText = actual.join(' ');
  const expectedText = expected.join(' ');

  if (actualText !== expectedText) {
    throw new Error(`[${storyName}] 描画結果が不正です: "${actualText}" !== "${expectedText}"`);
  }
}

function getStyleText(shadowRoot: ShadowRoot): string {
  const inlineStyles = Array.from(shadowRoot.querySelectorAll('style'))
    .map((style) => style.textContent || '')
    .join('\n');
  const adoptedStyles = shadowRoot.adoptedStyleSheets
    .map((styleSheet) => {
      try {
        return Array.from(styleSheet.cssRules)
          .map((rule) => rule.cssText)
          .join('\n');
      } catch {
        return '';
      }
    })
    .join('\n');

  const styleText = `${inlineStyles}\n${adoptedStyles}`.trim();
  if (!styleText) {
    throw new Error('style が見つかりません');
  }
  return styleText;
}

function verifyCommonSemantics(shadowRoot: ShadowRoot, current: number): void {
  const nav = shadowRoot.querySelector('nav');
  if (!nav) {
    throw new Error('nav が見つかりません');
  }
  if (nav.getAttribute('aria-label') !== 'ページナビゲーション') {
    throw new Error('nav の aria-label が不正です');
  }
  if (nav.getAttribute('part') !== 'nav') {
    throw new Error('nav part が不正です');
  }

  const list = shadowRoot.querySelector('ul');
  if (!list) {
    throw new Error('list が見つかりません');
  }
  if (list.getAttribute('part') !== 'list') {
    throw new Error('list part が不正です');
  }

  const currentLink = getCurrentPageLink(shadowRoot);
  if (currentLink.textContent.trim() !== String(current)) {
    throw new Error('現在ページのテキストが不正です');
  }
  if (currentLink.getAttribute('href') !== defaultHref(current)) {
    throw new Error('現在ページの href が不正です');
  }
  if (currentLink.getAttribute('aria-label') !== `現在のページ、${String(current)}ページ`) {
    throw new Error('現在ページの aria-label が不正です');
  }

  getEllipses(shadowRoot).forEach((ellipsis) => {
    if (ellipsis.getAttribute('aria-hidden') !== 'true') {
      throw new Error('省略記号に aria-hidden="true" がありません');
    }
  });
}

const meta = {
  title: 'Components/Pagination',
  component: 'ui-pagination',
  tags: ['autodocs'],
  args: {
    current: 5,
    total: 10,
    mode: 'regular',
  },
  argTypes: {
    current: {
      control: 'number',
      description: '現在ページ番号',
      table: { type: { summary: 'number' }, defaultValue: { summary: '1' } },
    },
    total: {
      control: 'number',
      description: '総ページ数',
      table: { type: { summary: 'number' }, defaultValue: { summary: '1' } },
    },
    mode: {
      control: 'inline-radio',
      options: ['regular', 'compact'],
      description: '表示モード',
      table: { type: { summary: "'regular' | 'compact'" }, defaultValue: { summary: 'regular' } },
    },
  },
  parameters: {
    docs: {
      description: {
        component: `
ページネーションは URL を伴うリンク集合として振る舞います。

## 公開契約

- \`current\` / \`total\` / \`getHref\` / \`mode\` を入力に取ります
- 現在ページも \`<a aria-current="page">\` として描画されます
- Prev / Next は境界で \`<span aria-disabled="true">\` へ切り替わります
- \`mode="compact"\` は公開入力であり、自動切替ではありません
- helper 関数や内部 state は契約に含めません

## 代表例

- \`regular\`, \`current=5\`, \`total=10\` → \`Prev 1 … 4 5 6 … 10 Next\`
- \`compact\`, \`current=5\`, \`total=10\` → \`Prev … 5 … Next\`
        `,
      },
    },
  },
  render: (args: StoryArgs) => renderPagination(args),
} satisfies Meta<StoryArgs>;

export default meta;

type Story = StoryObj<StoryArgs>;

export const Default: Story = {
  play: async ({ canvasElement, args }) => {
    const storyName = 'Default';
    const pagination = getPagination(canvasElement);
    await pagination.updateComplete;

    const shadowRoot = getShadowRoot(pagination);
    verifyCommonSemantics(shadowRoot, args.current);

    expectItems(
      getRenderedItems(shadowRoot),
      ['Prev', '1', '…', '4', '5', '6', '…', '10', 'Next'],
      storyName,
    );

    const navLinks = getNavLinks(shadowRoot);
    if (navLinks.length !== 2) {
      throw new Error(`[${storyName}] Prev / Next のリンク数が不正です`);
    }
    if (navLinks[0].getAttribute('href') !== '?page=4') {
      throw new Error(`[${storyName}] Prev の href が不正です`);
    }
    if (navLinks[1].getAttribute('href') !== '?page=6') {
      throw new Error(`[${storyName}] Next の href が不正です`);
    }
    if (navLinks[0].getAttribute('aria-label') !== '前のページへ移動') {
      throw new Error(`[${storyName}] Prev の aria-label が不正です`);
    }
    if (navLinks[1].getAttribute('aria-label') !== '次のページへ移動') {
      throw new Error(`[${storyName}] Next の aria-label が不正です`);
    }

    const pageLabels = getPageLinks(shadowRoot).map((link) => link.textContent.trim());
    if (pageLabels.join(' ') !== '1 4 5 6 10') {
      throw new Error(`[${storyName}] ページリンクの並びが不正です`);
    }
  },
};

export const SinglePage: Story = {
  args: {
    current: 1,
    total: 1,
    mode: 'regular',
  },
  play: async ({ canvasElement, args }) => {
    const storyName = 'SinglePage';
    const pagination = getPagination(canvasElement);
    await pagination.updateComplete;

    const shadowRoot = getShadowRoot(pagination);
    verifyCommonSemantics(shadowRoot, args.current);

    expectItems(getRenderedItems(shadowRoot), ['Prev', '1', 'Next'], storyName);

    if (getEllipses(shadowRoot).length !== 0) {
      throw new Error(`[${storyName}] 単一ページで省略記号が表示されています`);
    }
    if (getDisabledNavButtons(shadowRoot).length !== 2) {
      throw new Error(`[${storyName}] Prev / Next が disabled ではありません`);
    }
  },
};

export const RegularRepresentativeExamples: Story = {
  render: () => html`
    <div style="display: grid; gap: 16px;">
      ${renderPagination({ current: 1, total: 8, mode: 'regular' }, 'example-8-1')}
      ${renderPagination({ current: 4, total: 8, mode: 'regular' }, 'example-8-4')}
      ${renderPagination({ current: 5, total: 8, mode: 'regular' }, 'example-8-5')}
      ${renderPagination({ current: 4, total: 9, mode: 'regular' }, 'example-9-4')}
      ${renderPagination({ current: 5, total: 9, mode: 'regular' }, 'example-9-5')}
    </div>
  `,
  play: async ({ canvasElement }) => {
    const cases: { id: string; expected: string[] }[] = [
      { id: 'example-8-1', expected: ['Prev', '1', '2', '3', '…', '8', 'Next'] },
      { id: 'example-8-4', expected: ['Prev', '1', '2', '3', '4', '5', '…', '8', 'Next'] },
      { id: 'example-8-5', expected: ['Prev', '1', '…', '4', '5', '6', '7', '8', 'Next'] },
      { id: 'example-9-4', expected: ['Prev', '1', '2', '3', '4', '5', '…', '9', 'Next'] },
      { id: 'example-9-5', expected: ['Prev', '1', '…', '4', '5', '6', '…', '9', 'Next'] },
    ];

    for (const testCase of cases) {
      const pagination = getPagination(canvasElement, testCase.id);
      await pagination.updateComplete;
      const shadowRoot = getShadowRoot(pagination);
      expectItems(getRenderedItems(shadowRoot), testCase.expected, 'RegularRepresentativeExamples');
    }
  },
};

export const ThresholdAndGapRules: Story = {
  render: () => html`
    <div style="display: grid; gap: 16px;">
      ${renderPagination({ current: 4, total: 7, mode: 'regular' }, 'threshold-7')}
      ${renderPagination({ current: 4, total: 8, mode: 'regular' }, 'threshold-8')}
      ${renderPagination({ current: 4, total: 10, mode: 'regular' }, 'gap-left')}
      ${renderPagination({ current: 7, total: 10, mode: 'regular' }, 'gap-right')}
    </div>
  `,
  play: async ({ canvasElement }) => {
    const cases: { id: string; expected: string[]; ellipsisCount: number }[] = [
      {
        id: 'threshold-7',
        expected: ['Prev', '1', '2', '3', '4', '5', '6', '7', 'Next'],
        ellipsisCount: 0,
      },
      {
        id: 'threshold-8',
        expected: ['Prev', '1', '2', '3', '4', '5', '…', '8', 'Next'],
        ellipsisCount: 1,
      },
      {
        id: 'gap-left',
        expected: ['Prev', '1', '2', '3', '4', '5', '…', '10', 'Next'],
        ellipsisCount: 1,
      },
      {
        id: 'gap-right',
        expected: ['Prev', '1', '…', '6', '7', '8', '9', '10', 'Next'],
        ellipsisCount: 1,
      },
    ];

    for (const testCase of cases) {
      const pagination = getPagination(canvasElement, testCase.id);
      await pagination.updateComplete;
      const shadowRoot = getShadowRoot(pagination);
      expectItems(getRenderedItems(shadowRoot), testCase.expected, 'ThresholdAndGapRules');
      if (getEllipses(shadowRoot).length !== testCase.ellipsisCount) {
        throw new Error(`[ThresholdAndGapRules] ${testCase.id} の省略記号数が不正です`);
      }
    }
  },
};

export const NearStartAndNearEnd: Story = {
  render: () => html`
    <div style="display: grid; gap: 16px;">
      ${renderPagination({ current: 2, total: 10, mode: 'regular' }, 'near-start-2')}
      ${renderPagination({ current: 3, total: 10, mode: 'regular' }, 'near-start-3')}
      ${renderPagination({ current: 8, total: 10, mode: 'regular' }, 'near-end-8')}
      ${renderPagination({ current: 9, total: 10, mode: 'regular' }, 'near-end-9')}
    </div>
  `,
  play: async ({ canvasElement }) => {
    const cases: { id: string; expected: string[] }[] = [
      { id: 'near-start-2', expected: ['Prev', '1', '2', '3', '…', '10', 'Next'] },
      { id: 'near-start-3', expected: ['Prev', '1', '2', '3', '4', '…', '10', 'Next'] },
      { id: 'near-end-8', expected: ['Prev', '1', '…', '7', '8', '9', '10', 'Next'] },
      { id: 'near-end-9', expected: ['Prev', '1', '…', '8', '9', '10', 'Next'] },
    ];

    for (const testCase of cases) {
      const pagination = getPagination(canvasElement, testCase.id);
      await pagination.updateComplete;
      const shadowRoot = getShadowRoot(pagination);
      expectItems(getRenderedItems(shadowRoot), testCase.expected, 'NearStartAndNearEnd');
    }
  },
};

export const CompactMode: Story = {
  args: {
    current: 5,
    total: 10,
    mode: 'compact',
  },
  play: async ({ canvasElement, args }) => {
    const storyName = 'CompactMode';
    const pagination = getPagination(canvasElement);
    await pagination.updateComplete;

    if (pagination.mode !== 'compact') {
      throw new Error(`[${storyName}] mode が compact ではありません`);
    }

    const shadowRoot = getShadowRoot(pagination);
    verifyCommonSemantics(shadowRoot, args.current);

    expectItems(getRenderedItems(shadowRoot), ['Prev', '…', '5', '…', 'Next'], storyName);

    const pageLabels = getPageLinks(shadowRoot).map((link) => link.textContent.trim());
    if (pageLabels.join(' ') !== '5') {
      throw new Error(`[${storyName}] compact で現在ページ以外の番号が表示されています`);
    }
  },
};

export const CompactEdges: Story = {
  render: () => html`
    <div style="display: grid; gap: 16px;">
      ${renderPagination({ current: 1, total: 10, mode: 'compact' }, 'compact-first')}
      ${renderPagination({ current: 10, total: 10, mode: 'compact' }, 'compact-last')}
      ${renderPagination({ current: 1, total: 1, mode: 'compact' }, 'compact-single')}
    </div>
  `,
  play: async ({ canvasElement }) => {
    const cases: { id: string; expected: string[]; disabledCount: number }[] = [
      { id: 'compact-first', expected: ['Prev', '1', '…', 'Next'], disabledCount: 1 },
      { id: 'compact-last', expected: ['Prev', '…', '10', 'Next'], disabledCount: 1 },
      { id: 'compact-single', expected: ['Prev', '1', 'Next'], disabledCount: 2 },
    ];

    for (const testCase of cases) {
      const pagination = getPagination(canvasElement, testCase.id);
      await pagination.updateComplete;
      const shadowRoot = getShadowRoot(pagination);
      expectItems(getRenderedItems(shadowRoot), testCase.expected, 'CompactEdges');
      if (getDisabledNavButtons(shadowRoot).length !== testCase.disabledCount) {
        throw new Error(`[CompactEdges] ${testCase.id} の disabled 数が不正です`);
      }
    }
  },
};

export const StyleContracts: Story = {
  play: async ({ canvasElement }) => {
    const storyName = 'StyleContracts';
    const pagination = getPagination(canvasElement);
    await pagination.updateComplete;

    const styleText = getStyleText(getShadowRoot(pagination));
    const requiredFragments = [
      'flex-wrap: nowrap',
      'prefers-reduced-motion: reduce',
      'forced-colors: active',
      '.page-btn[aria-current',
      '.nav-btn[aria-disabled',
    ];

    for (const fragment of requiredFragments) {
      if (!styleText.includes(fragment)) {
        throw new Error(`[${storyName}] style 契約が不足しています: ${fragment}`);
      }
    }
  },
};

import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components-vite';
import './search-dialog';
import type {
  UiSearchDialogItem,
  UiSearchDialogMatchField,
  UiSearchDialogMessages,
  UiSearchDialogSearchResult,
} from './search-dialog.types';

interface StoryArgs {
  items: UiSearchDialogItem[];
  loading: boolean;
  query: string;
  opened: boolean;
  searcher:
    | ((context: {
        query: string;
        signal: AbortSignal;
        limit?: number;
        locale?: string;
      }) => Promise<UiSearchDialogSearchResult> | UiSearchDialogSearchResult)
    | null;
  dark: boolean;
  messages: Partial<UiSearchDialogMessages>;
  matchFields: readonly UiSearchDialogMatchField[];
}

const FIXTURE_ITEMS: UiSearchDialogItem[] = [
  {
    id: 'alpha',
    title: 'Alpha Guide',
    renderHref: '/docs/alpha',
    canonicalPathname: '/docs/alpha',
    path: '/docs/alpha',
    keywords: ['guide', 'entry'],
  },
  {
    id: 'beta',
    title: 'Beta Reference',
    renderHref: '/docs/beta',
    canonicalPathname: '/docs/beta',
    path: '/docs/beta',
    keywords: ['reference', 'api'],
  },
  {
    id: 'gamma',
    title: 'Gamma Notes',
    renderHref: '/notes/gamma',
    canonicalPathname: '/notes/gamma',
    path: '/notes/gamma',
    keywords: ['notes', 'memo'],
  },
  {
    id: 'delta',
    title: 'Delta API',
    renderHref: '/api/delta',
    canonicalPathname: '/api/delta',
    path: '/api/delta',
    keywords: ['schema'],
  },
];

function createVirtualizedItems(total = 160): UiSearchDialogItem[] {
  return Array.from({ length: total }, (_, index) => ({
    id: `virtual-${String(index + 1)}`,
    title: `Virtual Item ${String(index + 1)}`,
    renderHref: `/virtual/${String(index + 1)}`,
    canonicalPathname: `/virtual/${String(index + 1)}`,
    path: `/virtual/${String(index + 1)}`,
    keywords: [`keyword-${String(index + 1)}`],
  }));
}

const movedToBrowserDocs = (story: string) => ({
  tags: ['manual-only'],
  parameters: {
    docs: {
      description: {
        story,
      },
    },
  },
});

const meta = {
  title: 'Components/SearchDialog',
  component: 'ui-search-dialog',
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: `
検索ダイアログです。

- controlled open / close / query / selection / virtualization / focus return の browser contract は \`test/browser/search-dialog.browser.test.ts\` を正本にします。
- CSS 構造契約は SSR 側を正本にします。
- Storybook には representative surface と manual review 面だけを残します。
        `,
      },
    },
  },
  args: {
    items: FIXTURE_ITEMS,
    loading: false,
    query: '',
    opened: false,
    searcher: null,
    dark: false,
    messages: {},
    matchFields: ['title', 'path', 'keywords'],
  },
  render: (args: StoryArgs) => html`
    <div
      style="
        min-height: 100vh;
        padding: 32px;
        background: ${args.dark ? 'var(--bg-canvas, #111)' : 'var(--bg-canvas, #fff)'};
        color: var(--fg-default, inherit);
      "
    >
      <button data-testid="trigger" type="button">検索を開く</button>

      <ui-search-dialog
        .items=${args.items}
        .loading=${args.loading}
        .query=${args.query}
        .opened=${args.opened}
        .searcher=${args.searcher}
        .messages=${args.messages}
        .matchFields=${args.matchFields}
      ></ui-search-dialog>
    </div>
  `,
} satisfies Meta<StoryArgs>;

export default meta;

type Story = StoryObj<StoryArgs>;

export const DefaultOpenedSurface: Story = {
  tags: ['smoke'],
  args: {
    opened: true,
    query: 'alpha',
  },
  parameters: {
    docs: {
      description: {
        story:
          '代表表示用の smoke story です。opened 状態の surface と結果一覧の見え方だけを残し、open / close / query / selection の合否は test/browser/search-dialog.browser.test.ts を正本とします。',
      },
    },
  },
};

export const LoadingSurface: Story = {
  args: {
    loading: true,
    query: 'alp',
    opened: true,
  },
  parameters: {
    docs: {
      description: {
        story:
          'loading surface の docs story です。loading 中の編集継続契約は browser test 側を正本とします。',
      },
    },
  },
};

export const ErrorSurface: Story = {
  args: {
    items: [],
    opened: true,
    query: 'alpha',
    searcher: () => ({
      items: [],
      error: {
        code: 'network-error',
        message: '検索サービスに接続できません',
      },
    }),
  },
  parameters: {
    docs: {
      description: {
        story:
          'error surface の docs story です。error state の合否は Storybook ではなく test/browser/search-dialog.browser.test.ts を正本とします。',
      },
    },
  },
};

export const FocusReturnManual: Story = {
  ...movedToBrowserDocs(
    'focus return / body scroll lock の契約は test/browser/search-dialog.browser.test.ts で検査します。',
  ),
  args: {
    opened: true,
  },
};

export const ControlledQueryManual: Story = {
  ...movedToBrowserDocs(
    'controlled query-change の契約は test/browser/search-dialog.browser.test.ts で検査します。',
  ),
  args: {
    opened: true,
    query: 'alpha',
  },
};

export const KeyboardLoopAndEnterManual: Story = {
  ...movedToBrowserDocs(
    'keyboard loop / Enter selection の契約は test/browser/search-dialog.browser.test.ts で検査します。',
  ),
  args: {
    opened: true,
    query: 'a',
  },
};

export const SelectionEventOrderManual: Story = {
  ...movedToBrowserDocs(
    'selected -> close-requested -> closed の順序契約は test/browser/search-dialog.browser.test.ts で検査します。',
  ),
  args: {
    opened: true,
    query: 'alpha',
  },
};

export const VirtualizationSemanticsManual: Story = {
  ...movedToBrowserDocs(
    'virtualized result list の aria-activedescendant 契約は test/browser/search-dialog.browser.test.ts で検査します。',
  ),
  args: {
    items: createVirtualizedItems(),
    opened: true,
    query: 'Virtual',
  },
};

export const DarkModeManual: Story = {
  tags: ['manual-only'],
  args: {
    dark: true,
    opened: true,
    query: 'alpha',
  },
  parameters: {
    docs: {
      description: {
        story:
          'dark mode token / CSS 構造契約は Storybook ではなく SSR 側を正本にします。この story は手動確認専用です。',
      },
    },
  },
};

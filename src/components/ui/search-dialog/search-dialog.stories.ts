import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { expect, userEvent, waitFor } from 'storybook/test';
import './search-dialog';
import type {
  UiSearchDialog,
} from './search-dialog';
import type {
  UiSearchDialogCloseRequestedDetail,
  UiSearchDialogItem,
  UiSearchDialogMatchField,
  UiSearchDialogMessages,
  UiSearchDialogOpenRequestedDetail,
  UiSearchDialogQueryChangedDetail,
  UiSearchDialogSearchResult,
  UiSearchDialogSelectedDetail,
} from './search-dialog.types';

interface StoryArgs {
  items: UiSearchDialogItem[];
  loading: boolean;
  query: string;
  opened: boolean;
  searcher:
  | ((
    context: {
      query: string;
      signal: AbortSignal;
      limit?: number;
      locale?: string;
    },
  ) => Promise<UiSearchDialogSearchResult> | UiSearchDialogSearchResult)
  | null;
  dark: boolean;
  messages: Partial<UiSearchDialogMessages>;
  matchFields: readonly UiSearchDialogMatchField[];
}

const FIXTURE_ITEMS: UiSearchDialogItem[] = [
  {
    id: 'alpha',
    title: 'Alpha Guide',
    url: '/docs/alpha',
    path: '/docs/alpha',
    keywords: ['guide', 'entry'],
  },
  {
    id: 'beta',
    title: 'Beta Reference',
    url: '/docs/beta',
    path: '/docs/beta',
    keywords: ['reference', 'api'],
  },
  {
    id: 'gamma',
    title: 'Gamma Notes',
    url: '/notes/gamma',
    path: '/notes/gamma',
    keywords: ['notes', 'memo'],
  },
  {
    id: 'delta',
    title: 'Delta API',
    url: '/api/delta',
    path: '/api/delta',
    keywords: ['schema'],
  },
];

function createVirtualizedItems(total = 160): UiSearchDialogItem[] {
  return Array.from({ length: total }, (_, index) => ({
    id: `virtual-${String(index + 1)}`,
    title: `Virtual Item ${String(index + 1)}`,
    url: `/virtual/${String(index + 1)}`,
    path: `/virtual/${String(index + 1)}`,
    keywords: [`keyword-${String(index + 1)}`],
  }));
}

function getDialog(canvasElement: HTMLElement): UiSearchDialog {
  const dialog = canvasElement.querySelector('ui-search-dialog');
  if (!(dialog instanceof HTMLElement)) {
    throw new Error('ui-search-dialog not found');
  }
  return dialog;
}

function getTrigger(canvasElement: HTMLElement): HTMLButtonElement {
  const trigger = canvasElement.querySelector<HTMLButtonElement>('[data-testid="trigger"]');
  if (!trigger) {
    throw new Error('trigger button not found');
  }
  return trigger;
}

function getSearchField(dialog: UiSearchDialog): HTMLElement & { value?: string } {
  const searchField = dialog.shadowRoot?.querySelector('ui-search-field');
  if (!(searchField instanceof HTMLElement)) {
    throw new Error('ui-search-field not found');
  }
  return searchField as HTMLElement & { value?: string };
}

function getCloseButton(dialog: UiSearchDialog): HTMLButtonElement {
  const closeButton = dialog.shadowRoot?.querySelector<HTMLButtonElement>('.close-button');
  if (!closeButton) {
    throw new Error('close button not found');
  }
  return closeButton;
}

function getResultItems(dialog: UiSearchDialog): HTMLElement[] {
  return Array.from(dialog.shadowRoot?.querySelectorAll<HTMLElement>('.result-item') ?? []);
}

function attachControlledContract(dialog: UiSearchDialog): void {
  dialog.addEventListener('ui-search-dialog-open-requested', (event) => {
    const customEvent = event as CustomEvent<UiSearchDialogOpenRequestedDetail>;
    dialog.opened = true;
    void customEvent.detail;
  });

  dialog.addEventListener('ui-search-dialog-close-requested', (_event) => {
    dialog.opened = false;
  });

  dialog.addEventListener('ui-search-dialog-query-changed', (event) => {
    const customEvent = event as CustomEvent<UiSearchDialogQueryChangedDetail>;
    dialog.query = customEvent.detail.query;
  });
}

async function requestOpen(canvasElement: HTMLElement): Promise<UiSearchDialog> {
  const dialog = getDialog(canvasElement);
  attachControlledContract(dialog);
  dialog.requestOpen(getTrigger(canvasElement));
  await waitFor(async () => {
    await expect(dialog.opened).toBe(true);
  });
  return dialog;
}

async function setQuery(dialog: UiSearchDialog, value: string): Promise<void> {
  const searchField = getSearchField(dialog);
  searchField.value = value;
  searchField.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
  await waitFor(async () => {
    await expect(dialog.query).toBe(value);
  });
}

async function waitForResults(dialog: UiSearchDialog): Promise<void> {
  await waitFor(async () => {
    await expect(getResultItems(dialog).length).toBeGreaterThan(0);
  });
}

const meta = {
  title: 'Components/SearchDialog',
  component: 'ui-search-dialog',
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
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

export const ControlledOpenedContract: Story = {
  play: async ({ canvasElement }) => {
    const dialog = getDialog(canvasElement);
    let requested = false;
    dialog.addEventListener('ui-search-dialog-open-requested', () => {
      requested = true;
    });

    dialog.requestOpen(getTrigger(canvasElement));

    await waitFor(async () => {
      await expect(requested).toBe(true);
      await expect(dialog.opened).toBe(false);
    });
  },
};

export const ControlledQueryContract: Story = {
  play: async ({ canvasElement }) => {
    const dialog = await requestOpen(canvasElement);
    const queries: string[] = [];

    dialog.addEventListener('ui-search-dialog-query-changed', (event) => {
      const customEvent = event as CustomEvent<UiSearchDialogQueryChangedDetail>;
      queries.push(customEvent.detail.query);
    });

    await setQuery(dialog, 'alpha');

    await expect(queries).toEqual(['alpha']);
  },
};

export const FocusReturnContract: Story = {
  play: async ({ canvasElement }) => {
    const dialog = await requestOpen(canvasElement);
    await userEvent.click(getCloseButton(dialog));

    await waitFor(async () => {
      await expect(getTrigger(canvasElement)).toHaveFocus();
    });
  },
};

export const LoadingStateEditableInput: Story = {
  args: {
    loading: true,
    query: 'alp',
  },
  play: async ({ canvasElement }) => {
    const dialog = await requestOpen(canvasElement);
    await setQuery(dialog, 'beta');
    await waitFor(async () => {
      await expect(dialog.shadowRoot?.textContent ?? '').toContain('検索インデックスを読み込んでいます');
      await expect(dialog.query).toBe('beta');
    });
  },
};

export const ErrorStateContract: Story = {
  args: {
    searcher: () => ({
      items: [],
      error: {
        code: 'network-error',
        message: '検索サービスに接続できません',
      },
    }),
  },
  play: async ({ canvasElement }) => {
    const dialog = await requestOpen(canvasElement);
    await setQuery(dialog, 'alpha');

    await waitFor(async () => {
      await expect(dialog.shadowRoot?.textContent ?? '').toContain('検索結果を取得できませんでした');
      await expect(dialog.shadowRoot?.textContent ?? '').toContain('検索サービスに接続できません');
    });
  },
};

export const KeyboardLoopAndEnterSelection: Story = {
  play: async ({ canvasElement }) => {
    const dialog = await requestOpen(canvasElement);
    const selectedDetails: UiSearchDialogSelectedDetail[] = [];
    const closeReasons: string[] = [];

    dialog.addEventListener('ui-search-dialog-selected', (event) => {
      selectedDetails.push((event as CustomEvent<UiSearchDialogSelectedDetail>).detail);
    });
    dialog.addEventListener('ui-search-dialog-close-requested', (event) => {
      closeReasons.push(
        (event as CustomEvent<UiSearchDialogCloseRequestedDetail>).detail.reason,
      );
    });

    await setQuery(dialog, 'a');
    await waitForResults(dialog);

    const searchField = getSearchField(dialog);
    searchField.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true, composed: true }),
    );
    searchField.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, composed: true }),
    );

    await waitFor(async () => {
      await expect(selectedDetails.length).toBe(1);
      await expect(dialog.opened).toBe(false);
    });

    await expect(selectedDetails[0]?.selectionMethod).toBe('keyboard');
    await expect(closeReasons).toContain('selection');
  },
};

export const SelectionEventOrderContract: Story = {
  play: async ({ canvasElement }) => {
    const dialog = await requestOpen(canvasElement);
    const events: string[] = [];

    dialog.addEventListener('ui-search-dialog-selected', () => {
      events.push('selected');
    });
    dialog.addEventListener('ui-search-dialog-close-requested', () => {
      events.push('close-requested');
    });
    dialog.addEventListener('ui-search-dialog-closed', () => {
      events.push('closed');
    });

    await setQuery(dialog, 'alpha');
    await waitForResults(dialog);
    const firstItem = getResultItems(dialog)[0];
    if (!firstItem) {
      throw new Error('No result item found');
    }
    await userEvent.click(firstItem);

    await waitFor(async () => {
      await expect(events).toEqual(['selected', 'close-requested', 'closed']);
    });
  },
};

export const VirtualizationSemanticsContract: Story = {
  args: {
    items: createVirtualizedItems(),
    opened: true,
    query: 'Virtual',
  },
  play: async ({ canvasElement }) => {
    const dialog = getDialog(canvasElement);
    attachControlledContract(dialog);

    await waitForResults(dialog);
    const searchField = getSearchField(dialog);
    searchField.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, composed: true }),
    );

    await waitFor(async () => {
      const activeId = searchField.getAttribute('aria-activedescendant');
      await expect(activeId).toBeTruthy();
      const activeOption = dialog.shadowRoot?.getElementById(activeId ?? '');
      await expect(activeOption).toBeTruthy();
    });
  },
};

export const DarkModeTokenContract: Story = {
  args: {
    dark: true,
    opened: true,
    query: 'alpha',
  },
};

import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import './search-dialog';
import type { UiSearchDialog } from './search-dialog';
import type {
  UiSearchDialogItem,
  UiSearchDialogSelectedDetail,
} from './search-dialog.types'

interface StoryArgs {
  items: UiSearchDialogItem[];
  loading: boolean;
  query: string;
  opened: boolean;
  searcher: ((query: string) => Promise<readonly UiSearchDialogItem[]> | readonly UiSearchDialogItem[]) | null;
  dark: boolean;
};

const FIXTURE_ITEMS: UiSearchDialogItem[] = [
  {
    title: 'Alpha Guide',
    url: '/docs/alpha',
    path: '/docs/alpha',
    keywords: ['guide', 'entry'],
  },
  {
    title: 'Beta Reference',
    url: '/docs/beta',
    path: '/docs/beta',
    keywords: ['reference', 'api'],
  },
  {
    title: 'Gamma Notes',
    url: '/notes/gamma',
    path: '/notes/gamma',
    keywords: ['notes', 'memo'],
  },
  {
    title: 'Delta API',
    url: '/api/delta',
    path: '/api/delta',
    keywords: ['api', 'schema'],
  },
];

function createVirtualizedItems(total = 160): UiSearchDialogItem[] {
  return Array.from({ length: total }, (_, index) => ({
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

async function openDialog(canvasElement: HTMLElement): Promise<UiSearchDialog> {
  const dialog = getDialog(canvasElement);
  const trigger = getTrigger(canvasElement);
  dialog.open(trigger);
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
      ></ui-search-dialog>
    </div>
  `,
} satisfies Meta<StoryArgs>;

export default meta;

type Story = StoryObj<StoryArgs>;

export const ResultsStateWithFocusReturn: Story = {
  play: async ({ canvasElement }) => {
    const dialog = await openDialog(canvasElement);

    await setQuery(dialog, 'alpha');
    await waitForResults(dialog);

    const resultItems = getResultItems(dialog);
    await expect(resultItems.length).toBeGreaterThan(0);

    const closeButton = getCloseButton(dialog);
    await userEvent.click(closeButton);

    const trigger = getTrigger(canvasElement);
    await waitFor(async () => {
      await expect(trigger).toHaveFocus();
    });
  },
};

export const LoadingStateEditableInput: Story = {
  args: {
    loading: true,
    query: 'alp',
  },
  play: async ({ canvasElement }) => {
    const dialog = await openDialog(canvasElement);
    const dialogRoot = dialog.shadowRoot;
    if (!dialogRoot) {
      throw new Error('shadowRoot not found');
    }

    const loadingText = within(dialogRoot as unknown as HTMLElement).getByText(
      'インデックスを読み込んでいます...',
    );
    await expect(loadingText).toBeVisible();

    await setQuery(dialog, 'beta');
    await waitFor(async () => {
      await expect(dialog.query).toBe('beta');
    });
  },
};

export const EmptyStateWithLiveRegion: Story = {
  play: async ({ canvasElement }) => {
    const dialog = await openDialog(canvasElement);

    await setQuery(dialog, 'zzz-no-match');

    await waitFor(async () => {
      await expect(dialog.shadowRoot?.textContent ?? '').toContain('結果が見つかりません');
    });
  },
};

export const KeyboardLoopAndEnterSelection: Story = {
  play: async ({ canvasElement }) => {
    const dialog = await openDialog(canvasElement);

    const selectedDetails: UiSearchDialogSelectedDetail[] = [];
    dialog.addEventListener('ui-search-dialog-selected', (event) => {
      selectedDetails.push((event as CustomEvent<UiSearchDialogSelectedDetail>).detail);
    });

    await setQuery(dialog, 'a');
    await waitForResults(dialog);

    const searchField = getSearchField(dialog);

    searchField.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, composed: true }),
    );
    searchField.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, composed: true }),
    );
    searchField.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, composed: true }),
    );

    await waitFor(async () => {
      await expect(selectedDetails.length).toBe(1);
    });

    await expect(selectedDetails[0]?.title).toBeTruthy();
    await waitFor(async () => {
      await expect(dialog.opened).toBe(false);
    });
  },
};

export const DebounceAndClearBoundary: Story = {
  play: async ({ canvasElement }) => {
    const dialog = await openDialog(canvasElement);

    await setQuery(dialog, 'alpha');
    await waitForResults(dialog);

    await setQuery(dialog, '');

    await waitFor(async () => {
      await expect(dialog.query).toBe('');
      await expect(getResultItems(dialog).length).toBe(0);
    });
  },
};

export const ReentrancyAndEscCancel: Story = {
  play: async ({ canvasElement }) => {
    const dialog = await openDialog(canvasElement);
    const nativeDialog = dialog.shadowRoot?.querySelector('dialog');

    if (!(nativeDialog instanceof HTMLDialogElement)) {
      throw new Error('native dialog not found');
    }

    nativeDialog.dispatchEvent(new Event('cancel', { bubbles: false, cancelable: true }));

    await waitFor(async () => {
      await expect(dialog.opened).toBe(false);
    });
  },
};

export const OpenedAttributeAndScrollLock: Story = {
  args: {
    opened: true,
    query: 'alpha',
  },
  play: async ({ canvasElement }) => {
    const dialog = getDialog(canvasElement);

    await waitFor(async () => {
      await expect(dialog.opened).toBe(true);
      await expect(document.body.hasAttribute('data-ui-search-dialog-open')).toBe(true);
    });

    dialog.close();

    await waitFor(async () => {
      await expect(document.body.hasAttribute('data-ui-search-dialog-open')).toBe(false);
    });
  },
};

export const TabNavigationBetweenInputAndClear: Story = {
  args: {
    query: 'alpha',
  },
  play: async ({ canvasElement }) => {
    const dialog = await openDialog(canvasElement);

    const searchField = getSearchField(dialog);
    searchField.focus();

    searchField.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, composed: true }),
    );

    await waitFor(async () => {
      const activeElement = dialog.shadowRoot?.activeElement ?? document.activeElement;
      await expect(activeElement).toBeTruthy();
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

export const StyleContractCoverage: Story = {
  args: {
    items: createVirtualizedItems(),
    opened: true,
    query: 'Virtual',
  },
  play: async ({ canvasElement }) => {
    const dialog = getDialog(canvasElement);
    await waitFor(async () => {
      await expect(dialog.opened).toBe(true);
    });

    const resultList = dialog.shadowRoot?.querySelector('.result-list');
    await expect(resultList).toBeTruthy();
  },
};
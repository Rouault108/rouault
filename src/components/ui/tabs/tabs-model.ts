import type {
  ResolveSelectionInput,
  ResolveSelectionResult,
  TabsKeyNavigationInput,
  TabsKeyNavigationResult,
} from './tabs.types.js';

export function getInteractiveCount(
  tabs: readonly HTMLElement[],
  panels: readonly HTMLElement[],
): number {
  return Math.min(tabs.length, panels.length);
}

export function findTabIndexByValue(
  tabs: readonly HTMLElement[],
  value: string,
  count = tabs.length,
): number {
  return tabs.slice(0, count).findIndex((tab) => tab.getAttribute('value') === value);
}

export function resolveSelectedIndex(
  input: ResolveSelectionInput,
  findIndex: (value: string) => number,
): ResolveSelectionResult {
  const {
    selectedValue,
    defaultSelectedValue,
    currentActiveIndex,
    initialized,
    count,
    urlValue,
    urlSource,
  } = input;

  if (count <= 0) {
    return {
      index: -1,
      source: 'fallback',
      warning: null,
    };
  }

  let warning: string | null = null;

  if (urlValue !== null) {
    const urlIndex = findIndex(urlValue);
    if (urlIndex !== -1) {
      return {
        index: urlIndex,
        source: urlSource ?? 'query',
        warning: null,
      };
    }

    if (urlSource === 'query') {
      warning = `[ui-tabs]: ?tab=${urlValue} が有効なタブに一致しません。先頭タブ (index=0) を選択します。`;
    }
  }

  if (selectedValue !== null) {
    const selectedIndex = findIndex(selectedValue);
    if (selectedIndex !== -1) {
      return {
        index: selectedIndex,
        source: 'selected-value',
        warning: null,
      };
    }

    warning = `[ui-tabs]: selected-value="${selectedValue}" が有効なタブに一致しません。先頭タブ (index=0) を選択します。`;
  } else if (!initialized && defaultSelectedValue !== null) {
    const defaultIndex = findIndex(defaultSelectedValue);
    if (defaultIndex !== -1) {
      return {
        index: defaultIndex,
        source: 'default-selected-value',
        warning: null,
      };
    }

    warning = `[ui-tabs]: default-selected-value="${defaultSelectedValue}" が有効なタブに一致しません。先頭タブ (index=0) を選択します。`;
  } else if (initialized && currentActiveIndex >= 0 && currentActiveIndex < count) {
    return {
      index: currentActiveIndex,
      source: 'current',
      warning: null,
    };
  }

  return {
    index: 0,
    source: 'fallback',
    warning,
  };
}

export function resolveKeyNavigation(input: TabsKeyNavigationInput): TabsKeyNavigationResult {
  const { key, currentIndex, count, orientation } = input;

  if (count <= 0 || currentIndex < 0 || currentIndex >= count) {
    return {
      kind: 'none',
      nextIndex: null,
    };
  }

  const prevKey = orientation === 'horizontal' ? 'ArrowLeft' : 'ArrowUp';
  const nextKey = orientation === 'horizontal' ? 'ArrowRight' : 'ArrowDown';

  switch (key) {
    case prevKey:
      return {
        kind: 'move-focus',
        nextIndex: (currentIndex - 1 + count) % count,
      };

    case nextKey:
      return {
        kind: 'move-focus',
        nextIndex: (currentIndex + 1) % count,
      };

    case 'Home':
      return {
        kind: 'move-focus',
        nextIndex: 0,
      };

    case 'End':
      return {
        kind: 'move-focus',
        nextIndex: count - 1,
      };

    case 'Enter':
    case ' ':
      return {
        kind: 'activate-focused',
        nextIndex: currentIndex,
      };

    default:
      return {
        kind: 'none',
        nextIndex: null,
      };
  }
}

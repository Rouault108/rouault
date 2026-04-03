import type { TabsOrientation, TabsSnapshot } from './tabs.types.js';
import { getInteractiveCount } from './tabs-model.js';

export function readTabsSnapshot(
  tabSlot: HTMLSlotElement | null,
  panelSlot: HTMLSlotElement | null,
): TabsSnapshot {
  const tabs = (tabSlot?.assignedElements() ?? []).filter(
    (el): el is HTMLElement => el instanceof HTMLElement,
  );

  const panels = (panelSlot?.assignedElements() ?? []).filter(
    (el): el is HTMLElement => el instanceof HTMLElement,
  );

  return {
    tabs,
    panels,
    interactiveCount: getInteractiveCount(tabs, panels),
  };
}

export function readTabsSnapshotFromLightDom(host: HTMLElement): TabsSnapshot {
  const tabs = Array.from(host.children).filter(
    (el): el is HTMLElement => el instanceof HTMLElement && el.getAttribute('slot') === 'tab',
  );
  const panels = Array.from(host.children).filter(
    (el): el is HTMLElement => el instanceof HTMLElement && el.getAttribute('slot') === 'panel',
  );

  return {
    tabs,
    panels,
    interactiveCount: getInteractiveCount(tabs, panels),
  };
}

export function validateTabsSnapshot(
  snapshot: TabsSnapshot,
  warn: (message: string) => void,
): void {
  if (snapshot.tabs.length === snapshot.panels.length) {
    return;
  }

  warn(
    `[ui-tabs]: slot="tab" (${String(snapshot.tabs.length)}) と slot="panel" (${String(snapshot.panels.length)}) の数が一致しません。先頭から ${String(snapshot.interactiveCount)} 件のみ有効化します。`,
  );
}

export function applyTabsAria(
  snapshot: TabsSnapshot,
  uid: number,
  activeIndex: number,
  focusedIndex: number,
): void {
  const { tabs, panels, interactiveCount } = snapshot;

  const panelIds = panels.map((panel, i) => {
    if (!panel.getAttribute('id')) {
      panel.setAttribute('id', `ui-tabs-${String(uid)}-panel-${String(i)}`);
    }
    return panel.getAttribute('id') ?? `ui-tabs-${String(uid)}-panel-${String(i)}`;
  });

  tabs.forEach((tab, i) => {
    tab.setAttribute('role', 'tab');

    if (!tab.getAttribute('id')) {
      tab.setAttribute('id', `ui-tabs-${String(uid)}-tab-${String(i)}`);
    }

    if (i < interactiveCount) {
      tab.setAttribute('aria-controls', panelIds[i] ?? `ui-tabs-${String(uid)}-panel-${String(i)}`);
    } else {
      tab.removeAttribute('aria-controls');
    }

    tab.setAttribute('aria-selected', i === activeIndex && i < interactiveCount ? 'true' : 'false');
    tab.setAttribute('tabindex', i === focusedIndex && i < interactiveCount ? '0' : '-1');
  });

  panels.forEach((panel, i) => {
    panel.setAttribute('role', 'tabpanel');

    const tabId = tabs[i]?.getAttribute('id') ?? `ui-tabs-${String(uid)}-tab-${String(i)}`;

    if (i < interactiveCount) {
      panel.setAttribute('aria-labelledby', tabId);
    } else {
      panel.removeAttribute('aria-labelledby');
    }

    if (!panel.hasAttribute('aria-busy')) {
      panel.setAttribute('aria-busy', 'false');
    }

    if (!panel.hasAttribute('aria-live')) {
      panel.setAttribute('aria-live', 'off');
    }
  });
}

export function switchPanels(
  panels: readonly HTMLElement[],
  newIndex: number,
  oldIndex: number,
  hideFallbackTimers: Map<HTMLElement, number>,
): void {
  const newPanel = panels[newIndex];
  const oldPanel = panels[oldIndex];

  panels.forEach((panel, i) => {
    if (i !== newIndex && i !== oldIndex) {
      panel.removeAttribute('data-panel-active');
      panel.setAttribute('aria-hidden', 'true');
      panel.setAttribute('hidden', '');
    }
  });

  if (newPanel) {
    newPanel.removeAttribute('hidden');
    newPanel.removeAttribute('aria-hidden');

    requestAnimationFrame(() => {
      newPanel.setAttribute('data-panel-active', '');
    });
  }

  if (oldPanel && oldPanel !== newPanel) {
    oldPanel.removeAttribute('hidden');
    oldPanel.removeAttribute('data-panel-active');
    oldPanel.setAttribute('aria-hidden', 'true');

    const existingTimer = hideFallbackTimers.get(oldPanel);
    if (existingTimer !== undefined) {
      clearTimeout(existingTimer);
      hideFallbackTimers.delete(oldPanel);
    }

    const onTransitionEnd = (): void => {
      oldPanel.setAttribute('hidden', '');

      const timer = hideFallbackTimers.get(oldPanel);
      if (timer !== undefined) {
        clearTimeout(timer);
        hideFallbackTimers.delete(oldPanel);
      }
    };

    oldPanel.addEventListener('transitionend', onTransitionEnd, { once: true });

    const timer = window.setTimeout(() => {
      if (!oldPanel.hasAttribute('hidden')) {
        oldPanel.setAttribute('hidden', '');
      }
      hideFallbackTimers.delete(oldPanel);
    }, 250);

    hideFallbackTimers.set(oldPanel, timer);
  } else if (oldPanel && oldPanel === newPanel) {
    oldPanel.removeAttribute('hidden');
    oldPanel.removeAttribute('aria-hidden');
    oldPanel.setAttribute('data-panel-active', '');
  }
}

export function scrollTabElementIntoView(
  container: HTMLElement,
  tabEl: HTMLElement,
  orientation: TabsOrientation,
): void {
  if (tabEl.getClientRects().length === 0 || container.getClientRects().length === 0) {
    return;
  }

  const containerRect = container.getBoundingClientRect();
  const tabRect = tabEl.getBoundingClientRect();

  if (orientation === 'vertical') {
    if (tabRect.top < containerRect.top) {
      container.scrollTop -= Math.ceil(containerRect.top - tabRect.top);
    } else if (tabRect.bottom > containerRect.bottom) {
      container.scrollTop += Math.ceil(tabRect.bottom - containerRect.bottom);
    }
    return;
  }

  if (tabRect.left < containerRect.left) {
    container.scrollLeft -= Math.ceil(containerRect.left - tabRect.left);
  } else if (tabRect.right > containerRect.right) {
    container.scrollLeft += Math.ceil(tabRect.right - containerRect.right);
  }
}

import { describe, expect, it } from 'vitest';
import { scrollTabElementIntoView } from '../../src/components/ui/tabs/tabs-dom.js';
import { activateTabs, selectTabsValue } from '../../src/client/post-hydrate/tabs-enhancer.js';
import { fixture, fixtureAbortController, requireFixtureValue } from './harness/browser-fixture.js';
import { element, nativeNoteFixture, text } from './harness/native-note-fixture.js';

describe('native tabs DOM lifecycle', () => {
  it('cleanup は fragment baseline を復元し、旧listenerを残さず再起動できる', async () => {
    const root = await nativeNoteFixture(
      element('ui-tabs', {}, [
        element('div', { slot: 'tab', value: 'one' }, [text('One')]),
        element('div', { slot: 'panel' }, [text('First')]),
        element('div', { slot: 'tab', value: 'two' }, [text('Two')]),
        element('div', { slot: 'panel' }, [text('Second')]),
      ]),
    );
    const links = [...root.querySelectorAll<HTMLAnchorElement>('a[data-tab]')];
    const panels = [...root.querySelectorAll<HTMLElement>('[data-tab-panel]')];
    const ids = [...links, ...panels].map((node) => node.id);
    const lifetime = fixtureAbortController(root);
    const first = activateTabs(root, lifetime.signal);
    expect(first.status).toBe('activated');
    if (first.status !== 'activated') throw new Error('activation failed');
    if (typeof first.cleanup !== 'function') throw new Error('cleanup missing');
    first.cleanup();
    expect(lifetime.signal.aborted).toBe(false);
    expect(selectTabsValue(root, 'two', { historyMode: 'none' })).toBe('not-enhanced');
    expect(panels.every((panel) => !panel.hidden)).toBe(true);
    expect(root.querySelector('[role=tab]')).toBeNull();
    const click = new MouseEvent('click', { bubbles: true, cancelable: true });
    requireFixtureValue(links[1]).dispatchEvent(click);
    expect(click.defaultPrevented).toBe(false);
    const second = activateTabs(root, lifetime.signal);
    expect(second.status).toBe('activated');
    expect([...links, ...panels].map((node) => node.id)).toEqual(ids);
    const mutations: MutationRecord[] = [];
    const observer = new MutationObserver((records) => mutations.push(...records));
    observer.observe(root, { attributes: true, subtree: true });
    expect(selectTabsValue(root, 'one', { historyMode: 'none' })).toBe('unchanged');
    await Promise.resolve();
    observer.disconnect();
    expect(mutations).toEqual([]);
    let changes = 0;
    root.addEventListener('ui-tab-change', () => {
      changes += 1;
    });
    requireFixtureValue(links[1]).click();
    expect(changes).toBe(1);
    expect(panels[0]?.hidden).toBe(true);
    lifetime.abort();
    expect(panels.every((panel) => !panel.hidden)).toBe(true);
  });

  it.each(['horizontal', 'vertical'] as const)(
    '%s の表示範囲外tabだけをscrollする',
    async (orientation) => {
      const vertical = orientation === 'vertical';
      const container = await fixture(
        `<div style="width:100px;height:100px;overflow:auto;display:flex;flex-direction:${vertical ? 'column' : 'row'}"><a style="flex:none;width:100px;height:100px">One</a><a style="flex:none;width:100px;height:100px">Two</a></div>`,
      );
      const first = requireFixtureValue(container.firstElementChild);
      const last = requireFixtureValue(container.lastElementChild);
      if (!(first instanceof HTMLElement) || !(last instanceof HTMLElement))
        throw new Error('tab missing');
      scrollTabElementIntoView(container, first, orientation);
      expect(vertical ? container.scrollTop : container.scrollLeft).toBe(0);
      scrollTabElementIntoView(container, last, orientation);
      expect(vertical ? container.scrollTop : container.scrollLeft).toBeGreaterThan(0);
      scrollTabElementIntoView(container, first, orientation);
      expect(vertical ? container.scrollTop : container.scrollLeft).toBe(0);
    },
  );
});

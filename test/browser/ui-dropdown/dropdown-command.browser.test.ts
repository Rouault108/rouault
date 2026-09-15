import { html } from 'lit/static-html.js';
import { describe, expect, it } from 'vitest';
import { fixture } from '../harness/browser-fixture.js';
import { dispatchKey, waitForCondition } from '../harness/browser-test-utilities.js';
import '../../../src/components/ui/dropdown/dropdown.js';
import type { Dropdown, MenuItem } from '../../../src/components/ui/dropdown/dropdown.js';

describe('retained dropdown command contract', () => {
  for (const key of ['Enter', ' ']) {
    it(`${key}でcommandを1回選択し、閉鎖後triggerへfocusを返すこと`, async () => {
      const dropdown = await fixture<Dropdown>(html`
        <ui-dropdown>
          <button slot="trigger">Playback</button>
          <ui-menu-item disabled value="unavailable">Unavailable</ui-menu-item>
          <ui-menu-item value="normal">Normal speed</ui-menu-item>
        </ui-dropdown>
      `);
      const trigger = dropdown.getTriggerElement();
      const item = dropdown.querySelector<MenuItem>('ui-menu-item[value="normal"]');
      if (!trigger || !item) throw new Error('command fixture is incomplete');
      const selections: unknown[] = [];
      dropdown.addEventListener('menu-item-select', (event: Event) => {
        if (event instanceof CustomEvent) selections.push(event.detail);
      });
      trigger.focus();
      dispatchKey(trigger, 'ArrowDown');
      await waitForCondition(
        () => item.shadowRoot?.activeElement instanceof HTMLButtonElement,
        'enabled command receives focus after positioning',
      );
      const button = item.shadowRoot?.querySelector('button');
      if (!button) throw new Error('command button is missing');
      dispatchKey(button, key);
      await dropdown.updateComplete;
      expect(selections).toEqual([{ value: 'normal', label: 'Normal speed' }]);
      expect(dropdown.opened).toBe(false);
      expect(document.activeElement).toBe(trigger);
    });
  }
});

import { expect, fixture, html } from '@open-wc/testing';
import '../../src/components/ui/details/details.js';
import type { Details } from '../../src/components/ui/details/details.js';
import { waitForLitUpdate } from './helpers/wait-for-lit.js';

interface ToggleDetail {
  open: boolean;
}

const getTrigger = (host: Details): HTMLButtonElement | null =>
  host.shadowRoot?.querySelector<HTMLButtonElement>('button.trigger') ?? null;

const getContentWrapper = (host: Details): HTMLElement | null =>
  host.shadowRoot?.querySelector<HTMLElement>('.content-wrapper') ?? null;

const getSummarySlotContent = (host: Details): string =>
  (host.querySelector<HTMLElement>('[slot="summary"]')?.textContent ?? '')
    .replace(/\s+/g, ' ')
    .trim();

const expectPresent = <T>(value: T | null | undefined, name: string): T => {
  expect(value, `${name} should exist`).to.not.equal(null);
  expect(value, `${name} should exist`).to.not.equal(undefined);

  if (value === null || value === undefined) {
    throw new Error(`${name} が見つかりません`);
  }

  return value;
};

const waitForToggleEvent = (target: EventTarget): Promise<CustomEvent<ToggleDetail>> =>
  new Promise((resolve) => {
    target.addEventListener(
      'toggle',
      ((event: Event) => {
        resolve(event as CustomEvent<ToggleDetail>);
      }) as EventListener,
      { once: true },
    );
  });

describe('ui-details browser contract', () => {
  it('click で open / aria / inert / toggle event を同期すること', async () => {
    const wrapper = await fixture<HTMLDivElement>(html`
      <div>
        <ui-details id="details" summary="補足情報">
          <p>詳細本文</p>
        </ui-details>
      </div>
    `);

    const host = expectPresent(wrapper.querySelector<Details>('#details'), 'host');
    await waitForLitUpdate(host);

    const trigger = expectPresent(getTrigger(host), 'trigger');
    const content = expectPresent(getContentWrapper(host), 'content');

    let bubbledCount = 0;
    wrapper.addEventListener('toggle', () => {
      bubbledCount += 1;
    });

    const openEventPromise = waitForToggleEvent(host);
    trigger.click();
    const openEvent = await openEventPromise;
    await waitForLitUpdate(host);

    expect(openEvent.detail.open).to.equal(true);
    expect(host.open).to.equal(true);
    expect(trigger.getAttribute('aria-expanded')).to.equal('true');
    expect(content.getAttribute('aria-hidden')).to.equal('false');
    expect(content.hasAttribute('inert')).to.equal(false);
    expect(bubbledCount).to.equal(1);

    const closeEventPromise = waitForToggleEvent(host);
    trigger.click();
    const closeEvent = await closeEventPromise;
    await waitForLitUpdate(host);

    expect(closeEvent.detail.open).to.equal(false);
    expect(host.open).to.equal(false);
    expect(trigger.getAttribute('aria-expanded')).to.equal('false');
    expect(content.getAttribute('aria-hidden')).to.equal('true');
    expect(content.hasAttribute('inert')).to.equal(true);
    expect(bubbledCount).to.equal(2);
  });

  it('region=true では content wrapper を landmark として公開すること', async () => {
    const host = await fixture<Details>(html`
      <ui-details region summary="節の補足">
        <p>本文</p>
      </ui-details>
    `);

    await waitForLitUpdate(host);

    const trigger = expectPresent(getTrigger(host), 'trigger');
    const content = expectPresent(getContentWrapper(host), 'content');

    expect(content.getAttribute('role')).to.equal('region');
    expect(content.getAttribute('aria-labelledby')).to.equal(trigger.id);
  });

  it('icon-only 利用では aria-label を trigger に反映すること', async () => {
    const host = await fixture<Details>(html`
      <ui-details aria-label="追加情報を表示">
        <p>詳細</p>
      </ui-details>
    `);

    await waitForLitUpdate(host);

    const trigger = expectPresent(getTrigger(host), 'trigger');
    expect(trigger.getAttribute('aria-label')).to.equal('追加情報を表示');
  });

  it('summary slot がある場合は summary property より slot content を優先すること', async () => {
    const host = await fixture<Details>(html`
      <ui-details summary="property summary" open>
        <span slot="summary"><strong>slot summary</strong> を優先</span>
        <p>本文</p>
      </ui-details>
    `);

    await waitForLitUpdate(host);

    expect(getSummarySlotContent(host)).to.equal('slot summary を優先');
  });

  it('可視 summary がある場合は aria-label を trigger に反映しないこと', async () => {
    const host = await fixture<Details>(html`
      <ui-details summary="補足情報" aria-label="これは無視される">
        <p>本文</p>
      </ui-details>
    `);

    await waitForLitUpdate(host);

    const trigger = expectPresent(getTrigger(host), 'trigger');
    expect(trigger.hasAttribute('aria-label')).to.equal(false);
  });

  it('icon-only かつ aria-label なしでは console.error を出すこと', async () => {
    const originalError = console.error;
    const errors: unknown[][] = [];

    console.error = (...args: unknown[]) => {
      if (String(args[0]).includes('[ui-details]')) {
        errors.push(args);
      }
    };

    try {
      const host = await fixture<Details>(html`
        <ui-details>
          <p>本文</p>
        </ui-details>
      `);

      await waitForLitUpdate(host);

      const trigger = expectPresent(getTrigger(host), 'trigger');
      expect(trigger.hasAttribute('aria-label')).to.equal(false);
    } finally {
      console.error = originalError;
    }

    expect(errors.length).to.be.greaterThan(0);
    expect(String(errors[0]?.[0] ?? '').includes('aria-label')).to.equal(true);
  });
});

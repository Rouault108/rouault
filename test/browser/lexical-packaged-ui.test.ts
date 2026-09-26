import { expect, it, vi } from 'vitest';

it('bundled Worker preserves actual dialog input/close/focus and drops stale responses', async () => {
  const frame = document.createElement('iframe');
  frame.src = '/__search-packaged/index.html';
  document.body.append(frame);
  try {
    await vi.waitFor(() => expect(frame.contentDocument?.body.dataset['ready']).toBe('true'), {
      timeout: 15000,
    });
    const doc = frame.contentDocument;
    if (!doc) throw new Error('Frame');
    const trigger = doc.querySelector<HTMLButtonElement>('#open'),
      input = doc.querySelector<HTMLInputElement>('[data-search-dialog-input]'),
      close = doc.querySelector<HTMLButtonElement>('[data-search-dialog-close]'),
      dialog = doc.querySelector('dialog');
    if (!trigger || !input || !close || !dialog) throw new Error('Fixture DOM');
    const state = (): Record<string, unknown> => {
      const value: unknown = JSON.parse(doc.querySelector('#state')?.textContent ?? '{}');
      if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('State');
      return Object.fromEntries(Object.entries(value));
    };
    const type = (text: string): void => {
      input.value = text;
      input.dispatchEvent(new Event('input', { bubbles: true }));
    };
    trigger.click();
    type('boxing コピー');
    await vi.waitFor(() => expect(state()['started']).toBe(1));
    close.click();
    await vi.waitFor(() => expect(dialog.open).toBe(false));
    await vi.waitFor(() => expect(doc.activeElement).toBe(trigger));
    expect(state()['closedPending']).toBe(true);
    await vi.waitFor(() => expect(state()['aborted']).toBe(1));
    trigger.click();
    type('global.json');
    type('LangVersion');
    await vi.waitFor(() => expect(state()['lastQuery']).toBe('LangVersion'), { timeout: 60000 });
    expect(state()['committed']).toBe(1);
    expect(state()['errors']).toEqual([]);
    expect(state()['total']).toBeGreaterThan(0);
    close.click();
    await vi.waitFor(() => expect(doc.activeElement).toBe(trigger));
  } finally {
    frame.remove();
  }
}, 90000);

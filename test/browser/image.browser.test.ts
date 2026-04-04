import { expect, fixture, html } from '@open-wc/testing';
import '../../src/components/ui/image/image.js';
import type { UiImage } from '../../src/components/ui/image/image.js';
import { waitForLitUpdate, waitMs } from './helpers/wait-for-lit.js';

const SAMPLE_DATA_URI = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';

const expectPresent = <T>(value: T | null | undefined, name: string): T => {
  expect(value, `${name} should exist`).to.not.equal(null);
  expect(value, `${name} should exist`).to.not.equal(undefined);

  if (value === null || value === undefined) {
    throw new Error(`${name} が見つかりません`);
  }

  return value;
};

const flush = async (host: UiImage): Promise<void> => {
  await waitForLitUpdate(host);
  await waitMs(0);
  await waitForLitUpdate(host);
};

const waitUntil = async (
  predicate: () => boolean,
  timeoutMs = 2000,
  intervalMs = 20,
  message = 'condition not met',
): Promise<void> => {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (predicate()) {
      return;
    }
    await waitMs(intervalMs);
  }

  throw new Error(message);
};

const getTrigger = (host: UiImage): HTMLButtonElement =>
  expectPresent(host.shadowRoot?.querySelector<HTMLButtonElement>('button.trigger'), 'trigger');

const getThumbnail = (host: UiImage): HTMLImageElement =>
  expectPresent(
    host.shadowRoot?.querySelector<HTMLImageElement>('img.thumbnail-image'),
    'thumbnail',
  );

const waitForThumbnailLoad = async (thumbnail: HTMLImageElement): Promise<void> => {
  if (thumbnail.complete && thumbnail.naturalWidth > 0) {
    return;
  }

  await new Promise<void>((resolve) => {
    thumbnail.addEventListener('load', () => resolve(), { once: true });
  });
};

describe('ui-image browser contract', () => {
  it('src 未設定時は empty state を公開し、aria-busy=false のままであること', async () => {
    const host = await fixture<UiImage>(html` <ui-image alt="未設定画像"></ui-image> `);

    await flush(host);

    const figure = expectPresent(
      host.shadowRoot?.querySelector<HTMLElement>('figure.root'),
      'figure',
    );
    const fallback = expectPresent(
      host.shadowRoot?.querySelector<HTMLElement>('.error-fallback'),
      'empty fallback',
    );
    const trigger = expectPresent(
      host.shadowRoot?.querySelector<HTMLButtonElement>('button.trigger'),
      'trigger',
    );

    expect(figure.getAttribute('aria-busy')).to.equal('false');
    expect(fallback.textContent?.includes('画像が指定されていません')).to.equal(true);
    expect(trigger.disabled).to.equal(true);
    expect(trigger.getAttribute('aria-expanded')).to.equal('false');
  });

  it('load 後に openLightbox / Escape close / focus return / scroll lock を満たすこと', async () => {
    const host = await fixture<UiImage>(html`
      <ui-image
        src="${SAMPLE_DATA_URI}"
        alt="サンプル画像"
        caption="サンプルキャプション"
        width="640"
        height="360"
      ></ui-image>
    `);

    await flush(host);

    const trigger = getTrigger(host);
    const thumbnail = getThumbnail(host);

    thumbnail.dispatchEvent(new Event('load'));
    await flush(host);

    host.openLightbox();
    await flush(host);

    const lightbox = expectPresent(
      host.shadowRoot?.querySelector<HTMLElement>('.lightbox'),
      'lightbox',
    );
    const dialog = expectPresent(
      host.shadowRoot?.querySelector<HTMLElement>('.lightbox-dialog'),
      'dialog',
    );
    const closeButton = expectPresent(
      host.shadowRoot?.querySelector<HTMLButtonElement>('button.close-button'),
      'close button',
    );

    expect(lightbox.classList.contains('is-open')).to.equal(true);
    expect(lightbox.getAttribute('aria-hidden')).to.equal('false');
    expect(dialog.getAttribute('role')).to.equal('dialog');
    expect(document.body.style.overflow).to.equal('hidden');
    expect(host.shadowRoot?.activeElement).to.equal(closeButton);

    lightbox.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true,
        composed: true,
        cancelable: true,
      }),
    );
    await flush(host);
    await waitUntil(
      () => host.shadowRoot?.activeElement === trigger,
      2000,
      20,
      'focus が trigger へ戻りません',
    );

    expect(lightbox.classList.contains('is-open')).to.equal(false);
    expect(document.body.style.overflow).to.equal('');
    expect(host.shadowRoot?.activeElement).to.equal(trigger);
  });

  it('thumbnail error 後は error state になり、lightbox を開けないこと', async () => {
    const host = await fixture<UiImage>(html`
      <ui-image src="${SAMPLE_DATA_URI}" alt="壊れた画像"></ui-image>
    `);

    await flush(host);

    const thumbnail = getThumbnail(host);
    await waitForThumbnailLoad(thumbnail);
    await flush(host);

    thumbnail.dispatchEvent(new Event('error'));
    await flush(host);

    const fallback = expectPresent(
      host.shadowRoot?.querySelector<HTMLElement>('.error-fallback'),
      'error fallback',
    );
    const lightbox = expectPresent(
      host.shadowRoot?.querySelector<HTMLElement>('.lightbox'),
      'lightbox',
    );

    expect(fallback.textContent?.includes('画像を読み込めませんでした')).to.equal(true);

    host.openLightbox();
    await flush(host);

    expect(lightbox.classList.contains('is-open')).to.equal(false);
    expect(lightbox.getAttribute('aria-hidden')).to.equal('true');
  });
});

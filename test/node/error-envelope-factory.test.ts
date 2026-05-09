import { describe, expect, it } from 'vitest';

import { NOT_FOUND_PAGE_TITLE } from '../../src/components/not-found/not-found-page.js';
import { ErrorEnvelopeFactory } from '../../src/router/error-envelope-factory.js';

describe('ErrorEnvelopeFactory', () => {
  it('404 error envelope では document.title のみ文書タイトル化し announcedTitle は短いタイトルを維持すること', () => {
    const result = new ErrorEnvelopeFactory().createHttpErrorResult(404, '/missing/');

    expect(result.envelope.document.title).toBe(`${NOT_FOUND_PAGE_TITLE} - Rouault`);
    expect(result.envelope.document.announcedTitle).toBe(NOT_FOUND_PAGE_TITLE);
  });

  it('汎用 HTTP error envelope でも document.title と announcedTitle の責務を分離すること', () => {
    const result = new ErrorEnvelopeFactory().createHttpErrorResult(500, '/broken/');

    expect(result.envelope.document.title).toBe('500 - サーバーエラー - Rouault');
    expect(result.envelope.document.announcedTitle).toBe('500 - サーバーエラー');
  });

  it('通常 exception result でも document.title と announcedTitle の責務を分離すること', () => {
    const result = new ErrorEnvelopeFactory().createExceptionResult(new Error('boom'));

    expect(result.envelope.document.title).toBe('エラー - Rouault');
    expect(result.envelope.document.announcedTitle).toBe('エラー');
  });

  it('network exception result でも document.title と announcedTitle の責務を分離すること', () => {
    const result = new ErrorEnvelopeFactory().createExceptionResult(new TypeError('fetch failed'));

    expect(result.envelope.document.title).toBe('ネットワークエラー - Rouault');
    expect(result.envelope.document.announcedTitle).toBe('ネットワークエラー');
  });

  it('timeout exception result でも document.title と announcedTitle の責務を分離すること', () => {
    const error = new Error('timeout');
    error.name = 'TimeoutError';

    const result = new ErrorEnvelopeFactory().createExceptionResult(error);

    expect(result.envelope.document.title).toBe('タイムアウト - Rouault');
    expect(result.envelope.document.announcedTitle).toBe('タイムアウト');
  });
});

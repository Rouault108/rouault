import {
  buildNotFoundPageMarkup,
  NOT_FOUND_PAGE_META_DESCRIPTION,
  NOT_FOUND_PAGE_TITLE,
} from '../components/not-found/not-found-page.js';
import {
  NAVIGATION_ENVELOPE_SCHEMA_VERSION,
  type NavigationEnvelope,
} from '../../shared/navigation/navigation-envelope.js';
import type { LoadDocumentResult, NavigationLoadFailureReason } from './router-types.js';
import {
  NavigationEnvelopeContractError,
  NavigationEnvelopeMetadataMismatchError,
} from './navigation-envelope-errors.js';
import { buildDocumentTitle } from '../../shared/document-title.js';

const escapeHtml = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const createEnvelope = (document: NavigationEnvelope['document']): NavigationEnvelope => ({
  schemaVersion: NAVIGATION_ENVELOPE_SCHEMA_VERSION,
  buildId: undefined,
  generatedAt: undefined,
  document,
  shellProjection: null,
  hydrationPlan: null,
});

export class ErrorEnvelopeFactory {
  createHttpErrorResult(status: number, normalizedUrl: string): LoadDocumentResult {
    switch (status) {
      case 401:
        return this.createErrorResult('401 - 認証エラー', 'ログインが必要です。', 'auth', status);
      case 403:
        return this.createErrorResult(
          '403 - 権限エラー',
          'このページにアクセスする権限がありません。',
          'forbidden',
          status,
        );
      case 404:
        return this.createNotFoundResult(normalizedUrl);
      case 500:
        return this.createErrorResult(
          '500 - サーバーエラー',
          'サーバーで問題が発生しました。',
          'server',
          status,
        );
      case 503:
        return this.createErrorResult(
          '503 - サービス利用不可',
          '現在サービスを利用できません。しばらくしてからお試しください。',
          'service-unavailable',
          status,
        );
      default:
        return this.createErrorResult(
          `${String(status)} - エラー`,
          'ページの読み込みに失敗しました。',
          'unexpected',
          status,
        );
    }
  }

  createExceptionResult(error: unknown): LoadDocumentResult {
    if (error instanceof Error && (error.name === 'AbortError' || error.name === 'TimeoutError')) {
      return this.createErrorResult(
        'タイムアウト',
        'ページの読み込みがタイムアウトしました。',
        'timeout',
        undefined,
        error,
      );
    }

    if (error instanceof TypeError && error.message.includes('fetch')) {
      return this.createErrorResult(
        'ネットワークエラー',
        'ネットワーク接続を確認してください。',
        'network',
        undefined,
        error,
      );
    }

    if (error instanceof NavigationEnvelopeMetadataMismatchError) {
      return this.createErrorResult(
        'ビルド不整合',
        '表示中の文書と取得した router artifact の build metadata が一致しません。再読み込みしてください。',
        'unexpected',
        undefined,
        error,
      );
    }

    if (error instanceof NavigationEnvelopeContractError) {
      return this.createErrorResult(
        'router artifact 契約エラー',
        '取得した router artifact が NavigationEnvelope 契約を満たしていません。',
        'unexpected',
        undefined,
        error,
      );
    }

    return this.createErrorResult(
      'エラー',
      'ページの読み込みに失敗しました。',
      'unexpected',
      undefined,
      error instanceof Error ? error : undefined,
    );
  }

  private createNotFoundResult(normalizedUrl: string): LoadDocumentResult {
    return {
      envelope: createEnvelope({
        html: buildNotFoundPageMarkup({
          requestedPath: normalizedUrl,
        }),
        title: buildDocumentTitle(NOT_FOUND_PAGE_TITLE),
        description: NOT_FOUND_PAGE_META_DESCRIPTION,
        renderedKind: 'not-found',
        announcedTitle: NOT_FOUND_PAGE_TITLE,
      }),
      source: 'error-fallback',
    };
  }

  private createErrorResult(
    title: string,
    message: string,
    reason: NavigationLoadFailureReason,
    _statusCode?: number,
    error?: Error,
  ): LoadDocumentResult {
    return {
      envelope: createEnvelope({
        html: `
          <div class="error-page" role="alert" aria-live="assertive">
            <h1>${escapeHtml(title)}</h1>
            <p>${escapeHtml(message)}</p>
          </div>
        `.trim(),
        title: buildDocumentTitle(title),
        description: message,
        renderedKind: 'error',
        announcedTitle: title,
      }),
      source: 'error-fallback',
      error,
      errorReason: reason,
    };
  }
}

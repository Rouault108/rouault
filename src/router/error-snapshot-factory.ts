import {
  buildNotFoundPageMarkup,
  NOT_FOUND_PAGE_META_DESCRIPTION,
  NOT_FOUND_PAGE_TITLE,
} from '../components/not-found/not-found-page.js';
import type { DocumentSnapshot, LoadDocumentResult, NavigationErrorReason } from './router-types.js';
import { DocumentContractViolationError } from './document-snapshot-factory.js';

const SITE_TITLE = 'Rouault';

const escapeHtml = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const buildDocumentTitle = (pageTitle: string): string => {
  const normalized = pageTitle.trim();
  return normalized.length > 0 ? `${normalized} - ${SITE_TITLE}` : SITE_TITLE;
};

export class ErrorSnapshotFactory {
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

    if (error instanceof DocumentContractViolationError) {
      return this.createErrorResult(
        '文書契約エラー',
        'ページ構造が router の文書契約を満たしていません。',
        'unexpected',
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
      snapshot: this.createNotFoundSnapshot(normalizedUrl),
      source: 'fetch',
    };
  }

  private createNotFoundSnapshot(normalizedUrl: string): DocumentSnapshot {
    return {
      kind: 'not-found',
      title: buildDocumentTitle(NOT_FOUND_PAGE_TITLE),
      metaDescription: NOT_FOUND_PAGE_META_DESCRIPTION,
      html: buildNotFoundPageMarkup({
        requestedPath: normalizedUrl,
      }),
      shell: null,
      announcedTitle: NOT_FOUND_PAGE_TITLE,
    };
  }

  private createErrorResult(
    title: string,
    message: string,
    reason: Exclude<NavigationErrorReason, 'destroyed' | 'not-started'>,
    statusCode?: number,
    error?: Error,
  ): LoadDocumentResult {
    return {
      snapshot: {
        kind: 'error',
        reason,
        statusCode,
        title: buildDocumentTitle(title),
        metaDescription: message,
        html: `
          <div class="error-page" role="alert" aria-live="assertive">
            <h1>${escapeHtml(title)}</h1>
            <p>${escapeHtml(message)}</p>
          </div>
        `.trim(),
        shell: null,
        announcedTitle: title,
      },
      source: 'fetch',
      error,
      errorReason: reason,
    };
  }
}

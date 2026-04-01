import {
  buildNotFoundPageMarkup,
  NOT_FOUND_PAGE_META_DESCRIPTION,
  NOT_FOUND_PAGE_TITLE,
} from '../components/not-found/not-found-page.js';
import { LocationAdapter } from './location-adapter.js';
import { RouteRegistry } from './route-registry.js';
import type {
  DocumentRouteContext,
  DocumentSnapshot,
  NavigationErrorReason,
  ShellAdapter,
} from './router-types.js';

const SITE_TITLE = 'Rouault';

const escapeHtml = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const buildDocumentTitle = (pageTitle: string): string => {
  const normalized = pageTitle.trim();
  return normalized.length > 0 ? `${normalized} - ${SITE_TITLE}` : SITE_TITLE;
};

export interface LoadResult {
  snapshot: DocumentSnapshot;
  source: 'document-route' | 'fetch';
  error?: Error | undefined;
  errorReason?: Exclude<NavigationErrorReason, 'destroyed' | 'not-started'> | undefined;
}

export class ContentLoader {
  constructor(
    private routeRegistry: RouteRegistry,
    private location: LocationAdapter,
  ) {}

  async load(
    normalizedUrl: string,
    signal: AbortSignal,
    shellAdapter?: ShellAdapter,
  ): Promise<LoadResult> {
    const routeContext = this.createRouteContext(normalizedUrl, signal);
    const routeSnapshot = await this.routeRegistry.execute(routeContext);
    if (routeSnapshot !== null) {
      return {
        snapshot: routeSnapshot,
        source: 'document-route',
        errorReason: routeSnapshot.kind === 'error' ? routeSnapshot.reason : undefined,
      };
    }

    const response = await fetch(this.location.resolveContentUrl(normalizedUrl), { signal });
    if (!response.ok) {
      return this.createHttpErrorResult(response.status, normalizedUrl);
    }

    const text = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(text, 'text/html');
    const mainContent = doc.querySelector('main')?.innerHTML;

    if (!mainContent) {
      return {
        snapshot: this.createNotFoundSnapshot(normalizedUrl),
        source: 'fetch',
      };
    }

    const shell = shellAdapter?.extract ? await shellAdapter.extract(doc) : null;

    return {
      snapshot: {
        kind: 'page',
        html: mainContent,
        title: doc.title,
        metaDescription: doc.querySelector('meta[name="description"]')?.getAttribute('content') ?? null,
        shell,
        announcedTitle: doc.title,
      },
      source: 'fetch',
    };
  }

  private createRouteContext(normalizedUrl: string, signal: AbortSignal): DocumentRouteContext {
    const parsedUrl = new URL(normalizedUrl, window.location.origin);

    return {
      url: normalizedUrl,
      normalizedUrl,
      pathname: parsedUrl.pathname,
      searchParams: new URLSearchParams(parsedUrl.search),
      hash: parsedUrl.hash,
      signal,
    };
  }

  private createHttpErrorResult(status: number, normalizedUrl: string): LoadResult {
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
        return {
          snapshot: this.createNotFoundSnapshot(normalizedUrl),
          source: 'fetch',
        };
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

  createExceptionResult(error: unknown): LoadResult {
    if (error instanceof Error && (error.name === 'AbortError' || error.name === 'TimeoutError')) {
      return this.createErrorResult(
        'タイムアウト',
        'ページの読み込みがタイムアウトしました。',
        'timeout',
      );
    }

    if (error instanceof TypeError && error.message.includes('fetch')) {
      return this.createErrorResult(
        'ネットワークエラー',
        'ネットワーク接続を確認してください。',
        'network',
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
  ): LoadResult {
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

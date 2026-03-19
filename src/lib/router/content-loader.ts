import {
  buildNotFoundPageMarkup,
  NOT_FOUND_PAGE_META_DESCRIPTION,
  NOT_FOUND_PAGE_TITLE,
} from '../not-found-page.js';
import { LocationAdapter } from './location-adapter.js';
import { RouteRegistry } from './route-registry.js';

const SITE_TITLE = 'Rouault';

const buildDocumentTitle = (pageTitle: string): string => {
  const normalized = pageTitle.trim();
  return normalized.length > 0 ? `${normalized} - ${SITE_TITLE}` : SITE_TITLE;
};

export type LoadResult =
  | {
      kind: 'handler';
      html: string;
    }
  | {
      kind: 'page';
      html: string;
      title: string;
      metaDescription: string | null;
      document: Document;
    }
  | {
      kind: 'not-found';
      requestedPath: string;
      title: string;
      metaDescription: string;
      html: string;
    }
  | {
      kind: 'error';
      title: string;
      metaDescription: string;
      html: string;
    };

const escapeHtml = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export class ContentLoader {
  private timeoutDuration = 0;

  constructor(
    private routeRegistry: RouteRegistry,
    private location: LocationAdapter,
  ) {}

  setTimeout(ms: number): void {
    this.timeoutDuration = ms;
  }

  async load(url: string): Promise<LoadResult> {
    let timeoutId: number | undefined;
    const controller = new AbortController();
    const signal = controller.signal;

    try {
      if (this.timeoutDuration > 0) {
        timeoutId = window.setTimeout(() => {
          controller.abort();
        }, this.timeoutDuration);
      }

      const handlerResult = await this.routeRegistry.execute(url);
      if (handlerResult !== null) {
        return {
          kind: 'handler',
          html: handlerResult,
        };
      }

      const response = await fetch(this.location.resolveContentUrl(url), { signal });
      if (!response.ok) {
        return this.createHttpErrorResult(response.status, url);
      }

      const text = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(text, 'text/html');
      const newContent = doc.querySelector('main')?.innerHTML;

      if (!newContent) {
        return this.createHttpErrorResult(404, url);
      }

      return {
        kind: 'page',
        html: newContent,
        title: doc.title,
        metaDescription:
          doc.querySelector('meta[name="description"]')?.getAttribute('content') ?? null,
        document: doc,
      };
    } catch (error) {
      console.error('Navigation failed:', error);

      if (
        error instanceof Error &&
        (error.name === 'AbortError' || error.name === 'TimeoutError')
      ) {
        return this.createErrorResult('タイムアウト', 'ページの読み込みがタイムアウトしました。');
      }

      if (error instanceof TypeError && error.message.includes('fetch')) {
        return this.createErrorResult('ネットワークエラー', 'ネットワーク接続を確認してください。');
      }

      return this.createErrorResult('エラー', 'ページの読み込みに失敗しました。');
    } finally {
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
      }
    }
  }

  private createHttpErrorResult(status: number, url: string): LoadResult {
    switch (status) {
      case 401:
        return this.createErrorResult('401 - 認証エラー', 'ログインが必要です。');
      case 403:
        return this.createErrorResult(
          '403 - 権限エラー',
          'このページにアクセスする権限がありません。',
        );
      case 404:
        return this.createNotFoundResult(url);
      case 500:
        return this.createErrorResult('500 - サーバーエラー', 'サーバーで問題が発生しました。');
      case 503:
        return this.createErrorResult(
          '503 - サービス利用不可',
          '現在サービスを利用できません。しばらくしてからお試しください。',
        );
      default:
        return this.createErrorResult(
          `${String(status)} - エラー`,
          'ページの読み込みに失敗しました。',
        );
    }
  }

  private createNotFoundResult(url: string): LoadResult {
    return {
      kind: 'not-found',
      requestedPath: url,
      title: buildDocumentTitle(NOT_FOUND_PAGE_TITLE),
      metaDescription: NOT_FOUND_PAGE_META_DESCRIPTION,
      html: buildNotFoundPageMarkup({
        requestedPath: url,
      }),
    };
  }

  private createErrorResult(title: string, message: string): LoadResult {
    return {
      kind: 'error',
      title: buildDocumentTitle(title),
      metaDescription: message,
      html: `
        <div class="error-page" role="alert" aria-live="assertive">
          <h1>${escapeHtml(title)}</h1>
          <p>${escapeHtml(message)}</p>
        </div>
      `.trim(),
    };
  }
}

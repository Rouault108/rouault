/**
 * エラーハンドリングユーティリティ
 * アプリケーション全体で統一されたエラー処理を提供
 */
import { type AppError, ErrorType, RouaultError } from '../types/errors.js';
import { buildNotFoundPageMarkup } from '../not-found/not-found-page.js';

/**
 * HTTPレスポンスからエラーを分類
 */
export function classifyHttpError(response: Response): RouaultError {
  const { status } = response;

  if (status === 404) {
    return new RouaultError(ErrorType.NOT_FOUND, 'ページが見つかりません', status);
  }

  if (status >= 500 && status < 600) {
    return new RouaultError(
      ErrorType.SERVER,
      'サーバーエラーが発生しました。しばらくしてから再度お試しください。',
      status,
    );
  }

  if (status >= 400 && status < 500) {
    return new RouaultError(ErrorType.CLIENT, 'ページの読み込みに失敗しました', status);
  }

  return new RouaultError(
    ErrorType.UNKNOWN,
    `予期しないエラーが発生しました (${String(status)})`,
    status,
  );
}

/**
 * 一般的な例外からエラーを分類
 */
export function classifyError(error: unknown): RouaultError {
  // すでに RouaultError の場合はそのまま返す
  if (error instanceof RouaultError) {
    return error;
  }

  // 標準 Error オブジェクトの場合
  if (error instanceof Error) {
    // ネットワークエラーの検出
    if (
      error.name === 'TypeError' &&
      (error.message.includes('fetch') ||
        error.message.includes('network') ||
        error.message.includes('Failed to fetch'))
    ) {
      return new RouaultError(
        ErrorType.NETWORK,
        'ネットワーク接続を確認してください',
        undefined,
        error,
      );
    }

    // パースエラーの検出
    if (
      error instanceof SyntaxError ||
      error.message.includes('parse') ||
      error.message.includes('JSON')
    ) {
      return new RouaultError(
        ErrorType.PARSE,
        'コンテンツの読み込みに失敗しました',
        undefined,
        error,
      );
    }

    // その他のエラー
    return new RouaultError(ErrorType.UNKNOWN, '予期しないエラーが発生しました', undefined, error);
  }

  // 文字列エラーの場合
  if (typeof error === 'string') {
    return new RouaultError(ErrorType.UNKNOWN, error);
  }

  // その他の未知のエラー
  return new RouaultError(
    ErrorType.UNKNOWN,
    '予期しないエラーが発生しました',
    undefined,
    error instanceof Error ? error : undefined,
  );
}

/**
 * エラー情報からユーザー向けHTMLを生成
 */
export function generateErrorHTML(error: AppError): string {
  if (error.type === ErrorType.NOT_FOUND) {
    return buildNotFoundPageMarkup();
  }

  const statusText = error.statusCode ? `エラー ${String(error.statusCode)}` : 'エラー';

  return `
<div class="error-page" role="alert" aria-live="assertive">
    <div class="error-content">
        <h1>${statusText}</h1>
        <p class="error-message">${error.message}</p>
        <nav class="error-actions">
            <button onclick="history.back()" class="button button-primary">戻る</button>
            <button onclick="location.reload()" class="button button-secondary">再読み込み</button>
        </nav>
    </div>
</div>
  `.trim();
}

/**
 * エラーをコンソールに記録（開発環境では詳細表示）
 */
export function logError(error: AppError, context?: string): void {
  // ブラウザ環境では process.env が存在しないため、try-catch で安全に判定
  let isDevelopment = false;
  try {
    isDevelopment = process.env['NODE_ENV'] === 'development';
  } catch {
    // ブラウザ環境では常に詳細ログを出力（本番では minify されるため）
    isDevelopment = true;
  }

  const prefix = context ? `[${context}]` : '[Error]';

  if (isDevelopment) {
    console.group(`${prefix} ${error.type}`);
    console.error('Message:', error.message);
    if (error.statusCode) {
      console.error('Status:', error.statusCode);
    }
    if (error.details) {
      console.error('Details:', error.details);
    }
    if (error.originalError) {
      console.error('Original Error:', error.originalError);
    }
    console.groupEnd();
  } else {
    // 本番環境では簡潔に
    console.error(`${prefix} ${error.message}`, {
      type: error.type,
      status: error.statusCode,
    });
  }
}

/**
 * エラーハンドリングのヘルパー
 */
export const ErrorHandler = {
  /**
   * fetchエラーを処理
   */
  handleFetchError(response: Response): RouaultError {
    if (!response.ok) {
      return classifyHttpError(response);
    }
    return new RouaultError(ErrorType.UNKNOWN, 'Unknown fetch error');
  },

  /**
   * 汎用エラーを処理
   */
  handle(error: unknown, context?: string): AppError {
    const rouaultError = classifyError(error);
    const appError = rouaultError.toAppError();
    logError(appError, context);
    return appError;
  },

  /**
   * エラーを表示用HTMLに変換
   */
  toHTML(error: unknown): string {
    const appError = ErrorHandler.handle(error);
    return generateErrorHTML(appError);
  },
} as const;

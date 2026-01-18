/**
 * アプリケーション全体で使用するエラー型定義
 */

/**
 * エラーの種類を定義
 */
export enum ErrorType {
  /** ネットワーク接続エラー */
  NETWORK = 'NETWORK',
  /** 404 Not Found */
  NOT_FOUND = 'NOT_FOUND',
  /** 5xx サーバーエラー */
  SERVER = 'SERVER',
  /** パースエラー（不正なHTML/JSON） */
  PARSE = 'PARSE',
  /** その他のクライアントエラー（4xx） */
  CLIENT = 'CLIENT',
  /** 予期しないエラー */
  UNKNOWN = 'UNKNOWN',
}

/**
 * エラー情報を保持するインターフェース
 */
export interface AppError {
  /** エラーの種類 */
  type: ErrorType;
  /** ユーザー向けメッセージ */
  message: string;
  /** 詳細なエラー情報（開発用） */
  details?: string | undefined;
  /** HTTPステータスコード（該当する場合） */
  statusCode?: number | undefined;
  /** 元のエラーオブジェクト */
  originalError?: Error | undefined;
}

/**
 * カスタムエラークラス
 */
export class RouaultError extends Error {
  public readonly type: ErrorType;
  public readonly statusCode?: number | undefined;
  public readonly originalError?: Error | undefined;

  constructor(type: ErrorType, message: string, statusCode?: number, originalError?: Error) {
    super(message);
    this.name = 'RouaultError';
    this.type = type;
    this.statusCode = statusCode;
    this.originalError = originalError;

    // スタックトレースを適切に設定（V8環境用）
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, RouaultError);
    }
  }

  /**
   * エラー情報をAppError形式に変換
   */
  toAppError(): AppError {
    return {
      type: this.type,
      message: this.message,
      details: this.originalError?.message,
      statusCode: this.statusCode,
      originalError: this.originalError,
    };
  }
}

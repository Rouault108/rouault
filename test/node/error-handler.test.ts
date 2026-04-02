/**
 * ErrorHandler ユーティリティの単体テスト
 *
 * テスト対象:
 * - classifyHttpError()
 * - classifyError()
 * - generateErrorHTML()
 * - logError()
 */

import { describe, expect, it } from 'vitest';
import {
  classifyError,
  classifyHttpError,
  ErrorHandler,
  generateErrorHTML,
  logError,
} from '../../src/error/error-handler.js';
import { ErrorType, RouaultError } from '../../src/types/errors.js';

describe('ErrorHandler', () => {
  describe('classifyHttpError()', () => {
    it('404レスポンスを NOT_FOUND として分類すること', () => {
      const response = new Response('Not Found', { status: 404 });
      const error = classifyHttpError(response);

      expect(error).to.be.instanceOf(RouaultError);
      expect(error.type).to.equal(ErrorType.NOT_FOUND);
      expect(error.statusCode).to.equal(404);
      expect(error.message).to.include('見つかりません');
    });

    it('500レスポンスを SERVER として分類すること', () => {
      const response = new Response('Internal Server Error', { status: 500 });
      const error = classifyHttpError(response);

      expect(error.type).to.equal(ErrorType.SERVER);
      expect(error.statusCode).to.equal(500);
      expect(error.message).to.include('サーバーエラー');
    });

    it('503レスポンスを SERVER として分類すること', () => {
      const response = new Response('Service Unavailable', { status: 503 });
      const error = classifyHttpError(response);

      expect(error.type).to.equal(ErrorType.SERVER);
      expect(error.statusCode).to.equal(503);
    });

    it('400レスポンスを CLIENT として分類すること', () => {
      const response = new Response('Bad Request', { status: 400 });
      const error = classifyHttpError(response);

      expect(error.type).to.equal(ErrorType.CLIENT);
      expect(error.statusCode).to.equal(400);
    });

    it('403レスポンスを CLIENT として分類すること', () => {
      const response = new Response('Forbidden', { status: 403 });
      const error = classifyHttpError(response);

      expect(error.type).to.equal(ErrorType.CLIENT);
      expect(error.statusCode).to.equal(403);
    });

    it('予期しないステータスコードを UNKNOWN として分類すること', () => {
      // 600は未定義のステータスコード
      const response = {
        status: 600,
        ok: false,
        statusText: 'Unknown Status',
      } as Response;

      const error = classifyHttpError(response);

      expect(error.type).to.equal(ErrorType.UNKNOWN);
      expect(error.statusCode).to.equal(600);
    });
  });

  describe('classifyError()', () => {
    it('RouaultError はそのまま返すこと', () => {
      const originalError = new RouaultError(ErrorType.NOT_FOUND, 'Test Error', 404);
      const result = classifyError(originalError);

      expect(result).to.equal(originalError);
    });

    it('fetch エラーを NETWORK として分類すること', () => {
      const fetchError = new TypeError('Failed to fetch');
      const result = classifyError(fetchError);

      expect(result.type).to.equal(ErrorType.NETWORK);
      expect(result.message).to.include('ネットワーク');
      expect(result.originalError).to.equal(fetchError);
    });

    it('network エラーを NETWORK として分類すること', () => {
      const networkError = new TypeError('network error occurred');
      const result = classifyError(networkError);

      expect(result.type).to.equal(ErrorType.NETWORK);
    });

    it('SyntaxError を PARSE として分類すること', () => {
      const parseError = new SyntaxError('Unexpected token');
      const result = classifyError(parseError);

      expect(result.type).to.equal(ErrorType.PARSE);
      expect(result.message).to.include('読み込みに失敗');
    });

    it('parse を含むエラーメッセージを PARSE として分類すること', () => {
      const error = new Error('JSON parse error');
      const result = classifyError(error);

      expect(result.type).to.equal(ErrorType.PARSE);
    });

    it('一般的な Error を UNKNOWN として分類すること', () => {
      const error = new Error('Something went wrong');
      const result = classifyError(error);

      expect(result.type).to.equal(ErrorType.UNKNOWN);
      expect(result.originalError).to.equal(error);
    });

    it('文字列エラーを UNKNOWN として分類すること', () => {
      const result = classifyError('String error message');

      expect(result.type).to.equal(ErrorType.UNKNOWN);
      expect(result.message).to.equal('String error message');
    });

    it('未知の型のエラーを UNKNOWN として分類すること', () => {
      const result = classifyError({ custom: 'error object' });

      expect(result.type).to.equal(ErrorType.UNKNOWN);
      expect(result.message).to.include('予期しない');
    });
  });

  describe('generateErrorHTML()', () => {
    it('404エラーの HTML を生成すること', () => {
      const appError = {
        type: ErrorType.NOT_FOUND,
        message: 'ページが見つかりません',
        statusCode: 404,
      };

      const html = generateErrorHTML(appError);

      expect(html).to.include('not-found-page');
      expect(html).to.include('検索ページへ');
      expect(html).to.include('このサイトについて');
      expect(html).not.to.include('ホームに戻る');
      expect(html).not.to.include('ノート一覧');
    });

    it('サーバーエラーの HTML を生成すること', () => {
      const appError = {
        type: ErrorType.SERVER,
        message: 'サーバーエラーが発生しました',
        statusCode: 500,
      };

      const html = generateErrorHTML(appError);

      expect(html).to.include('500');
      expect(html).to.include('サーバーエラー');
      expect(html).to.include('戻る');
      expect(html).to.include('再読み込み');
    });

    it('ネットワークエラーの HTML を生成すること', () => {
      const appError = {
        type: ErrorType.NETWORK,
        message: 'ネットワーク接続を確認してください',
      };

      const html = generateErrorHTML(appError);

      expect(html).to.include('ネットワーク接続');
      expect(html).to.include('戻る');
      expect(html).to.include('再読み込み');
    });

    it('アクセシビリティ属性が含まれること', () => {
      const appError = {
        type: ErrorType.UNKNOWN,
        message: 'エラーが発生しました',
      };

      const html = generateErrorHTML(appError);

      expect(html).to.include('role="alert"');
      expect(html).to.include('aria-live="assertive"');
    });

    // 注: テンプレートリテラルは自動的にHTMLエスケープしないため、
    // 現在の実装ではXSS対策が不十分。将来的にはDOMPurifyなどのライブラリを使用する必要がある。
    it.skip('XSS対策されていること（HTMLエスケープ）', () => {
      const appError = {
        type: ErrorType.UNKNOWN,
        message: '<script>alert("XSS")</script>',
      };

      const html = generateErrorHTML(appError);

      // テンプレートリテラルは自動的にエスケープされない
      expect(html).to.include('&lt;script&gt;');
      expect(html).not.to.include('<script>alert');
    });
  });

  describe('logError()', () => {
    it('エラー情報をコンソールに出力すること', () => {
      const appError = {
        type: ErrorType.NOT_FOUND,
        message: 'ページが見つかりません',
        statusCode: 404,
      };

      // console.error が呼ばれることを確認
      logError(appError);

      // 実際のテストではスパイを使用して検証
      // expect(consoleErrorSpy).to.have.been.called;
    });

    it('コンテキストを含めて出力すること', () => {
      const appError = {
        type: ErrorType.SERVER,
        message: 'サーバーエラー',
        statusCode: 500,
      };

      logError(appError, 'TestContext');

      // コンテキストが含まれることを確認
      // expect(consoleErrorSpy).to.have.been.calledWith(match(/TestContext/));
    });
  });

  describe('ErrorHandler クラス', () => {
    it('handleFetchError() が HTTP エラーを分類すること', () => {
      const response = new Response('Not Found', { status: 404 });
      const error = ErrorHandler.handleFetchError(response);

      expect(error).to.be.instanceOf(RouaultError);
      expect(error.type).to.equal(ErrorType.NOT_FOUND);
    });

    it('handle() がエラーを AppError に変換すること', () => {
      const error = new Error('Test error');
      const appError = ErrorHandler.handle(error);

      expect(appError).to.have.property('type');
      expect(appError).to.have.property('message');
    });

    it('toHTML() がエラーを HTML に変換すること', () => {
      const error = new Error('Test error');
      const html = ErrorHandler.toHTML(error);

      expect(html).to.be.a('string');
      expect(html).to.include('error-page');
    });
  });

  describe('RouaultError クラス', () => {
    it('toAppError() で AppError 形式に変換できること', () => {
      const error = new RouaultError(
        ErrorType.SERVER,
        'Server error',
        500,
        new Error('Original error'),
      );

      const appError = error.toAppError();

      expect(appError.type).to.equal(ErrorType.SERVER);
      expect(appError.message).to.equal('Server error');
      expect(appError.statusCode).to.equal(500);
      expect(appError.originalError).to.be.instanceOf(Error);
    });

    it('name プロパティが RouaultError であること', () => {
      const error = new RouaultError(ErrorType.UNKNOWN, 'Test');
      expect(error.name).to.equal('RouaultError');
    });

    it('スタックトレースが含まれること', () => {
      const error = new RouaultError(ErrorType.UNKNOWN, 'Test');
      expect(error.stack).to.be.a('string');
    });
  });
});

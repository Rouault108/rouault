/**
 * グローバルオブジェクトの型拡張
 */

/**
 * PrismJS のグローバル API
 */
interface Prism {
  highlightAll(): void;
  highlightElement(element: Element): void;
}

/**
 * Pagefind UI のグローバル API
 */
type PagefindUIConstructor = new (options: { element: Element | string }) => PagefindUIInstance;

interface PagefindUIInstance {}

/**
 * 
 */
declare global {
  /**
   * Window オブジェクトの型拡張
   */
  interface Window {
    Prism?: Prism;
    PagefindUI?: PagefindUIConstructor;
  }

  /**
   * View Transition API のグローバル API
   * 2026年1月時点で型定義がないため、一時的に型定義を追加
   */
  interface Document {
    startViewTransition?: (callback: () => Promise<void>) => {
      finished: Promise<void>;
      updateCallbackDone: Promise<void>;
      ready: Promise<void>;
    };
  }
}

export {};

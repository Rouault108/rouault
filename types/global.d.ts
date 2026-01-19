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

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
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
}

export {};

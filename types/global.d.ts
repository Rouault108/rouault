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
 * Window オブジェクトの型拡張
 */
declare global {
  interface Window {
    Prism?: Prism;
    PagefindUI?: PagefindUIConstructor;
  }
}

export {};

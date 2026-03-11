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

declare global {
  /**
   * Window オブジェクトの型拡張
   */
  interface Window {
    Prism?: Prism;
  }
}

export {};

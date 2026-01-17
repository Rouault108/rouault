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
interface PagefindUIConstructor {
    new(options: { element: Element | string }): PagefindUIInstance;
}

interface PagefindUIInstance {
    // 必要に応じて追加のメソッドを定義
}

/**
 * Window オブジェクトの型拡張
 */
declare global {
    interface Window {
        Prism?: Prism;
        PagefindUI?: PagefindUIConstructor;
    }
}

export { };

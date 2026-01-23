import { css } from 'lit';

/**
 * スクリーンリーダー専用のスタイル
 * 視覚的には隠すが、スクリーンリーダーなどの支援技術からはアクセス可能にする
 *
 * 使用方法:
 * static override styles = [
 *   srOnlyStyle,
 *   css`...`
 * ];
 */
export const srOnlyStyle = css`
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border-width: 0;
  }
`;

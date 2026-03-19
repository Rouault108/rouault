import { css } from 'lit';

/**
 * Shadow DOM 向けリンク契約:
 * - link-text: テキストリンク（常時下線）
 * - link-control: 構造型リンク（非色シグナルは各コンポーネントで担保）
 */
export const linkTextStyles = css`
  .link-text[href] {
    color: var(--fg-default, oklch(20% 0 0));
    text-decoration: underline;
    text-underline-offset: 0.15em;
    text-decoration-thickness: var(--border-width, 1px);
    text-decoration-color: var(--primary, oklch(55% 0.2 250));
    transition:
      color var(--duration-fast, 70ms) var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9)),
      text-decoration-color var(--duration-fast, 70ms)
        var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9));
  }

  @supports (color: oklch(from white l c h)) {
    .link-text[href] {
      text-decoration-color: var(--link-decoration-color, currentColor);
    }
  }

  .link-text[href]:hover {
    color: var(--primary-hover, oklch(50% 0.2 250));
    text-decoration-color: currentColor;
  }

  .link-text[href]:focus-visible {
    outline: var(--focus-ring-width, 2px) solid var(--focus-ring-color, oklch(60% 0.15 250));
    outline-offset: var(--focus-ring-offset, 2px);
    border-radius: var(--focus-ring-radius, 4px);
    animation: var(--animation-focus, none);
  }

  .link-text[href]:visited {
    color: var(--fg-default, oklch(20% 0 0));
  }

  @media (hover: none) and (pointer: coarse) {
    .link-text[href] {
      color: var(--primary, oklch(55% 0.2 250));
      text-decoration-color: var(--link-decoration-color-touch, currentColor);
    }
  }
`;

export const linkControlStyles = css`
  .link-control[href] {
    color: var(--fg-default, oklch(20% 0 0));
    text-decoration: none;
  }

  .link-control[href]:focus-visible {
    outline: var(--focus-ring-width, 2px) solid var(--focus-ring-color, oklch(60% 0.15 250));
    outline-offset: var(--focus-ring-offset, 2px);
    border-radius: var(--focus-ring-radius, 4px);
    animation: var(--animation-focus, none);
  }
`;

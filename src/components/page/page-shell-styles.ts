import { css } from 'lit';

export const pageShellStyles = css`
  :host {
    display: block;
    color: var(--fg-default);
  }

  .page-shell {
    box-sizing: border-box;
    width: min(100%, var(--page-shell-max-width, 72rem));
    margin-inline: auto;
    padding: var(
        --page-shell-padding-block-start,
        clamp(var(--space-6, 24px), 4vw, var(--space-10, 40px))
      )
      var(--page-shell-padding-inline, clamp(var(--space-4, 16px), 2vw, var(--space-6, 24px)))
      var(--page-shell-padding-block-end, var(--space-12, 48px));
  }

  .hero {
    display: grid;
    gap: var(--space-4, 16px);
    padding-bottom: var(--space-6, 24px);
    border-bottom: var(--border-width, 1px) solid var(--border-default);
  }

  .eyebrow {
    margin: 0;
    color: var(--fg-muted);
    font-family: var(--font-mono);
    font-size: var(--text-xs, 12px);
    letter-spacing: var(--tracking-wide, 0.06em);
    text-transform: uppercase;
  }

  .heading {
    margin: 0;
    font-size: clamp(var(--text-2xl, 24px), 4vw, var(--text-4xl, 36px));
    line-height: var(--line-height-tight, 1.2);
  }

  .description {
    margin: 0;
    color: var(--fg-muted);
    font-size: var(--text-base, 14px);
    line-height: var(--line-height-relaxed, 1.7);
  }

  .meta-row {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-3, 12px);
    align-items: center;
    color: var(--fg-muted);
    font-size: var(--text-sm, 13px);
  }

  .results-section {
    margin-top: var(--space-8, 32px);
  }

  .results-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: grid;
    gap: var(--space-3, 12px);
  }

  .result-card {
    --radius-md: var(--radius-lg, 12px);
    --space-4: var(--space-5, 20px);
    background: var(--bg-surface-2);
  }

  .result-link {
    display: grid;
    gap: var(--space-2, 8px);
    color: inherit;
    text-decoration: none;
    min-width: 0;
  }

  .result-link:focus-visible {
    outline: none;
  }

  .result-title {
    margin: 0;
    font-size: var(--text-lg, 16px);
    line-height: var(--line-height-tight, 1.3);
  }

  .result-path,
  .result-meta {
    color: var(--fg-muted);
    font-size: var(--text-xs, 12px);
  }

  .result-excerpt {
    margin: 0;
    color: var(--fg-default);
    font-size: var(--text-sm, 13px);
    line-height: 1.8;
  }

  @media (max-width: 768px) {
    .result-title {
      font-size: var(--text-base, 14px);
    }
  }
`;

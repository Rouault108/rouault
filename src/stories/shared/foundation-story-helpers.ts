import { html, nothing, type TemplateResult } from 'lit';
import { styleMap } from 'lit/directives/style-map.js';

export interface TokenSwatchSpec {
  label: string;
  token: string;
  note?: string;
  previewText?: string;
  previewStyle?: Record<string, string>;
}

export interface TokenSampleSpec {
  label: string;
  content: TemplateResult;
  note?: string;
  containerStyle?: Record<string, string>;
}

interface FoundationFrameOptions {
  title: string;
  description?: string;
}

const foundationStoryCss = `
  .foundation-story {
    display: flex;
    flex-direction: column;
    gap: var(--space-8, 2rem);
    padding: var(--space-6, 1.5rem);
    color: var(--fg-default);
    background:
      linear-gradient(
        180deg,
        oklch(from var(--bg-default) calc(l + 0.02) c h) 0%,
        var(--bg-default) 100%
      );
  }

  .foundation-intro {
    display: grid;
    gap: var(--space-2, 0.5rem);
    max-width: 72ch;
  }

  .foundation-eyebrow {
    margin: 0;
    font-size: var(--text-xs, 0.75rem);
    font-weight: var(--font-semibold, 600);
    letter-spacing: var(--tracking-wider, 0.05em);
    text-transform: uppercase;
    color: var(--fg-muted);
  }

  .foundation-title {
    margin: 0;
    font-size: var(--text-2xl, 1.5rem);
    line-height: var(--line-height-tight, 1.25);
  }

  .foundation-description {
    margin: 0;
    font-size: var(--text-base, 0.875rem);
    line-height: var(--line-height-relaxed, 1.75);
    color: var(--fg-muted);
  }

  .foundation-section {
    display: grid;
    gap: var(--space-4, 1rem);
  }

  .foundation-section-header {
    display: grid;
    gap: var(--space-1, 0.25rem);
  }

  .foundation-section-title {
    margin: 0;
    font-size: var(--text-lg, 1rem);
    line-height: var(--line-height-tight, 1.25);
  }

  .foundation-section-description {
    margin: 0;
    font-size: var(--text-sm, 0.8125rem);
    line-height: var(--line-height-relaxed, 1.75);
    color: var(--fg-muted);
  }

  .foundation-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: var(--space-4, 1rem);
  }

  .foundation-card {
    display: grid;
    gap: var(--space-3, 0.75rem);
    padding: var(--space-4, 1rem);
    border: var(--border-style-subtle, 1px solid var(--border-default));
    border-radius: var(--radius-md, 0.375rem);
    background: var(--bg-surface-2, white);
    min-inline-size: 0;
  }

  .foundation-card-preview {
    min-block-size: 88px;
    display: grid;
    align-items: center;
    justify-items: start;
    gap: var(--space-2, 0.5rem);
    padding: var(--space-4, 1rem);
    border-radius: var(--radius-sm, 0.25rem);
    background: var(--bg-fill-muted);
    color: var(--fg-default);
  }

  .foundation-card-label {
    margin: 0;
    font-size: var(--text-sm, 0.8125rem);
    font-weight: var(--font-semibold, 600);
    line-height: var(--line-height-tight, 1.25);
  }

  .foundation-card-token {
    margin: 0;
    font-family: var(--font-mono);
    font-size: var(--text-xs, 0.75rem);
    line-height: var(--line-height-normal, 1.5);
    color: var(--fg-muted);
    overflow-wrap: anywhere;
  }

  .foundation-card-note {
    margin: 0;
    font-size: var(--text-xs, 0.75rem);
    line-height: var(--line-height-relaxed, 1.75);
    color: var(--fg-muted);
  }

  .foundation-value-list {
    display: grid;
    gap: var(--space-2, 0.5rem);
  }

  .foundation-value-row {
    display: grid;
    grid-template-columns: minmax(120px, 180px) minmax(0, 1fr);
    gap: var(--space-3, 0.75rem);
    align-items: baseline;
    padding-block-end: var(--space-2, 0.5rem);
    border-bottom: var(--border-width, 1px) solid var(--border-ghost);
  }

  .foundation-value-label {
    margin: 0;
    font-size: var(--text-sm, 0.8125rem);
    font-weight: var(--font-medium, 500);
  }

  .foundation-value-token {
    margin: 0;
    font-family: var(--font-mono);
    font-size: var(--text-xs, 0.75rem);
    color: var(--fg-muted);
    overflow-wrap: anywhere;
  }

  .foundation-stage {
    padding: var(--space-4, 1rem);
    border: var(--border-style-subtle, 1px solid var(--border-default));
    border-radius: var(--radius-md, 0.375rem);
    background: var(--bg-surface-1);
  }
`;

export const renderFoundationFrame = (
  options: FoundationFrameOptions,
  content: TemplateResult,
): TemplateResult => html`
  <style>
    ${foundationStoryCss}
  </style>
  <div class="foundation-story">
    <header class="foundation-intro">
      <p class="foundation-eyebrow">Rouault Storybook</p>
      <h1 class="foundation-title">${options.title}</h1>
      ${options.description
        ? html`<p class="foundation-description">${options.description}</p>`
        : nothing}
    </header>
    ${content}
  </div>
`;

export const renderFoundationSection = (
  title: string,
  content: TemplateResult,
  description?: string,
): TemplateResult => html`
  <section class="foundation-section">
    <header class="foundation-section-header">
      <h2 class="foundation-section-title">${title}</h2>
      ${description ? html`<p class="foundation-section-description">${description}</p>` : nothing}
    </header>
    ${content}
  </section>
`;

export const renderTokenSwatchGrid = (swatches: TokenSwatchSpec[]): TemplateResult => html`
  <div class="foundation-grid">
    ${swatches.map(
      (swatch) => html`
        <article class="foundation-card">
          <div
            class="foundation-card-preview"
            style=${styleMap({
              ...(swatch.previewStyle ?? {}),
            })}
          >
            <span>${swatch.previewText ?? swatch.label}</span>
          </div>
          <div>
            <p class="foundation-card-label">${swatch.label}</p>
            <p class="foundation-card-token">${swatch.token}</p>
            ${swatch.note ? html`<p class="foundation-card-note">${swatch.note}</p>` : nothing}
          </div>
        </article>
      `,
    )}
  </div>
`;

export const renderTokenSampleGrid = (samples: TokenSampleSpec[]): TemplateResult => html`
  <div class="foundation-grid">
    ${samples.map(
      (sample) => html`
        <article class="foundation-card">
          <div
            class="foundation-card-preview"
            style=${styleMap({
              alignItems: 'stretch',
              justifyItems: 'stretch',
              ...(sample.containerStyle ?? {}),
            })}
          >
            ${sample.content}
          </div>
          <div>
            <p class="foundation-card-label">${sample.label}</p>
            ${sample.note ? html`<p class="foundation-card-note">${sample.note}</p>` : nothing}
          </div>
        </article>
      `,
    )}
  </div>
`;

export const renderTokenValueList = (
  rows: { label: string; token: string }[],
): TemplateResult => html`
  <div class="foundation-value-list">
    ${rows.map(
      (row) => html`
        <div class="foundation-value-row">
          <p class="foundation-value-label">${row.label}</p>
          <p class="foundation-value-token">${row.token}</p>
        </div>
      `,
    )}
  </div>
`;

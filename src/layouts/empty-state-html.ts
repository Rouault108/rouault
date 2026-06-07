import { escapeHtmlText } from './html-output.js';

export const EMPTY_STATE_VARIANTS = ['default'] as const;
export const EMPTY_STATE_ANNOUNCE_VALUES = ['off', 'polite'] as const;

export type EmptyStateVariant = (typeof EMPTY_STATE_VARIANTS)[number];
export type EmptyStateAnnounce = (typeof EMPTY_STATE_ANNOUNCE_VALUES)[number];

export interface EmptyStateHtmlInput {
  variant?: EmptyStateVariant;
  heading: string;
  description?: string;
  announce?: EmptyStateAnnounce;
}

const isEmptyStateVariant = (value: unknown): value is EmptyStateVariant =>
  value === 'default';

const isEmptyStateAnnounce = (value: unknown): value is EmptyStateAnnounce =>
  value === 'off' || value === 'polite';

const normalizeVariant = (value: EmptyStateHtmlInput['variant']): EmptyStateVariant =>
  isEmptyStateVariant(value) ? value : 'default';

const normalizeAnnounce = (value: EmptyStateHtmlInput['announce']): EmptyStateAnnounce =>
  isEmptyStateAnnounce(value) ? value : 'off';

const renderDescription = (description: string | undefined): string => {
  const normalizedDescription = typeof description === 'string' ? description.trim() : '';

  return normalizedDescription.length > 0
    ? `<p class="empty-hint__description">${escapeHtmlText(description ?? '')}</p>`
    : '';
};

export const renderEmptyStateHtml = ({
  variant,
  heading,
  description,
  announce,
}: EmptyStateHtmlInput): string => {
  const normalizedAnnounce = normalizeAnnounce(announce);
  const announceAttributes =
    normalizedAnnounce === 'polite'
      ? 'data-announce="polite" aria-live="polite"'
      : 'data-announce="off"';

  return `
    <section class="empty-hint" data-empty-state data-empty-variant="${normalizeVariant(variant)}">
      <div class="empty-hint__message" ${announceAttributes}>
        <div class="empty-hint__icon" aria-hidden="true"></div>
        <h2 class="empty-hint__heading">${escapeHtmlText(heading)}</h2>
        ${renderDescription(description)}
      </div>
      <div class="empty-hint__actions" hidden></div>
    </section>
  `.trim();
};

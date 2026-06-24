export const FINAL_SOURCE_MARKER_ATTRIBUTES = [
  'data-code-group-source',
  'data-link-card-source',
  'data-details-source',
  'data-table-source',
  'data-table-column-widths',
  'data-score-src',
  'data-score-caption-source',
  'data-syntax-card-source',
  'data-syntax-signature-source',
  'data-syntax-section-source',
  'data-syntax-field-source',
  'data-code-raw',
  'data-score-loading',
] as const;

export type FinalSourceMarkerAttribute = (typeof FINAL_SOURCE_MARKER_ATTRIBUTES)[number];

export const PREVIEW_SANDBOX_CONTENT_LAYOUTS = ['stage', 'flow'] as const;

export type PreviewSandboxContentLayout = (typeof PREVIEW_SANDBOX_CONTENT_LAYOUTS)[number];

export const DEFAULT_PREVIEW_SANDBOX_CONTENT_LAYOUT: PreviewSandboxContentLayout = 'stage';

export const isPreviewSandboxContentLayout = (
  value: unknown,
): value is PreviewSandboxContentLayout =>
  typeof value === 'string' &&
  PREVIEW_SANDBOX_CONTENT_LAYOUTS.includes(value as PreviewSandboxContentLayout);

export const normalizePreviewSandboxContentLayout = (
  value: unknown,
): PreviewSandboxContentLayout =>
  isPreviewSandboxContentLayout(value) ? value : DEFAULT_PREVIEW_SANDBOX_CONTENT_LAYOUT;

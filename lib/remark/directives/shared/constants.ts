export const START_PATTERN = /^::([a-z][a-z0-9-]*)(?:\{(.*)\})?$/;
export const END_PATTERN = /^::$/;

export const INLINE_DIRECTIVE_PATTERN =
  /^:(emoji|subscript|superscript|highlight)\[([^\]\n]+)\](?:\{([^}\n]*)\})?/;
export const INLINE_EMOJI_SHORTCODE_PATTERN = /^:([a-z0-9_+-]+):/i;
export const INLINE_HIGHLIGHT_PATTERN = /^==([^=\n]+)==/;
export const INLINE_SUPERSCRIPT_PATTERN = /^\^([^^\n]+)\^/;
export const INLINE_SUBSCRIPT_PATTERN = /^~([^~\n]+)~/;

export const CALLOUT_VARIANTS = new Set(['note', 'tip', 'success', 'warning', 'danger']);
export const DETAILS_VARIANTS = new Set(['default', 'bordered']);
export const INFO_BOX_VARIANTS = new Set(['default', 'filled']);
export const SCORE_LOADING_MODES = new Set(['lazy', 'eager']);
export const IMAGE_LOADING_MODES = new Set(['lazy', 'eager']);
export const TABS_ORIENTATIONS = new Set(['horizontal', 'vertical']);
export const PREVIEW_PADDING_MODES = new Set(['normal', 'compact', 'none']);
export const PREVIEW_ALIGN_MODES = new Set(['center', 'start', 'stretch']);
export const PREVIEW_THEMES = new Set(['page', 'light', 'dark']);
export const PREVIEW_SURFACES = new Set(['surface', 'canvas', 'muted']);
export const PREVIEW_VIEWPORTS = new Set(['full', 'tablet', 'mobile']);
export const PREVIEW_CONTROL_VALUES = new Set(['theme', 'surface', 'viewport']);
export const PREVIEW_SANDBOX_LANGUAGES = new Set(['preview-html', 'preview-css', 'preview-js']);
export const TRANSLATION_RENDER_MODES = new Set(['popover', 'drawer', 'interlinear']);
export const CODE_BLOCK_INTENTS = new Set(['neutral', 'valid', 'invalid']);

export const EMOJI_SHORTCODE_MAP: Record<string, string> = {
  smile: '😄',
  grin: '😁',
  joy: '😂',
  thinking: '🤔',
  sparkles: '✨',
  warning: '⚠️',
  fire: '🔥',
  heart: '❤️',
  check: '✅',
  x: '❌',
  memo: '📝',
  book: '📚',
  music: '🎵',
  bulb: '💡',
};

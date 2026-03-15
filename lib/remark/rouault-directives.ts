interface MdastNodeData {
  hName?: string;
  hProperties?: Record<string, unknown>;
}

interface MdastNode {
  type?: string;
  value?: string;
  lang?: string;
  meta?: string;
  url?: string;
  title?: string | null;
  alt?: string | null;
  children?: MdastNode[];
  data?: MdastNodeData;
  position?: {
    start?: {
      line?: number;
      column?: number;
      offset?: number;
    };
    end?: {
      line?: number;
      column?: number;
      offset?: number;
    };
  };
}

interface VFileLike {
  path?: string;
  value?: unknown;
}

type DirectiveName =
  | 'callout'
  | 'code-group'
  | 'code-preview'
  | 'preview-sandbox'
  | 'details'
  | 'info-box'
  | 'score'
  | 'tabs'
  | 'translation'
  | 'preview'
  | 'toolbar'
  | 'tab'
  | 'panel';

interface DirectiveMarker {
  readonly name: DirectiveName;
  readonly attrsSource: string;
  readonly node: MdastNode;
}

const START_PATTERN = /^::([a-z][a-z0-9-]*)(?:\{(.*)\})?$/;
const END_PATTERN = /^::$/;
const INLINE_DIRECTIVE_PATTERN =
  /^:(emoji|subscript|superscript|highlight)\[([^\]\n]+)\](?:\{([^}\n]*)\})?/;
const INLINE_EMOJI_SHORTCODE_PATTERN = /^:([a-z0-9_+-]+):/i;
const INLINE_HIGHLIGHT_PATTERN = /^==([^=\n]+)==/;
const INLINE_SUPERSCRIPT_PATTERN = /^\^([^^\n]+)\^/;
const INLINE_SUBSCRIPT_PATTERN = /^~([^~\n]+)~/;

const SUPPORTED_DIRECTIVES = new Set<DirectiveName>([
  'callout',
  'code-group',
  'code-preview',
  'preview-sandbox',
  'details',
  'info-box',
  'score',
  'tabs',
  'translation',
  'preview',
  'toolbar',
  'tab',
  'panel',
]);

const CALLOUT_VARIANTS = new Set(['note', 'tip', 'success', 'warning', 'danger']);
const DETAILS_VARIANTS = new Set(['default', 'bordered']);
const INFO_BOX_VARIANTS = new Set(['default', 'filled']);
const SCORE_LOADING_MODES = new Set(['lazy', 'eager']);
const IMAGE_LOADING_MODES = new Set(['lazy', 'eager']);
const TABS_ORIENTATIONS = new Set(['horizontal', 'vertical']);
const PREVIEW_PADDING_MODES = new Set(['normal', 'compact', 'none']);
const PREVIEW_ALIGN_MODES = new Set(['center', 'start', 'stretch']);
const PREVIEW_THEMES = new Set(['page', 'light', 'dark']);
const PREVIEW_SURFACES = new Set(['surface', 'canvas', 'muted']);
const PREVIEW_VIEWPORTS = new Set(['full', 'tablet', 'mobile']);
const PREVIEW_CONTROL_VALUES = new Set(['theme', 'surface', 'viewport']);
const PREVIEW_SANDBOX_LANGUAGES = new Set(['preview-html', 'preview-css', 'preview-js']);
const TRANSLATION_RENDER_MODES = new Set(['popover', 'drawer', 'interlinear']);
const HIGHLIGHT_ORIGINS = new Set(['search', 'user']);
const CODE_BLOCK_INTENTS = new Set(['neutral', 'valid', 'invalid']);
const EMOJI_SHORTCODE_MAP: Record<string, string> = {
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

const getNodeLocation = (node: MdastNode): string => {
  const line = node.position?.start?.line;
  const column = node.position?.start?.column;
  if (typeof line === 'number' && typeof column === 'number') {
    return `:${String(line)}:${String(column)}`;
  }
  return '';
};

const toError = (file: VFileLike | undefined, node: MdastNode, message: string): Error => {
  const sourcePath = file?.path ?? 'unknown file';
  return new Error(`[markdown] ${message}: ${sourcePath}${getNodeLocation(node)}`);
};

const getParagraphSingleText = (node: MdastNode): string | null => {
  if (node.type !== 'paragraph' || !Array.isArray(node.children) || node.children.length !== 1) {
    return null;
  }

  const onlyChild = node.children[0];
  if (onlyChild?.type !== 'text' || typeof onlyChild.value !== 'string') {
    return null;
  }

  return onlyChild.value;
};

const parseStartLine = (
  source: string,
  node: MdastNode,
  file?: VFileLike,
): DirectiveMarker | null => {
  const matched = START_PATTERN.exec(source.trim());
  if (!matched) {
    return null;
  }

  const rawName = matched[1] ?? '';
  if (!SUPPORTED_DIRECTIVES.has(rawName as DirectiveName)) {
    throw toError(file, node, `未対応のディレクティブ "${rawName}"`);
  }

  return {
    name: rawName as DirectiveName,
    attrsSource: matched[2] ?? '',
    node,
  };
};

const parseStartMarker = (node: MdastNode, file?: VFileLike): DirectiveMarker | null => {
  const markerText = getParagraphSingleText(node);
  if (markerText === null) {
    return null;
  }

  return parseStartLine(markerText, node, file);
};

const isEndMarker = (node: MdastNode): boolean => {
  const markerText = getParagraphSingleText(node);
  return markerText !== null && END_PATTERN.test(markerText.trim());
};

const parseAttributes = (
  source: string,
  node: MdastNode,
  file?: VFileLike,
): Record<string, string> => {
  const result: Record<string, string> = {};
  let cursor = 0;
  const attrPattern = /\s*([A-Za-z_][\w-]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'}]+))/y;

  while (cursor < source.length) {
    while (cursor < source.length && /\s/.test(source[cursor] ?? '')) {
      cursor += 1;
    }
    if (cursor >= source.length) {
      break;
    }

    attrPattern.lastIndex = cursor;
    const matched = attrPattern.exec(source);
    if (!matched) {
      throw toError(file, node, `ディレクティブ属性の構文が不正です "${source}"`);
    }

    const key = matched[1] ?? '';
    const value = matched[2] ?? matched[3] ?? matched[4] ?? '';
    if (result[key] !== undefined) {
      throw toError(file, node, `ディレクティブ属性 "${key}" が重複しています`);
    }

    result[key] = value;
    cursor = attrPattern.lastIndex;
  }

  return result;
};

const extractLeadingAttributeBlock = (
  source: string,
  node: MdastNode,
  file: VFileLike | undefined,
  contextName: string,
): { attrsSource: string; rest: string } | null => {
  const leadingWhitespaceMatched = /^\s*/.exec(source);
  const offset = leadingWhitespaceMatched?.[0].length ?? 0;
  if (source[offset] !== '{') {
    return null;
  }

  const closingIndex = source.indexOf('}', offset + 1);
  if (closingIndex < 0) {
    throw toError(file, node, `${contextName}属性の構文が不正です "${source}"`);
  }

  const attrsSource = source.slice(offset + 1, closingIndex);
  const rest = source.slice(closingIndex + 1);
  return { attrsSource, rest };
};

const pickOptional = (value: string | undefined): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const parseBooleanAttribute = (
  value: string | undefined,
  node: MdastNode,
  file: VFileLike | undefined,
  directiveName: string,
  key: string,
): boolean | undefined => {
  const normalized = pickOptional(value)?.toLowerCase();
  if (!normalized) {
    return undefined;
  }

  if (normalized === 'true' || normalized === '1' || normalized === 'on' || normalized === 'yes') {
    return true;
  }

  if (normalized === 'false' || normalized === '0' || normalized === 'off' || normalized === 'no') {
    return false;
  }

  throw toError(file, node, `${directiveName} の ${key} は true/false で指定してください`);
};

const parseIntegerInRange = (
  value: string | undefined,
  node: MdastNode,
  file: VFileLike | undefined,
  directiveName: string,
  key: string,
  min: number,
  max: number,
): number | undefined => {
  const normalized = pickOptional(value);
  if (!normalized) {
    return undefined;
  }

  const parsed = Number.parseInt(normalized, 10);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    throw toError(
      file,
      node,
      `${directiveName} の ${key} は ${String(min)} から ${String(max)} の整数で指定してください`,
    );
  }

  return parsed;
};

const parseIntegerMin = (
  value: string | undefined,
  node: MdastNode,
  file: VFileLike | undefined,
  directiveName: string,
  key: string,
  min: number,
): number | undefined => {
  const normalized = pickOptional(value);
  if (!normalized) {
    return undefined;
  }

  const parsed = Number.parseInt(normalized, 10);
  if (!Number.isInteger(parsed) || parsed < min) {
    throw toError(
      file,
      node,
      `${directiveName} の ${key} は ${String(min)} 以上の整数で指定してください`,
    );
  }

  return parsed;
};

const parseEnumListAttribute = (
  value: string | undefined,
  node: MdastNode,
  file: VFileLike | undefined,
  directiveName: string,
  key: string,
  allowedValues: ReadonlySet<string>,
  orderedValues: readonly string[],
): string | undefined => {
  const normalized = pickOptional(value)?.toLowerCase();
  if (!normalized) {
    return undefined;
  }

  const tokens = normalized.split(/\s+/);
  const seen = new Set<string>();

  for (const token of tokens) {
    if (!allowedValues.has(token)) {
      throw toError(
        file,
        node,
        `${directiveName} の ${key} は ${orderedValues.join('/')} のみ指定可能です`,
      );
    }

    if (seen.has(token)) {
      throw toError(file, node, `${directiveName} の ${key} で "${token}" が重複しています`);
    }

    seen.add(token);
  }

  return orderedValues.filter((item) => seen.has(item)).join(' ');
};

const assertAllowedAttributes = (
  attrs: Record<string, string>,
  allowedKeys: ReadonlySet<string>,
  node: MdastNode,
  file: VFileLike | undefined,
  directiveName: string,
): void => {
  for (const key of Object.keys(attrs)) {
    if (!allowedKeys.has(key)) {
      throw toError(file, node, `${directiveName} 属性 "${key}" は未対応です`);
    }
  }
};

interface ParsedCodeMeta {
  readonly attrs: Record<string, string>;
  readonly raw: string;
}

const parseCodeMeta = (
  source: string | undefined,
  node: MdastNode,
  file?: VFileLike,
): ParsedCodeMeta => {
  if (typeof source !== 'string') {
    return { attrs: {}, raw: '' };
  }

  const attrs: Record<string, string> = {};
  const raw = source.trim();
  const attrPattern = /\s*([A-Za-z_][\w-]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'}]+))/y;
  const highlightMetaPattern = /\s*\{[^}\n]+\}/y;
  let cursor = 0;

  while (cursor < source.length) {
    while (cursor < source.length && /\s/.test(source[cursor] ?? '')) {
      cursor += 1;
    }
    if (cursor >= source.length) {
      break;
    }

    highlightMetaPattern.lastIndex = cursor;
    const highlightMeta = highlightMetaPattern.exec(source);
    if (highlightMeta) {
      cursor = highlightMetaPattern.lastIndex;
      continue;
    }

    attrPattern.lastIndex = cursor;
    const matched = attrPattern.exec(source);
    if (!matched) {
      throw toError(file, node, `code meta の構文が不正です "${source}"`);
    }

    const key = matched[1] ?? '';
    const value = matched[2] ?? matched[3] ?? matched[4] ?? '';
    if (attrs[key] !== undefined) {
      throw toError(file, node, `code meta 属性 "${key}" が重複しています`);
    }

    attrs[key] = value;
    cursor = attrPattern.lastIndex;
  }

  return { attrs, raw };
};

const normalizeCodeBlockMeta = (node: MdastNode, file?: VFileLike): void => {
  if (node.type !== 'code') {
    return;
  }

  const { attrs, raw } = parseCodeMeta(node.meta, node, file);
  const properties: Record<string, unknown> = {};
  const allowedKeys = new Set(['filename', 'label', 'intent', 'show-line-numbers']);
  assertAllowedAttributes(attrs, allowedKeys, node, file, 'code meta');

  const filename = pickOptional(attrs['filename']);
  if (filename) {
    properties['filename'] = filename;
  }

  const label = pickOptional(attrs['label']);
  if (label) {
    properties['label'] = label;
  }

  const intent = pickOptional(attrs['intent'])?.toLowerCase();
  if (intent) {
    if (!CODE_BLOCK_INTENTS.has(intent)) {
      throw toError(file, node, 'code meta の intent は neutral/valid/invalid のみ指定可能です');
    }
    properties['intent'] = intent;
  }

  const showLineNumbers = parseBooleanAttribute(
    attrs['show-line-numbers'],
    node,
    file,
    'code meta',
    'show-line-numbers',
  );
  if (showLineNumbers === true) {
    properties['show-line-numbers'] = true;
  }

  if (raw !== '') {
    properties['data-shiki-meta'] = raw;
  }

  if (Object.keys(properties).length === 0) {
    return;
  }

  const data = node.data ?? {};
  const currentProperties = data.hProperties ?? {};
  data.hProperties = { ...currentProperties, ...properties };
  node.data = data;
};

const normalizeCodeBlockMetaTree = (nodes: MdastNode[], file?: VFileLike): void => {
  for (const node of nodes) {
    normalizeCodeBlockMeta(node, file);
    if (Array.isArray(node.children)) {
      normalizeCodeBlockMetaTree(node.children, file);
    }
  }
};

const applyCalloutAttributes = (
  attrs: Record<string, string>,
  node: MdastNode,
  file?: VFileLike,
): Record<string, unknown> => {
  const result: Record<string, unknown> = {};
  const allowedKeys = new Set(['kind', 'variant', 'title', 'icon', 'heading-level', 'aria-label']);
  assertAllowedAttributes(attrs, allowedKeys, node, file, 'callout');

  const kind = pickOptional(attrs['kind'])?.toLowerCase();
  const variant = pickOptional(attrs['variant'])?.toLowerCase();
  if (kind && variant && kind !== variant) {
    throw toError(file, node, 'callout の kind と variant が矛盾しています');
  }

  const resolvedVariant = variant ?? kind ?? 'note';
  if (!CALLOUT_VARIANTS.has(resolvedVariant)) {
    throw toError(file, node, `callout の kind/variant "${resolvedVariant}" は未対応です`);
  }
  result['variant'] = resolvedVariant;

  const title = pickOptional(attrs['title']);
  if (title) {
    result['title'] = title;
  }

  const icon = pickOptional(attrs['icon']);
  if (icon) {
    result['icon'] = icon;
  }

  const ariaLabel = pickOptional(attrs['aria-label']);
  if (ariaLabel) {
    result['aria-label'] = ariaLabel;
  }

  const headingLevel = parseIntegerInRange(
    attrs['heading-level'],
    node,
    file,
    'callout',
    'heading-level',
    1,
    6,
  );
  if (typeof headingLevel === 'number') {
    result['heading-level'] = String(headingLevel);
  }

  return result;
};

const applyCodeGroupAttributes = (
  attrs: Record<string, string>,
  node: MdastNode,
  file?: VFileLike,
): Record<string, unknown> => {
  const result: Record<string, unknown> = {};
  const allowedKeys = new Set(['aria-label']);
  assertAllowedAttributes(attrs, allowedKeys, node, file, 'code-group');

  const ariaLabel = pickOptional(attrs['aria-label']);
  if (ariaLabel) {
    result['aria-label'] = ariaLabel;
  }

  return result;
};

const applyCodePreviewAttributes = (
  attrs: Record<string, string>,
  node: MdastNode,
  file?: VFileLike,
): Record<string, unknown> => {
  const result: Record<string, unknown> = {};
  const allowedKeys = new Set([
    'label',
    'controls',
    'preview-padding',
    'preview-align',
    'preview-theme',
    'preview-surface',
    'preview-viewport',
  ]);
  assertAllowedAttributes(attrs, allowedKeys, node, file, 'code-preview');

  const label = pickOptional(attrs['label']);
  if (label) {
    result['label'] = label;
  }

  const controls = parseEnumListAttribute(
    attrs['controls'],
    node,
    file,
    'code-preview',
    'controls',
    PREVIEW_CONTROL_VALUES,
    ['theme', 'surface', 'viewport'],
  );
  if (controls) {
    result['controls'] = controls;
  }

  const previewPadding = pickOptional(attrs['preview-padding'])?.toLowerCase();
  if (previewPadding) {
    if (!PREVIEW_PADDING_MODES.has(previewPadding)) {
      throw toError(
        file,
        node,
        'code-preview の preview-padding は normal/compact/none のみ指定可能です',
      );
    }
    result['preview-padding'] = previewPadding;
  }

  const previewAlign = pickOptional(attrs['preview-align'])?.toLowerCase();
  if (previewAlign) {
    if (!PREVIEW_ALIGN_MODES.has(previewAlign)) {
      throw toError(
        file,
        node,
        'code-preview の preview-align は center/start/stretch のみ指定可能です',
      );
    }
    result['preview-align'] = previewAlign;
  }

  const previewTheme = pickOptional(attrs['preview-theme'])?.toLowerCase();
  if (previewTheme) {
    if (!PREVIEW_THEMES.has(previewTheme)) {
      throw toError(
        file,
        node,
        'code-preview の preview-theme は page/light/dark のみ指定可能です',
      );
    }
    result['preview-theme'] = previewTheme;
  }

  const previewSurface = pickOptional(attrs['preview-surface'])?.toLowerCase();
  if (previewSurface) {
    if (!PREVIEW_SURFACES.has(previewSurface)) {
      throw toError(
        file,
        node,
        'code-preview の preview-surface は surface/canvas/muted のみ指定可能です',
      );
    }
    result['preview-surface'] = previewSurface;
  }

  const previewViewport = pickOptional(attrs['preview-viewport'])?.toLowerCase();
  if (previewViewport) {
    if (!PREVIEW_VIEWPORTS.has(previewViewport)) {
      throw toError(
        file,
        node,
        'code-preview の preview-viewport は full/tablet/mobile のみ指定可能です',
      );
    }
    result['preview-viewport'] = previewViewport;
  }

  return result;
};

const applyDetailsAttributes = (
  attrs: Record<string, string>,
  node: MdastNode,
  file?: VFileLike,
): Record<string, unknown> => {
  const result: Record<string, unknown> = {};
  const allowedKeys = new Set(['aria-label', 'summary', 'open', 'variant', 'region']);
  assertAllowedAttributes(attrs, allowedKeys, node, file, 'details');

  const ariaLabel = pickOptional(attrs['aria-label']);
  if (!ariaLabel) {
    throw toError(file, node, 'details の aria-label は必須です');
  }
  result['aria-label'] = ariaLabel;

  const summary = pickOptional(attrs['summary']);
  if (summary) {
    result['summary'] = summary;
  }

  const open = parseBooleanAttribute(attrs['open'], node, file, 'details', 'open');
  if (open === true) {
    result['open'] = true;
  }

  const region = parseBooleanAttribute(attrs['region'], node, file, 'details', 'region');
  if (region === true) {
    result['region'] = true;
  }

  const variant = pickOptional(attrs['variant'])?.toLowerCase();
  if (variant) {
    if (!DETAILS_VARIANTS.has(variant)) {
      throw toError(file, node, 'details の variant は default/bordered のみ指定可能です');
    }
    result['variant'] = variant;
  }

  return result;
};

const applyInfoBoxAttributes = (
  attrs: Record<string, string>,
  node: MdastNode,
  file?: VFileLike,
): Record<string, unknown> => {
  const result: Record<string, unknown> = {};
  const allowedKeys = new Set(['heading', 'icon', 'heading-level', 'landmark', 'variant']);
  assertAllowedAttributes(attrs, allowedKeys, node, file, 'info-box');

  const heading = pickOptional(attrs['heading']);
  if (heading) {
    result['heading'] = heading;
  }

  const icon = pickOptional(attrs['icon']);
  if (icon) {
    result['icon'] = icon;
  }

  const headingLevel = parseIntegerInRange(
    attrs['heading-level'],
    node,
    file,
    'info-box',
    'heading-level',
    1,
    6,
  );
  if (typeof headingLevel === 'number') {
    result['heading-level'] = String(headingLevel);
  }

  const landmark = parseBooleanAttribute(attrs['landmark'], node, file, 'info-box', 'landmark');
  if (landmark === true) {
    result['landmark'] = true;
  }

  const variant = pickOptional(attrs['variant'])?.toLowerCase();
  if (variant) {
    if (!INFO_BOX_VARIANTS.has(variant)) {
      throw toError(file, node, 'info-box の variant は default/filled のみ指定可能です');
    }
    result['variant'] = variant;
  }

  return result;
};

const applyScoreAttributes = (
  attrs: Record<string, string>,
  node: MdastNode,
  file?: VFileLike,
): Record<string, unknown> => {
  const result: Record<string, unknown> = {};
  const allowedKeys = new Set([
    'src',
    'caption',
    'label',
    'description',
    'aspect-ratio',
    'loading',
    'primary',
  ]);
  assertAllowedAttributes(attrs, allowedKeys, node, file, 'score');

  const src = pickOptional(attrs['src']);
  if (src) {
    result['src'] = src;
  }

  const caption = pickOptional(attrs['caption']);
  if (caption) {
    result['caption'] = caption;
  }

  const label = pickOptional(attrs['label']);
  if (label) {
    result['label'] = label;
  }

  const description = pickOptional(attrs['description']);
  if (description) {
    result['description'] = description;
  }

  const aspectRatio = pickOptional(attrs['aspect-ratio']);
  if (aspectRatio) {
    result['aspect-ratio'] = aspectRatio;
  }

  const loading = pickOptional(attrs['loading'])?.toLowerCase();
  if (loading) {
    if (!SCORE_LOADING_MODES.has(loading)) {
      throw toError(file, node, 'score の loading は lazy/eager のみ指定可能です');
    }
    result['loading'] = loading;
  }

  const primary = parseBooleanAttribute(attrs['primary'], node, file, 'score', 'primary');
  if (primary === true) {
    result['primary'] = true;
  }

  return result;
};

const applyImageAttributes = (
  attrs: Record<string, string>,
  node: MdastNode,
  file?: VFileLike,
): Record<string, unknown> => {
  const result: Record<string, unknown> = {};
  const allowedKeys = new Set(['loading', 'width', 'height', 'zoomable']);
  assertAllowedAttributes(attrs, allowedKeys, node, file, 'image');

  const loading = pickOptional(attrs['loading'])?.toLowerCase();
  if (loading) {
    if (!IMAGE_LOADING_MODES.has(loading)) {
      throw toError(file, node, 'image の loading は lazy/eager のみ指定可能です');
    }
    result['loading'] = loading;
  }

  const width = parseIntegerMin(attrs['width'], node, file, 'image', 'width', 1);
  if (typeof width === 'number') {
    result['width'] = width;
  }

  const height = parseIntegerMin(attrs['height'], node, file, 'image', 'height', 1);
  if (typeof height === 'number') {
    result['height'] = height;
  }

  const zoomable = parseBooleanAttribute(attrs['zoomable'], node, file, 'image', 'zoomable');
  if (typeof zoomable === 'boolean') {
    result['zoomable'] = zoomable;
  }

  return result;
};

const applyTabsAttributes = (
  attrs: Record<string, string>,
  node: MdastNode,
  file?: VFileLike,
): Record<string, unknown> => {
  const result: Record<string, unknown> = {};
  const allowedKeys = new Set([
    'selected-index',
    'selected-value',
    'orientation',
    'automatic-activation',
  ]);
  assertAllowedAttributes(attrs, allowedKeys, node, file, 'tabs');

  const selectedIndex = parseIntegerMin(
    attrs['selected-index'],
    node,
    file,
    'tabs',
    'selected-index',
    0,
  );
  if (typeof selectedIndex === 'number') {
    result['selected-index'] = String(selectedIndex);
  }

  const selectedValue = pickOptional(attrs['selected-value']);
  if (selectedValue) {
    result['selected-value'] = selectedValue;
  }

  const orientation = pickOptional(attrs['orientation'])?.toLowerCase();
  if (orientation) {
    if (!TABS_ORIENTATIONS.has(orientation)) {
      throw toError(file, node, 'tabs の orientation は horizontal/vertical のみ指定可能です');
    }
    result['orientation'] = orientation;
  }

  const automaticActivation = parseBooleanAttribute(
    attrs['automatic-activation'],
    node,
    file,
    'tabs',
    'automatic-activation',
  );
  if (automaticActivation === true) {
    result['automatic-activation'] = true;
  }

  return result;
};

const applyTranslationAttributes = (
  attrs: Record<string, string>,
  node: MdastNode,
  file?: VFileLike,
): Record<string, unknown> => {
  const result: Record<string, unknown> = {};
  const allowedKeys = new Set([
    'original',
    'translated',
    'lang',
    'target-lang',
    'render-mode',
    'open',
  ]);
  assertAllowedAttributes(attrs, allowedKeys, node, file, 'translation');

  const original = pickOptional(attrs['original']);
  if (original) {
    result['original'] = original;
  }

  const translated = pickOptional(attrs['translated']);
  if (translated) {
    result['translated'] = translated;
  }

  const lang = pickOptional(attrs['lang']);
  if (lang) {
    result['lang'] = lang;
  }

  const targetLang = pickOptional(attrs['target-lang']);
  if (targetLang) {
    result['target-lang'] = targetLang;
  }

  const renderMode = pickOptional(attrs['render-mode'])?.toLowerCase();
  if (renderMode) {
    if (!TRANSLATION_RENDER_MODES.has(renderMode)) {
      throw toError(
        file,
        node,
        'translation の render-mode は popover/drawer/interlinear のみ指定可能です',
      );
    }
    result['render-mode'] = renderMode;
  }

  const open = parseBooleanAttribute(attrs['open'], node, file, 'translation', 'open');
  if (open === true) {
    result['open'] = true;
  }

  return result;
};

const applyPreviewSlotAttributes = (
  attrs: Record<string, string>,
  node: MdastNode,
  file?: VFileLike,
): Record<string, unknown> => {
  const allowedKeys = new Set<string>();
  assertAllowedAttributes(attrs, allowedKeys, node, file, 'preview');
  return { slot: 'preview' };
};

const applyPreviewSandboxAttributes = (
  attrs: Record<string, string>,
  node: MdastNode,
  file?: VFileLike,
): Record<string, unknown> => {
  const result: Record<string, unknown> = { slot: 'preview' };
  const allowedKeys = new Set(['title', 'allow-js', 'height']);
  assertAllowedAttributes(attrs, allowedKeys, node, file, 'preview-sandbox');

  const title = pickOptional(attrs['title']);
  if (title) {
    result['title'] = title;
  }

  const allowJs = parseBooleanAttribute(
    attrs['allow-js'],
    node,
    file,
    'preview-sandbox',
    'allow-js',
  );
  if (allowJs === true) {
    result['allow-js'] = true;
  }

  const height = pickOptional(attrs['height']);
  if (height) {
    const parsedHeight = Number.parseInt(height, 10);
    if (!Number.isFinite(parsedHeight) || parsedHeight <= 0) {
      throw toError(file, node, 'preview-sandbox の height は正の整数のみ指定可能です');
    }
    result['height'] = String(parsedHeight);
  }

  return result;
};

const applyToolbarSlotAttributes = (
  attrs: Record<string, string>,
  node: MdastNode,
  file?: VFileLike,
): Record<string, unknown> => {
  const allowedKeys = new Set<string>();
  assertAllowedAttributes(attrs, allowedKeys, node, file, 'toolbar');
  return { slot: 'toolbar' };
};

const applyTabSlotAttributes = (
  attrs: Record<string, string>,
  node: MdastNode,
  file?: VFileLike,
): Record<string, unknown> => {
  const result: Record<string, unknown> = { slot: 'tab' };
  const allowedKeys = new Set(['value']);
  assertAllowedAttributes(attrs, allowedKeys, node, file, 'tab');

  const value = pickOptional(attrs['value']);
  if (value) {
    result['value'] = value;
  }

  return result;
};

const applyPanelSlotAttributes = (
  attrs: Record<string, string>,
  node: MdastNode,
  file?: VFileLike,
): Record<string, unknown> => {
  const allowedKeys = new Set<string>();
  assertAllowedAttributes(attrs, allowedKeys, node, file, 'panel');
  return { slot: 'panel' };
};

const getNodeTextContent = (node: MdastNode): string => {
  if (node.type === 'text') {
    return typeof node.value === 'string' ? node.value : '';
  }

  if (!Array.isArray(node.children)) {
    return '';
  }

  return node.children.map((child) => getNodeTextContent(child)).join('');
};

const toTextNode = (value: string): MdastNode => ({
  type: 'text',
  value,
});

const createInlineNode = (
  hName: string,
  text: string,
  hProperties?: Record<string, unknown>,
  nodeType = 'rouaultInlineDirective',
): MdastNode => ({
  type: nodeType,
  data: {
    hName,
    ...(hProperties !== undefined ? { hProperties } : {}),
  },
  children: [toTextNode(text)],
});

const appendText = (buffer: MdastNode[], value: string): void => {
  if (value.length === 0) {
    return;
  }

  const last = buffer[buffer.length - 1];
  if (last?.type === 'text' && typeof last.value === 'string') {
    last.value += value;
    return;
  }

  buffer.push(toTextNode(value));
};

const applyEmojiInlineAttributes = (
  attrs: Record<string, string>,
  node: MdastNode,
  file?: VFileLike,
): Record<string, unknown> => {
  const result: Record<string, unknown> = {};
  const allowedKeys = new Set(['label', 'aria-label']);
  assertAllowedAttributes(attrs, allowedKeys, node, file, 'emoji');

  const ariaLabel = pickOptional(attrs['aria-label']) ?? pickOptional(attrs['label']);
  if (ariaLabel) {
    result['role'] = 'img';
    result['aria-label'] = ariaLabel;
  }

  return result;
};

const applyHighlightInlineAttributes = (
  attrs: Record<string, string>,
  node: MdastNode,
  file?: VFileLike,
): Record<string, unknown> => {
  const result: Record<string, unknown> = {};
  const allowedKeys = new Set(['origin', 'current']);
  assertAllowedAttributes(attrs, allowedKeys, node, file, 'highlight');

  const origin = pickOptional(attrs['origin'])?.toLowerCase();
  if (origin) {
    if (!HIGHLIGHT_ORIGINS.has(origin)) {
      throw toError(file, node, 'highlight の origin は search/user のみ指定可能です');
    }
    result['origin'] = origin;
  }

  const current = parseBooleanAttribute(attrs['current'], node, file, 'highlight', 'current');
  if (current === true) {
    result['current'] = true;
  }

  return result;
};

const parseInlineText = (source: string, node: MdastNode, file?: VFileLike): MdastNode[] => {
  const result: MdastNode[] = [];
  let cursor = 0;

  while (cursor < source.length) {
    const rest = source.slice(cursor);

    const directiveMatch = INLINE_DIRECTIVE_PATTERN.exec(rest);
    if (directiveMatch) {
      const full = directiveMatch[0];
      const name = directiveMatch[1] ?? '';
      const text = directiveMatch[2] ?? '';
      const attrSource = directiveMatch[3] ?? '';
      const attrs = parseAttributes(attrSource, node, file);

      if (name === 'emoji') {
        result.push(
          createInlineNode(
            'span',
            text,
            applyEmojiInlineAttributes(attrs, node, file),
            'rouaultInlineEmoji',
          ),
        );
      } else if (name === 'subscript') {
        const allowed = new Set<string>();
        assertAllowedAttributes(attrs, allowed, node, file, 'subscript');
        result.push(createInlineNode('sub', text, undefined, 'rouaultInlineSubscript'));
      } else if (name === 'superscript') {
        const allowed = new Set<string>();
        assertAllowedAttributes(attrs, allowed, node, file, 'superscript');
        result.push(createInlineNode('sup', text, undefined, 'rouaultInlineSuperscript'));
      } else {
        result.push(
          createInlineNode(
            'ui-highlight',
            text,
            applyHighlightInlineAttributes(attrs, node, file),
            'rouaultInlineHighlight',
          ),
        );
      }

      cursor += full.length;
      continue;
    }

    const emojiMatch = INLINE_EMOJI_SHORTCODE_PATTERN.exec(rest);
    if (emojiMatch) {
      const full = emojiMatch[0];
      const shortcode = (emojiMatch[1] ?? '').toLowerCase();
      const emoji = EMOJI_SHORTCODE_MAP[shortcode];
      if (emoji) {
        appendText(result, emoji);
        cursor += full.length;
        continue;
      }
    }

    const highlightMatch = INLINE_HIGHLIGHT_PATTERN.exec(rest);
    if (highlightMatch) {
      const text = highlightMatch[1] ?? '';
      result.push(
        createInlineNode('ui-highlight', text, { origin: 'user' }, 'rouaultInlineHighlight'),
      );
      cursor += highlightMatch[0].length;
      continue;
    }

    if (rest.startsWith('^')) {
      const superscriptMatch = INLINE_SUPERSCRIPT_PATTERN.exec(rest);
      if (superscriptMatch) {
        const text = superscriptMatch[1] ?? '';
        result.push(createInlineNode('sup', text, undefined, 'rouaultInlineSuperscript'));
        cursor += superscriptMatch[0].length;
        continue;
      }
    }

    if (rest.startsWith('~') && !rest.startsWith('~~')) {
      const subscriptMatch = INLINE_SUBSCRIPT_PATTERN.exec(rest);
      if (subscriptMatch) {
        const text = subscriptMatch[1] ?? '';
        result.push(createInlineNode('sub', text, undefined, 'rouaultInlineSubscript'));
        cursor += subscriptMatch[0].length;
        continue;
      }
    }

    appendText(result, rest.charAt(0));
    cursor += 1;
  }

  return result;
};

const transformInlineTextNode = (node: MdastNode, file?: VFileLike): MdastNode[] => {
  if (node.type !== 'text' || typeof node.value !== 'string') {
    if (node.type === 'delete') {
      const source = extractNodeSource(node, file);
      if (source && isSingleTildeWrapped(source)) {
        return [
          {
            type: 'rouaultInlineSubscript',
            data: { hName: 'sub' },
            children: node.children ?? [],
          },
        ];
      }
    }

    return [node];
  }

  return parseInlineText(node.value, node, file);
};

const extractNodeSource = (node: MdastNode, file?: VFileLike): string | null => {
  if (typeof file?.value !== 'string') {
    return null;
  }

  const startOffset = node.position?.start?.offset;
  const endOffset = node.position?.end?.offset;
  if (typeof startOffset !== 'number' || typeof endOffset !== 'number') {
    return null;
  }

  if (startOffset < 0 || endOffset < startOffset || endOffset > file.value.length) {
    return null;
  }

  return file.value.slice(startOffset, endOffset);
};

const isSingleTildeWrapped = (source: string): boolean =>
  source.startsWith('~') &&
  !source.startsWith('~~') &&
  source.endsWith('~') &&
  !source.endsWith('~~');

const mergeNodeHProperties = (node: MdastNode, properties: Record<string, unknown>): void => {
  if (Object.keys(properties).length === 0) {
    return;
  }

  const nextData: MdastNodeData = { ...(node.data ?? {}) };
  nextData.hProperties = {
    ...(nextData.hProperties ?? {}),
    ...properties,
  };
  node.data = nextData;
};

const normalizeImageAttributeBlocks = (nodes: MdastNode[], file?: VFileLike): MdastNode[] => {
  const result = [...nodes];

  for (let index = 0; index < result.length; index += 1) {
    const current = result[index];
    const next = result[index + 1];
    if (current?.type !== 'image' || next?.type !== 'text' || typeof next.value !== 'string') {
      continue;
    }

    const extracted = extractLeadingAttributeBlock(next.value, next, file, '画像');
    if (!extracted) {
      continue;
    }

    const attrs = parseAttributes(extracted.attrsSource, next, file);
    mergeNodeHProperties(current, applyImageAttributes(attrs, next, file));

    if (extracted.rest.trim().length === 0) {
      result.splice(index + 1, 1);
      continue;
    }

    next.value = extracted.rest;
  }

  return result;
};

const toDirectiveNode = (
  marker: DirectiveMarker,
  children: MdastNode[],
  attrs: Record<string, string>,
  file?: VFileLike,
): MdastNode => {
  const data: MdastNodeData = {};

  if (marker.name === 'callout') {
    data.hName = 'ui-callout';
    data.hProperties = applyCalloutAttributes(attrs, marker.node, file);
    return {
      type: 'rouaultDirectiveCallout',
      data,
      children,
    };
  }

  if (marker.name === 'code-group') {
    for (const child of children) {
      normalizeCodeBlockMeta(child, file);
    }

    data.hName = 'ui-code-group';
    data.hProperties = applyCodeGroupAttributes(attrs, marker.node, file);
    return {
      type: 'rouaultDirectiveCodeGroup',
      data,
      children,
    };
  }

  if (marker.name === 'code-preview') {
    data.hName = 'ui-code-preview';
    data.hProperties = applyCodePreviewAttributes(attrs, marker.node, file);
    return {
      type: 'rouaultDirectiveCodePreview',
      data,
      children,
    };
  }

  if (marker.name === 'preview-sandbox') {
    data.hName = 'ui-preview-sandbox';
    data.hProperties = applyPreviewSandboxAttributes(attrs, marker.node, file);
    return {
      type: 'rouaultDirectivePreviewSandbox',
      data,
      children,
    };
  }

  if (marker.name === 'details') {
    data.hName = 'ui-details';
    data.hProperties = applyDetailsAttributes(attrs, marker.node, file);
    return {
      type: 'rouaultDirectiveDetails',
      data,
      children,
    };
  }

  if (marker.name === 'info-box') {
    data.hName = 'ui-info-box';
    data.hProperties = applyInfoBoxAttributes(attrs, marker.node, file);
    return {
      type: 'rouaultDirectiveInfoBox',
      data,
      children,
    };
  }

  if (marker.name === 'score') {
    data.hName = 'ui-score';
    data.hProperties = applyScoreAttributes(attrs, marker.node, file);
    return {
      type: 'rouaultDirectiveScore',
      data,
      children,
    };
  }

  if (marker.name === 'tabs') {
    data.hName = 'ui-tabs';
    data.hProperties = applyTabsAttributes(attrs, marker.node, file);
    return {
      type: 'rouaultDirectiveTabs',
      data,
      children,
    };
  }

  if (marker.name === 'translation') {
    data.hName = 'ui-translation';
    const props = applyTranslationAttributes(attrs, marker.node, file);

    const textBlocks = children
      .map((item) => getNodeTextContent(item).trim())
      .filter((item) => item.length > 0);

    if (props['original'] === undefined && textBlocks[0] !== undefined) {
      props['original'] = textBlocks[0];
    }

    if (props['translated'] === undefined && textBlocks[1] !== undefined) {
      props['translated'] = textBlocks[1];
    }

    data.hProperties = props;
    return {
      type: 'rouaultDirectiveTranslation',
      data,
      children: [],
    };
  }

  if (marker.name === 'preview') {
    data.hName = 'div';
    data.hProperties = applyPreviewSlotAttributes(attrs, marker.node, file);
    return {
      type: 'rouaultDirectivePreviewSlot',
      data,
      children,
    };
  }

  if (marker.name === 'toolbar') {
    data.hName = 'div';
    data.hProperties = applyToolbarSlotAttributes(attrs, marker.node, file);
    return {
      type: 'rouaultDirectiveToolbarSlot',
      data,
      children,
    };
  }

  if (marker.name === 'tab') {
    data.hName = 'div';
    data.hProperties = applyTabSlotAttributes(attrs, marker.node, file);
    return {
      type: 'rouaultDirectiveTabSlot',
      data,
      children,
    };
  }

  data.hName = 'div';
  data.hProperties = applyPanelSlotAttributes(attrs, marker.node, file);
  return {
    type: 'rouaultDirectivePanelSlot',
    data,
    children,
  };
};

const validatePreviewSandboxNode = (node: MdastNode, file?: VFileLike): void => {
  const children = node.children ?? [];
  let htmlCount = 0;
  let cssCount = 0;
  let jsCount = 0;

  for (const child of children) {
    if (child.type !== 'code') {
      throw toError(file, child, 'preview-sandbox には fenced code block のみ配置できます');
    }

    const language = child.lang?.trim().toLowerCase() ?? '';
    if (!PREVIEW_SANDBOX_LANGUAGES.has(language)) {
      throw toError(
        file,
        child,
        'preview-sandbox の code lang は preview-html/preview-css/preview-js のみ指定可能です',
      );
    }

    if (language === 'preview-html') {
      htmlCount += 1;
    } else if (language === 'preview-css') {
      cssCount += 1;
    } else if (language === 'preview-js') {
      jsCount += 1;
    }
  }

  if (htmlCount === 0) {
    throw toError(file, node, 'preview-sandbox には preview-html が必須です');
  }
  if (htmlCount > 1) {
    throw toError(file, node, 'preview-sandbox の preview-html は 1 つだけ指定できます');
  }
  if (cssCount > 1) {
    throw toError(file, node, 'preview-sandbox の preview-css は 1 つだけ指定できます');
  }
  if (jsCount > 1) {
    throw toError(file, node, 'preview-sandbox の preview-js は 1 つだけ指定できます');
  }

  const allowJs = node.data?.hProperties?.['allow-js'] === true;
  if (jsCount > 0 && !allowJs) {
    throw toError(
      file,
      node,
      'preview-js を使う場合、preview-sandbox の allow-js="true" が必要です',
    );
  }
};

const validateDirectiveTree = (
  nodes: MdastNode[],
  file?: VFileLike,
  parentType: string | undefined = undefined,
): void => {
  for (const node of nodes) {
    if (node.type === 'rouaultDirectivePreviewSandbox') {
      if (parentType !== 'rouaultDirectiveCodePreview') {
        throw toError(file, node, 'preview-sandbox は code-preview の直下でのみ使用できます');
      }
      validatePreviewSandboxNode(node, file);
    }

    if (node.type === 'rouaultDirectiveCodePreview') {
      const children = node.children ?? [];
      const sandboxChildren = children.filter(
        (child) => child.type === 'rouaultDirectivePreviewSandbox',
      );
      const manualPreviewChildren = children.filter((child) => child.type === 'rouaultDirectivePreviewSlot');
      const hasManualCodeArea = children.some(
        (child) =>
          child.type !== 'rouaultDirectivePreviewSandbox' &&
          child.type !== 'rouaultDirectiveToolbarSlot',
      );

      if (sandboxChildren.length > 1) {
        throw toError(file, node, 'code-preview 内の preview-sandbox は 1 つだけ指定できます');
      }

      if (sandboxChildren.length > 0 && manualPreviewChildren.length > 0) {
        throw toError(
          file,
          node,
          'preview-sandbox を使う code-preview では手書きの preview スロットを併用できません',
        );
      }

      if (sandboxChildren.length > 0 && hasManualCodeArea) {
        throw toError(
          file,
          node,
          'preview-sandbox を使う code-preview では手書きの code area を併用できません',
        );
      }
    }

    if (Array.isArray(node.children) && node.children.length > 0) {
      validateDirectiveTree(node.children, file, node.type);
    }
  }
};

const tryParseFoldedDirectiveParagraph = (node: MdastNode, file?: VFileLike): MdastNode | null => {
  const rawText = getParagraphSingleText(node);
  if (!rawText?.includes('\n')) {
    return null;
  }

  const lines = rawText.split(/\r?\n/);
  if (lines.length < 3) {
    return null;
  }

  const marker = parseStartLine(lines[0] ?? '', node, file);
  if (!marker) {
    return null;
  }

  const lastLine = (lines[lines.length - 1] ?? '').trim();
  if (!END_PATTERN.test(lastLine)) {
    return null;
  }

  const attrs = parseAttributes(marker.attrsSource, node, file);
  const middleRaw = lines.slice(1, -1).join('\n');
  const chunks = middleRaw
    .split(/\n{2,}/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

  const children: MdastNode[] = chunks.map((chunk) => ({
    type: 'paragraph',
    children: [{ type: 'text', value: chunk }],
  }));

  return toDirectiveNode(marker, transformChildren(children, file), attrs, file);
};

const expandDirectiveParagraph = (node: MdastNode, file?: VFileLike): MdastNode[] | null => {
  const rawText = getParagraphSingleText(node);
  if (!rawText?.includes('\n')) {
    return null;
  }

  const lines = rawText.split(/\r?\n/);
  const hasDirectiveLine = lines.some((line) => {
    const trimmed = line.trim();
    if (trimmed.length === 0) {
      return false;
    }

    return parseStartLine(trimmed, node, file) !== null || END_PATTERN.test(trimmed);
  });

  if (!hasDirectiveLine) {
    return null;
  }

  const result: MdastNode[] = [];
  let paragraphLines: string[] = [];

  const flushParagraph = (): void => {
    if (paragraphLines.length === 0) {
      return;
    }

    result.push({
      type: 'paragraph',
      children: [{ type: 'text', value: paragraphLines.join('\n') }],
    });
    paragraphLines = [];
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length === 0) {
      flushParagraph();
      continue;
    }

    if (parseStartLine(trimmed, node, file) !== null || END_PATTERN.test(trimmed)) {
      flushParagraph();
      result.push({
        type: 'paragraph',
        children: [{ type: 'text', value: trimmed }],
      });
      continue;
    }

    paragraphLines.push(line);
  }

  flushParagraph();
  return result;
};

const expandDirectiveParagraphs = (nodes: MdastNode[], file?: VFileLike): MdastNode[] => {
  const result: MdastNode[] = [];

  for (const node of nodes) {
    const expanded = expandDirectiveParagraph(node, file);
    if (expanded) {
      result.push(...expanded);
      continue;
    }

    result.push(node);
  }

  return result;
};

const transformChildren = (nodes: MdastNode[], file?: VFileLike): MdastNode[] => {
  const normalizedNodes = expandDirectiveParagraphs(nodes, file);
  const result: MdastNode[] = [];
  let index = 0;

  while (index < normalizedNodes.length) {
    const current = normalizedNodes[index];
    if (!current) {
      index += 1;
      continue;
    }

    const foldedDirective = tryParseFoldedDirectiveParagraph(current, file);
    if (foldedDirective) {
      result.push(foldedDirective);
      index += 1;
      continue;
    }

    const marker = parseStartMarker(current, file);
    if (!marker) {
      if (Array.isArray(current.children)) {
        current.children = transformChildren(current.children, file);
        current.children = normalizeImageAttributeBlocks(current.children, file);
      }
      result.push(...transformInlineTextNode(current, file));
      index += 1;
      continue;
    }

    let depth = 0;
    let closingIndex = -1;
    for (let cursor = index + 1; cursor < normalizedNodes.length; cursor += 1) {
      const candidate = normalizedNodes[cursor];
      if (!candidate) continue;

      const nestedStart = parseStartMarker(candidate, file);
      if (nestedStart) {
        depth += 1;
        continue;
      }

      if (!isEndMarker(candidate)) {
        continue;
      }

      if (depth === 0) {
        closingIndex = cursor;
        break;
      }

      depth -= 1;
    }

    if (closingIndex < 0) {
      throw toError(
        file,
        marker.node,
        `ディレクティブ "${marker.name}" の終端 "::" が見つかりません`,
      );
    }

    const innerNodes = transformChildren(normalizedNodes.slice(index + 1, closingIndex), file);
    const attrs = parseAttributes(marker.attrsSource, marker.node, file);
    result.push(toDirectiveNode(marker, innerNodes, attrs, file));
    index = closingIndex + 1;
  }

  return result;
};

/**
 * Rouault独自ディレクティブを MDAST に展開する。
 */
export function remarkRouaultDirectives() {
  return (tree: unknown, file?: VFileLike) => {
    if (!tree || typeof tree !== 'object') {
      return;
    }

    const root = tree as MdastNode;
    if (!Array.isArray(root.children)) {
      return;
    }

    root.children = transformChildren(root.children, file);
    validateDirectiveTree(root.children, file);
    normalizeCodeBlockMetaTree(root.children, file);
  };
}

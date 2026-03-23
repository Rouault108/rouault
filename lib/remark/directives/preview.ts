import type { DirectiveHandler, MdastNode, VFileLike } from './types';
import {
  PREVIEW_ALIGN_MODES,
  PREVIEW_CONTROL_VALUES,
  PREVIEW_PADDING_MODES,
  PREVIEW_SURFACES,
  PREVIEW_THEMES,
  PREVIEW_VIEWPORTS,
} from './shared/constants';
import { assertAllowedAttributes, pickOptional } from './shared/attributes';
import { parseBooleanAttribute, parseEnumListAttribute } from './shared/attribute-parsers';
import { toError } from './shared/errors';

export const applyCodePreviewAttributes = (
  attrs: Record<string, string>,
  node: MdastNode,
  file?: VFileLike,
): Record<string, unknown> => {
  const result: Record<string, unknown> = {};
  const allowedKeys = new Set([
    'heading',
    'controls',
    'preview-padding',
    'preview-align',
    'preview-theme',
    'preview-surface',
    'preview-viewport',
  ]);
  assertAllowedAttributes(attrs, allowedKeys, node, file, 'code-preview');

  const heading = pickOptional(attrs['heading']);
  if (heading) {
    result['heading'] = heading;
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

export const applyPreviewSlotAttributes = (
  attrs: Record<string, string>,
  node: MdastNode,
  file?: VFileLike,
): Record<string, unknown> => {
  const allowedKeys = new Set<string>();
  assertAllowedAttributes(attrs, allowedKeys, node, file, 'preview');
  return { slot: 'preview' };
};

export const applyPreviewSandboxAttributes = (
  attrs: Record<string, string>,
  node: MdastNode,
  file?: VFileLike,
): Record<string, unknown> => {
  const result: Record<string, unknown> = { slot: 'preview' };
  const allowedKeys = new Set([
    'title',
    'allow-js',
    'allow-forms',
    'allow-downloads',
    'allow-pointer-lock',
    'allow-popups',
    'height',
  ]);
  assertAllowedAttributes(attrs, allowedKeys, node, file, 'preview-sandbox');

  const title = pickOptional(attrs['title']);
  if (title) {
    result['title'] = title;
  }

  const booleanKeys = [
    'allow-js',
    'allow-forms',
    'allow-downloads',
    'allow-pointer-lock',
    'allow-popups',
  ] as const;

  for (const key of booleanKeys) {
    const parsed = parseBooleanAttribute(attrs[key], node, file, 'preview-sandbox', key);
    if (parsed === true) {
      result[key] = true;
    }
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

export const applyToolbarSlotAttributes = (
  attrs: Record<string, string>,
  node: MdastNode,
  file?: VFileLike,
): Record<string, unknown> => {
  const allowedKeys = new Set<string>();
  assertAllowedAttributes(attrs, allowedKeys, node, file, 'toolbar');
  return { slot: 'toolbar' };
};

export const codePreviewHandler: DirectiveHandler = {
  name: 'code-preview',
  toNode(marker, children, attrs, file) {
    return {
      type: 'rouaultDirectiveCodePreview',
      data: {
        hName: 'ui-code-preview',
        hProperties: applyCodePreviewAttributes(attrs, marker.node, file),
      },
      children,
    };
  },
};

export const previewSandboxHandler: DirectiveHandler = {
  name: 'preview-sandbox',
  toNode(marker, children, attrs, file) {
    return {
      type: 'rouaultDirectivePreviewSandbox',
      data: {
        hName: 'ui-preview-sandbox',
        hProperties: applyPreviewSandboxAttributes(attrs, marker.node, file),
      },
      children,
    };
  },
};

export const previewSlotHandler: DirectiveHandler = {
  name: 'preview',
  toNode(marker, children, attrs, file) {
    return {
      type: 'rouaultDirectivePreviewSlot',
      data: {
        hName: 'div',
        hProperties: applyPreviewSlotAttributes(attrs, marker.node, file),
      },
      children,
    };
  },
};

export const toolbarSlotHandler: DirectiveHandler = {
  name: 'toolbar',
  toNode(marker, children, attrs, file) {
    return {
      type: 'rouaultDirectiveToolbarSlot',
      data: {
        hName: 'div',
        hProperties: applyToolbarSlotAttributes(attrs, marker.node, file),
      },
      children,
    };
  },
};

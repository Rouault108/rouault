import type { DirectiveHandler, MdastNode, VFileLike } from './types';
import { CALLOUT_VARIANTS, DETAILS_VARIANTS, INFO_BOX_VARIANTS } from './shared/constants';
import { assertAllowedAttributes, pickOptional } from './shared/attributes';
import { parseBooleanAttribute, parseIntegerInRange } from './shared/attribute-parsers';
import { normalizeCodeBlockMeta } from './shared/code-meta';
import { toError } from './shared/errors';

export const applyCalloutAttributes = (
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

export const applyCodeGroupAttributes = (
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

export const applyDetailsAttributes = (
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

export const applyInfoBoxAttributes = (
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

export const applyLinkCardAttributes = (
  attrs: Record<string, string>,
  node: MdastNode,
  file?: VFileLike,
): Record<string, unknown> => {
  const result: Record<string, unknown> = {};
  const allowedKeys = new Set(['url', 'title', 'description', 'image']);
  assertAllowedAttributes(attrs, allowedKeys, node, file, 'link-card');

  const url = pickOptional(attrs['url']);
  if (!url) {
    throw toError(file, node, 'link-card の url は必須です');
  }
  result['url'] = url;

  const title = pickOptional(attrs['title']);
  if (title) {
    result['title'] = title;
  }

  const description = pickOptional(attrs['description']);
  if (description) {
    result['description'] = description;
  }

  const image = pickOptional(attrs['image']);
  if (image) {
    result['image'] = image;
  }

  return result;
};

export const calloutHandler: DirectiveHandler = {
  name: 'callout',
  toNode(marker, children, attrs, file) {
    return {
      type: 'rouaultDirectiveCallout',
      data: {
        hName: 'ui-callout',
        hProperties: applyCalloutAttributes(attrs, marker.node, file),
      },
      children,
    };
  },
};

export const codeGroupHandler: DirectiveHandler = {
  name: 'code-group',
  toNode(marker, children, attrs, file) {
    for (const child of children) {
      normalizeCodeBlockMeta(child, file);
    }

    return {
      type: 'rouaultDirectiveCodeGroup',
      data: {
        hName: 'ui-code-group',
        hProperties: applyCodeGroupAttributes(attrs, marker.node, file),
      },
      children,
    };
  },
};

export const detailsHandler: DirectiveHandler = {
  name: 'details',
  toNode(marker, children, attrs, file) {
    return {
      type: 'rouaultDirectiveDetails',
      data: {
        hName: 'ui-details',
        hProperties: applyDetailsAttributes(attrs, marker.node, file),
      },
      children,
    };
  },
};

export const infoBoxHandler: DirectiveHandler = {
  name: 'info-box',
  toNode(marker, children, attrs, file) {
    return {
      type: 'rouaultDirectiveInfoBox',
      data: {
        hName: 'ui-info-box',
        hProperties: applyInfoBoxAttributes(attrs, marker.node, file),
      },
      children,
    };
  },
};

export const linkCardHandler: DirectiveHandler = {
  name: 'link-card',
  toNode(marker, _children, attrs, file) {
    return {
      type: 'rouaultDirectiveLinkCard',
      data: {
        hName: 'ui-card',
        hProperties: applyLinkCardAttributes(attrs, marker.node, file),
      },
      children: [],
    };
  },
};

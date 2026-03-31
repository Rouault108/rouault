import type { MdastNode, VFileLike } from '../types.js';
import {
  CALLOUT_VARIANTS,
  DETAILS_VARIANTS,
  INFO_BOX_VARIANTS,
  SCORE_LOADING_MODES,
} from '../shared/constants.js';
import { pickOptional } from '../parser-core/parse-attributes.js';
import { toError } from '../shared/errors.js';
import { parseBooleanAttribute, parseIntegerInRange } from './normalize-helpers.js';
import type {
  CalloutPayload,
  CodeGroupPayload,
  DetailsPayload,
  InfoBoxPayload,
  LinkCardPayload,
  ScorePayload,
} from './payload-types.js';

const INFO_BOX_DENSITIES = ['comfortable', 'compact'] as const;

export const normalizeCalloutPayload = (
  attrs: Record<string, string>,
  node: MdastNode,
  file?: VFileLike,
): CalloutPayload => {
  const calloutKind = (pickOptional(attrs['kind'])?.toLowerCase() ?? 'note') as CalloutPayload['calloutKind'];
  if (!CALLOUT_VARIANTS.has(calloutKind)) {
    throw toError(file, node, `callout の kind "${calloutKind}" は未対応です`);
  }

  return {
    kind: 'callout',
    calloutKind,
    ...(pickOptional(attrs['heading']) ? { heading: pickOptional(attrs['heading']) } : {}),
    ...(pickOptional(attrs['label']) ? { label: pickOptional(attrs['label']) } : {}),
    ...(pickOptional(attrs['icon']) ? { icon: pickOptional(attrs['icon']) } : {}),
    ...(typeof parseIntegerInRange(attrs['heading-level'], node, file, 'callout', 'heading-level', 1, 6) === 'number'
      ? {
          headingLevel: parseIntegerInRange(
            attrs['heading-level'],
            node,
            file,
            'callout',
            'heading-level',
            1,
            6,
          ),
        }
      : {}),
  };
};

export const normalizeCodeGroupPayload = (
  attrs: Record<string, string>,
): CodeGroupPayload => ({
  kind: 'code-group',
  ...(pickOptional(attrs['aria-label']) ? { ariaLabel: pickOptional(attrs['aria-label']) } : {}),
});

export const normalizeDetailsPayload = (
  attrs: Record<string, string>,
  node: MdastNode,
  file?: VFileLike,
): DetailsPayload => {
  const hasAriaLabelAttribute = Object.prototype.hasOwnProperty.call(attrs, 'aria-label');
  const ariaLabel = pickOptional(attrs['aria-label']);
  const summary = pickOptional(attrs['summary']);

  if (summary && hasAriaLabelAttribute) {
    throw toError(file, node, 'details では summary と aria-label を同時指定できません');
  }

  if (!summary && hasAriaLabelAttribute && !ariaLabel) {
    throw toError(file, node, 'details の icon-only 利用では aria-label に空文字を指定できません');
  }

  if (!summary && !ariaLabel) {
    throw toError(file, node, 'details では summary または aria-label のいずれかが必須です');
  }

  const variant = pickOptional(attrs['variant'])?.toLowerCase();
  if (variant && !DETAILS_VARIANTS.has(variant)) {
    throw toError(file, node, 'details の variant は default/bordered のみ指定可能です');
  }

  return {
    kind: 'details',
    ...(summary ? { summary } : {}),
    ...(ariaLabel ? { ariaLabel } : {}),
    open: parseBooleanAttribute(attrs['open'], node, file, 'details', 'open') === true,
    region: parseBooleanAttribute(attrs['region'], node, file, 'details', 'region') === true,
    ...(variant ? { variant: variant as DetailsPayload['variant'] } : {}),
  };
};

export const normalizeInfoBoxPayload = (
  attrs: Record<string, string>,
  node: MdastNode,
  file?: VFileLike,
): InfoBoxPayload => {
  const variant = pickOptional(attrs['variant'])?.toLowerCase();
  if (variant && !INFO_BOX_VARIANTS.has(variant)) {
    throw toError(file, node, 'info-box の variant は default/filled のみ指定可能です');
  }

  const density = pickOptional(attrs['density'])?.toLowerCase();
  if (density && !INFO_BOX_DENSITIES.includes(density as (typeof INFO_BOX_DENSITIES)[number])) {
    throw toError(file, node, 'info-box の density は comfortable/compact のみ指定可能です');
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

  return {
    kind: 'info-box',
    ...(pickOptional(attrs['heading']) ? { heading: pickOptional(attrs['heading']) } : {}),
    ...(pickOptional(attrs['icon']) ? { icon: pickOptional(attrs['icon']) } : {}),
    ...(typeof headingLevel === 'number' ? { headingLevel } : {}),
    landmark: parseBooleanAttribute(attrs['landmark'], node, file, 'info-box', 'landmark') === true,
    ...(variant ? { variant: variant as InfoBoxPayload['variant'] } : {}),
    ...(density ? { density: density as InfoBoxPayload['density'] } : {}),
  };
};

export const normalizeLinkCardPayload = (
  attrs: Record<string, string>,
  node: MdastNode,
  file?: VFileLike,
): LinkCardPayload => {
  const url = pickOptional(attrs['url']);
  if (!url) {
    throw toError(file, node, 'link-card の url は必須です');
  }

  return {
    kind: 'link-card',
    url,
    ...(pickOptional(attrs['title']) ? { title: pickOptional(attrs['title']) } : {}),
    ...(pickOptional(attrs['description']) ? { description: pickOptional(attrs['description']) } : {}),
    ...(pickOptional(attrs['image']) ? { image: pickOptional(attrs['image']) } : {}),
    ...(pickOptional(attrs['site-name']) ? { siteName: pickOptional(attrs['site-name']) } : {}),
  };
};

export const normalizeScorePayload = (
  attrs: Record<string, string>,
  node: MdastNode,
  file?: VFileLike,
): ScorePayload => {
  const loading = pickOptional(attrs['loading'])?.toLowerCase();
  if (loading && !SCORE_LOADING_MODES.has(loading)) {
    throw toError(file, node, 'score の loading は lazy/eager のみ指定可能です');
  }

  return {
    kind: 'score',
    ...(pickOptional(attrs['src']) ? { src: pickOptional(attrs['src']) } : {}),
    ...(pickOptional(attrs['caption']) ? { caption: pickOptional(attrs['caption']) } : {}),
    ...(pickOptional(attrs['label']) ? { label: pickOptional(attrs['label']) } : {}),
    ...(pickOptional(attrs['description']) ? { description: pickOptional(attrs['description']) } : {}),
    ...(pickOptional(attrs['aspect-ratio'])
      ? { aspectRatio: pickOptional(attrs['aspect-ratio']) }
      : {}),
    ...(loading ? { loading: loading as ScorePayload['loading'] } : {}),
    primary: parseBooleanAttribute(attrs['primary'], node, file, 'score', 'primary') === true,
  };
};

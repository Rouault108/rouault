import { classifyLinkHref, type ClassifyLinkOptions, type ResolvedLinkAnnotation } from '../../shared/link/link-annotation.js';
import { hasForbiddenRelToken, parseRelTokens, serializeRelTokens } from '../../shared/link/rel-tokens.js';
import type { LinkSurface } from '../../shared/link/link-surface.js';
import { escapeHtmlText, serializeHtmlAttributes, type HtmlAttributeDescriptor } from './html-output.js';

export interface RenderTextLinkHtmlOptions extends Omit<ClassifyLinkOptions, 'surface'> {
  readonly href: string;
  readonly label: string;
  readonly surface: LinkSurface;
  readonly className?: string;
  readonly target?: '_blank' | '_self';
  readonly rel?: string;
  readonly noRouter?: boolean;
  readonly download?: boolean | string;
}

const validateTarget = (target: string | undefined): '_blank' | '_self' | undefined => {
  if (target === undefined) return undefined;
  if (target !== '_blank' && target !== '_self') throw new Error('invalid-target');
  return target;
};

const validateDownload = (value: boolean | string | undefined): boolean | string | undefined => {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed === '.' || trimmed === '..' || /[\u0000-\u001f\u007f/\\]/u.test(trimmed) || [...trimmed].length > 255) {
    throw new Error('invalid-download');
  }
  return trimmed;
};

export const buildTextLinkAnnotation = (options: RenderTextLinkHtmlOptions): ResolvedLinkAnnotation =>
  classifyLinkHref({ ...options, surface: options.surface });

export const renderTextLinkHtml = (options: RenderTextLinkHtmlOptions): string => {
  const annotation = buildTextLinkAnnotation(options);
  if (annotation.isUnsafe) throw new Error('unsafe-link-href');
  const target = validateTarget(options.target);
  const download = validateDownload(options.download);
  const relTokens = parseRelTokens(options.rel);
  if (hasForbiddenRelToken(relTokens)) throw new Error('forbidden-rel-token');
  const finalRel = target === '_blank' ? serializeRelTokens([...relTokens, 'noopener']) : serializeRelTokens(relTokens);
  const attrs: HtmlAttributeDescriptor[] = [
    { name: 'class', value: options.className ?? 'link-text' },
    { name: 'href', value: annotation.renderHref },
    { name: 'data-link-kind', value: annotation.kind },
    { name: 'data-link-surface', value: annotation.surface },
    ...(annotation.isExternalWeb ? [{ name: 'data-external', value: 'true' }] : []),
    ...(target ? [{ name: 'target', value: target }] : []),
    ...(finalRel.length > 0 ? [{ name: 'rel', value: finalRel }] : []),
    ...(options.noRouter ? [{ name: 'data-no-router', value: true, kind: 'boolean' as const }] : []),
    ...(download === true ? [{ name: 'download', value: true, kind: 'boolean' as const }] : typeof download === 'string' ? [{ name: 'download', value: download }] : []),
  ];
  return `<a${serializeHtmlAttributes(attrs)}>${escapeHtmlText(options.label)}</a>`;
};

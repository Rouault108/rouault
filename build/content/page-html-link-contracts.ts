import * as parse5 from 'parse5';
import type { DefaultTreeAdapterMap } from 'parse5';
import {
  classifyLinkHref,
  type RouteClassificationMode,
} from '../../shared/link/link-annotation.js';
import { detectUnsafeHref } from '../../shared/link/unsafe-href-detector.js';
import { isLinkSurface } from '../../shared/link/link-surface.js';
import { parseRelTokens } from '../../shared/link/rel-tokens.js';
import type { LinkKind } from '../../shared/link/link-kind.js';
import type { SiteUrlContext } from '../../shared/site/site-url-context.js';
import { hasAsciiControlCharacter } from '../../shared/string/ascii-control.js';
import { resolveNoteSourceLink } from '../markdown/note-source-link-resolver.js';

export interface AnnotateGeneratedPageHtmlLinkContractsOptions {
  readonly html: string | undefined;
  readonly sourceLabel: string;
  readonly siteUrlContext: SiteUrlContext;
  readonly currentUrl: string;
  readonly routeClassificationMode: RouteClassificationMode;
  readonly sourceFilePath?: string;
  readonly isInternalResourcePathname?: (pathname: string) => boolean;
}

export interface ValidateGeneratedPageHtmlLinkContractsOptions {
  readonly html: string;
  readonly sourceLabel: string;
  readonly scope?: 'note-content' | 'generated-page' | 'hydrated-dom' | 'commit-dom';
  readonly siteUrlContext?: SiteUrlContext;
  readonly currentUrl?: string;
  readonly routeClassificationMode?: RouteClassificationMode;
  readonly isInternalResourcePathname?: (pathname: string) => boolean;
}

export class PageHtmlLinkContractError extends Error {
  override readonly name = 'PageHtmlLinkContractError';
}

type ElementNode = DefaultTreeAdapterMap['element'];
type Node = DefaultTreeAdapterMap['node'];

const LINK_KINDS = new Set<LinkKind>([
  'internal-document',
  'internal-fragment',
  'internal-resource',
  'external-web',
  'external-action',
  'unsafe',
]);

const isElementNode = (node: Node): node is ElementNode =>
  'tagName' in node && Array.isArray((node as ElementNode).attrs);

const attr = (node: ElementNode, name: string): string | null =>
  node.attrs.find((item) => item.name.toLowerCase() === name.toLowerCase())?.value ?? null;

const hasAttr = (node: ElementNode, name: string): boolean => attr(node, name) !== null;

const setAttr = (node: ElementNode, name: string, value: string): void => {
  const existing = node.attrs.find((item) => item.name.toLowerCase() === name.toLowerCase());
  if (existing !== undefined) {
    existing.value = value;
    return;
  }
  node.attrs.push({ name, value });
};

const removeAttr = (node: ElementNode, name: string): void => {
  const normalized = name.toLowerCase();
  for (let index = node.attrs.length - 1; index >= 0; index -= 1) {
    if (node.attrs[index]?.name.toLowerCase() === normalized) {
      node.attrs.splice(index, 1);
    }
  }
};

const isFootnoteStructuralException = (node: ElementNode): boolean =>
  hasAttr(node, 'data-footnote-ref') ||
  hasAttr(node, 'data-footnote-backref') ||
  hasAttr(node, 'data-footnote-fallback-trigger');

const isComponentShadowPlaceholder = (node: ElementNode): boolean =>
  attr(node, 'data-link-contract-placeholder') === 'component-shadow';

const hasClassName = (node: ElementNode, className: string): boolean =>
  (attr(node, 'class') ?? '')
    .split(/\s+/u)
    .filter((value) => value.length > 0)
    .includes(className);

const isLinkCardRoot = (node: ElementNode): boolean => hasAttr(node, 'data-link-card');

const isFooterRoot = (node: ElementNode): boolean =>
  hasClassName(node, 'ui-footer') && hasAttr(node, 'data-footer');

const isFooterNavRoot = (node: ElementNode): boolean => hasClassName(node, 'ui-footer__nav');

const isCardSurfaceLink = (node: ElementNode, insideLinkCard: boolean): boolean =>
  attr(node, 'data-link-surface') === 'card' ||
  (insideLinkCard && hasClassName(node, 'link-card__link'));

function fail(sourceLabel: string, message: string): never {
  throw new PageHtmlLinkContractError(`[${sourceLabel}] ${message}`);
}

const resolveHtmlAnchorHref = (
  href: string,
  options: AnnotateGeneratedPageHtmlLinkContractsOptions,
): string => {
  if (options.sourceFilePath === undefined) {
    return href;
  }

  const resolved = resolveNoteSourceLink({ href, sourceFilePath: options.sourceFilePath });
  return resolved.kind === 'resolved' ? resolved.href : href;
};

const annotateAnchor = (
  node: ElementNode,
  options: AnnotateGeneratedPageHtmlLinkContractsOptions,
  insideLinkCard: boolean,
): void => {
  if (isFootnoteStructuralException(node)) {
    removeAttr(node, 'data-link-kind');
    removeAttr(node, 'data-link-surface');
    removeAttr(node, 'data-external');
    return;
  }

  const href = attr(node, 'href');
  if (href === null || href.trim().length === 0) {
    return;
  }

  const resolvedHref = resolveHtmlAnchorHref(href, options);
  const expectedSurface = isCardSurfaceLink(node, insideLinkCard) ? 'card' : 'prose';

  const annotation = classifyLinkHref({
    href: resolvedHref,
    surface: expectedSurface,
    siteUrlContext: options.siteUrlContext,
    currentUrl: options.currentUrl,
    routeClassificationMode: options.routeClassificationMode,
    ...(options.isInternalResourcePathname !== undefined
      ? { isInternalResourcePathname: options.isInternalResourcePathname }
      : {}),
  });

  if (annotation.isUnsafe) {
    fail(options.sourceLabel, 'unsafe link kind must not be rendered');
  }

  if (
    resolvedHref === href &&
    attr(node, 'data-link-kind') === annotation.kind &&
    attr(node, 'data-link-surface') === annotation.surface
  ) {
    return;
  }

  setAttr(node, 'href', annotation.renderHref);
  setAttr(node, 'data-link-kind', annotation.kind);
  setAttr(node, 'data-link-surface', annotation.surface);

  if (annotation.isExternalWeb) {
    setAttr(node, 'data-external', 'true');
  } else {
    removeAttr(node, 'data-external');
  }
};

const visitForAnnotation = (
  node: Node,
  options: AnnotateGeneratedPageHtmlLinkContractsOptions,
  insidePlaceholder = false,
  insideLinkCard = false,
): void => {
  const nextInsidePlaceholder =
    insidePlaceholder || (isElementNode(node) && isComponentShadowPlaceholder(node));
  const nextInsideLinkCard = insideLinkCard || (isElementNode(node) && isLinkCardRoot(node));
  if (isElementNode(node) && node.tagName === 'a' && !nextInsidePlaceholder) {
    annotateAnchor(node, options, nextInsideLinkCard);
  }
  const childNodes = 'childNodes' in node ? node.childNodes : [];
  for (const child of childNodes) {
    visitForAnnotation(child, options, nextInsidePlaceholder, nextInsideLinkCard);
  }
};

export const annotateGeneratedPageHtmlLinkContracts = (
  options: AnnotateGeneratedPageHtmlLinkContractsOptions,
): string | undefined => {
  if (typeof options.html !== 'string' || options.html.trim().length === 0) {
    return options.html;
  }

  const document = parse5.parseFragment(options.html);
  visitForAnnotation(document, options);
  return parse5.serialize(document);
};

const requiresClassificationContext = (kind: string | null): boolean =>
  kind === 'internal-document' || kind === 'internal-resource' || kind === 'internal-fragment';

type FullClassificationContextOptions = ValidateGeneratedPageHtmlLinkContractsOptions & {
  readonly siteUrlContext: SiteUrlContext;
  readonly currentUrl: string;
  readonly routeClassificationMode: RouteClassificationMode;
};

const hasFullClassificationContext = (
  options: ValidateGeneratedPageHtmlLinkContractsOptions,
): options is FullClassificationContextOptions =>
  options.siteUrlContext !== undefined &&
  options.currentUrl !== undefined &&
  options.routeClassificationMode !== undefined;

const validateKindHrefShape = (
  node: ElementNode,
  options: ValidateGeneratedPageHtmlLinkContractsOptions,
  href: string,
  kind: string | null,
  surface: string | null,
): void => {
  if (kind === null || isFootnoteStructuralException(node)) return;

  if (hasFullClassificationContext(options) && !isFootnoteStructuralException(node)) {
    let classified: ReturnType<typeof classifyLinkHref>;
    try {
      classified = classifyLinkHref({
        href,
        surface: surface !== null && isLinkSurface(surface) ? surface : 'prose',
        siteUrlContext: options.siteUrlContext,
        currentUrl: options.currentUrl,
        routeClassificationMode: options.routeClassificationMode,
        ...(options.isInternalResourcePathname !== undefined
          ? { isInternalResourcePathname: options.isInternalResourcePathname }
          : {}),
      });
    } catch (error) {
      fail(
        options.sourceLabel,
        `link classification failed for href "${href}": ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
    if (classified.kind !== kind) {
      fail(
        options.sourceLabel,
        `link kind does not match classified href: expected ${classified.kind}, got ${kind}`,
      );
    }
    return;
  }

  if (requiresClassificationContext(kind) && !isFootnoteStructuralException(node)) {
    fail(options.sourceLabel, 'link kind classification context is required');
  }

  if (kind === 'external-web' && !/^(?:https?:)?\/\//iu.test(href)) {
    fail(options.sourceLabel, 'external-web link kind does not match href');
  }
  if (kind === 'external-action' && !/^(?:mailto|tel):/iu.test(href)) {
    fail(options.sourceLabel, 'external-action link kind does not match href');
  }
  if (kind === 'internal-fragment' && !href.startsWith('#')) {
    fail(options.sourceLabel, 'internal-fragment link kind does not match href');
  }
  if (
    (kind === 'internal-document' || kind === 'internal-resource') &&
    /^(?:https?:)?\/\//iu.test(href)
  ) {
    fail(
      options.sourceLabel,
      `${kind} link kind must not use external absolute href without classification context`,
    );
  }
  if (
    (kind === 'internal-document' || kind === 'internal-resource') &&
    /^(?:mailto|tel):/iu.test(href)
  ) {
    fail(options.sourceLabel, `${kind} link kind must not use external-action href`);
  }
};

const validateDownload = (sourceLabel: string, value: string): void => {
  const trimmed = value.trim();
  if (
    trimmed === '.' ||
    trimmed === '..' ||
    /[/\\]/u.test(trimmed) ||
    hasAsciiControlCharacter(trimmed) ||
    Array.from(trimmed).length > 255
  ) {
    fail(sourceLabel, 'invalid download attribute');
  }
};

const validateAnchor = (
  node: ElementNode,
  options: ValidateGeneratedPageHtmlLinkContractsOptions,
  insideLinkCard: boolean,
  insideFooterNav: boolean,
): void => {
  const href = attr(node, 'href');
  if (href === null || href.trim().length === 0) {
    fail(options.sourceLabel, 'anchor href is missing');
  }

  const checkedHref = href;

  const unsafe = detectUnsafeHref(checkedHref);
  if (!unsafe.ok) {
    fail(options.sourceLabel, `unsafe href is forbidden (${unsafe.reason})`);
  }

  const kind = attr(node, 'data-link-kind');
  const surface = attr(node, 'data-link-surface');
  const footnote = isFootnoteStructuralException(node);
  if (!footnote && (kind === null || surface === null)) {
    fail(options.sourceLabel, 'link annotation is missing');
  }
  if (kind !== null && !LINK_KINDS.has(kind as LinkKind)) {
    fail(options.sourceLabel, 'invalid link kind');
  }
  if (surface !== null && !isLinkSurface(surface)) {
    fail(options.sourceLabel, 'invalid link surface');
  }
  if (insideLinkCard && hasClassName(node, 'link-card__link') && surface !== 'card') {
    fail(options.sourceLabel, 'link-card link must use data-link-surface="card"');
  }
  if (kind === 'unsafe') {
    fail(options.sourceLabel, 'unsafe link kind must not be rendered');
  }
  validateKindHrefShape(node, options, checkedHref, kind, surface);
  if (checkedHref === '#' && !footnote) {
    fail(options.sourceLabel, 'marker-less href="#" is forbidden');
  }
  if (attr(node, 'data-external') === 'true' && kind !== 'external-web') {
    fail(options.sourceLabel, 'data-external mismatch');
  }
  if (kind === 'external-web' && attr(node, 'data-external') !== 'true' && !insideFooterNav) {
    fail(options.sourceLabel, 'external-web requires data-external="true"');
  }
  if (kind === 'external-action' && attr(node, 'data-external') === 'true') {
    fail(options.sourceLabel, 'external-action must not render data-external');
  }

  const relTokens = parseRelTokens(attr(node, 'rel') ?? undefined);
  if (relTokens.includes('opener')) {
    fail(options.sourceLabel, 'rel opener is forbidden');
  }
  const target = attr(node, 'target');
  if (target === '_blank' && !relTokens.includes('noopener')) {
    fail(options.sourceLabel, 'target blank requires noopener');
  }
  if (target !== null && target !== '_blank' && target !== '_self') {
    fail(options.sourceLabel, 'invalid target');
  }

  const download = attr(node, 'download');
  if (download !== null && download.length > 0) {
    validateDownload(options.sourceLabel, download);
  }
};

const visit = (
  node: Node,
  options: ValidateGeneratedPageHtmlLinkContractsOptions,
  insidePlaceholder = false,
  insideLinkCard = false,
  insideFooter = false,
  insideFooterNav = false,
): void => {
  const nextInsidePlaceholder =
    insidePlaceholder || (isElementNode(node) && isComponentShadowPlaceholder(node));
  const nextInsideLinkCard = insideLinkCard || (isElementNode(node) && isLinkCardRoot(node));
  const nextInsideFooter = insideFooter || (isElementNode(node) && isFooterRoot(node));
  const nextInsideFooterNav =
    insideFooterNav || (nextInsideFooter && isElementNode(node) && isFooterNavRoot(node));
  if (isElementNode(node) && node.tagName === 'a' && !nextInsidePlaceholder) {
    validateAnchor(node, options, nextInsideLinkCard, nextInsideFooterNav);
  }
  const childNodes = 'childNodes' in node ? node.childNodes : [];
  for (const child of childNodes) {
    visit(
      child,
      options,
      nextInsidePlaceholder,
      nextInsideLinkCard,
      nextInsideFooter,
      nextInsideFooterNav,
    );
  }
};

export const validateGeneratedPageHtmlLinkContracts = (
  options: ValidateGeneratedPageHtmlLinkContractsOptions,
): void => {
  const document = parse5.parseFragment(options.html);
  visit(document, options);
};

export const validateHydratedDomLinkContracts = validateGeneratedPageHtmlLinkContracts;

import type { MemoRecord } from '../data/memos.js';
import { contentIdentityDomKey } from '../content/content-record.js';
import { buildReadingPageProjection } from './reading-page-projection.js';
import { resolveNoteLinkClassificationContext } from '../content/resolve-note-current-url.js';
import {
  resolveDevelopmentSiteUrlContext,
  resolveProductionSiteUrlContext,
} from '../site/site-url-context.js';
import type { BreadcrumbItem } from '../../shared/navigation/navigation-types.js';
export const MEMO_RIGHTS_NOTICE =
  'メモ本文は CC BY 4.0。第三者の画像・引用等は、各権利者の条件に従います。';
export const buildMemoPageProjection = (memo: MemoRecord, memos: readonly MemoRecord[]) => {
  const siteUrlContext = process.env['ROUAULT_SITE_ORIGIN']
    ? resolveProductionSiteUrlContext()
    : resolveDevelopmentSiteUrlContext();
  const linkContext = resolveNoteLinkClassificationContext({
    sourceFilePath: `${memo.sourceRoot}/${memo.identity.sourceRelativePath}`,
    siteUrlContext,
  });
  const reading = buildReadingPageProjection({
    identityKey: contentIdentityDomKey(memo.identity),
    canonicalPathname: memo.canonicalPathname,
    contentHtml: memo.contentHtml,
    title: memo.title,
    tocHeadings: memo.tocHeadings,
    tocCapabilities: memo.tocCapabilities,
    siteUrlContext,
    routeClassificationMode: linkContext.routeClassificationMode,
    ...(memo.date ? { date: memo.date } : {}),
    ...(memo.updated ? { updated: memo.updated } : {}),
    license: memo.license,
  });
  const breadcrumbs: BreadcrumbItem[] = [
    { label: 'メモ', href: `${siteUrlContext.basePath}/memos/` },
  ];
  const segments = memo.slug.split('/');
  for (let index = 1; index < segments.length; index += 1) {
    const parentSlug = segments.slice(0, index).join('/');
    const parent = memos.find((item) => item.slug === parentSlug);
    breadcrumbs.push({
      label: segments[index - 1] ?? '',
      ...(parent ? { href: `${siteUrlContext.basePath}${parent.permalink}` } : {}),
    });
  }
  breadcrumbs.push({ label: memo.title });
  return {
    ...reading,
    noteKind: 'reader' as const,
    noteShellSidebarPresence: 'absent' as const,
    showSidebar: false,
    articleHeader: { ...reading.articleHeader, breadcrumbs },
    rightsNotice: MEMO_RIGHTS_NOTICE,
  };
};

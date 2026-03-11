export interface BreadcrumbSourceNote {
  slug?: string;
  title?: string;
  permalink?: string;
}

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

const normalizeSegmentLabel = (segment: string): string =>
  segment
    .replace(/[-_]+/g, ' ')
    .trim()
    .replace(/\b\p{Letter}/gu, (value) => value.toUpperCase());

export const buildBreadcrumbs = (
  note: BreadcrumbSourceNote | null | undefined,
): BreadcrumbItem[] => {
  if (typeof note?.slug !== 'string' || note.slug.trim().length === 0) {
    return [];
  }

  const slug = note.slug.trim();
  const segments = slug.split('/').filter((segment) => segment.length > 0);
  if (segments.length === 0) {
    return [];
  }

  const breadcrumbs: BreadcrumbItem[] = [{ label: 'Notes', href: '/' }];

  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index];
    if (!segment) {
      continue;
    }

    const isLast = index === segments.length - 1;
    const label =
      isLast && typeof note.title === 'string' && note.title.trim().length > 0
        ? note.title.trim()
        : normalizeSegmentLabel(segment);

    breadcrumbs.push({ label });
  }

  return breadcrumbs;
};

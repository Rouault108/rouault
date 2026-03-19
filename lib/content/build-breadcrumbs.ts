export interface BreadcrumbSourceNote {
  slug?: string;
  title?: string;
  permalink?: string;
  noteKind?: 'leaf' | 'directory-index';
  directoryPath?: string;
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

const getDirectoryLabel = (directoryPath: string): string => {
  const segment = directoryPath.split('/').pop() ?? directoryPath;
  return normalizeSegmentLabel(segment);
};

const resolveDirectoryLabel = (entry: BreadcrumbSourceNote, directoryPath: string): string => {
  if (typeof entry.title === 'string' && entry.title.trim().length > 0) {
    return entry.title.trim();
  }

  return getDirectoryLabel(directoryPath);
};

export const buildBreadcrumbs = (
  note: BreadcrumbSourceNote | null | undefined,
  notes: readonly BreadcrumbSourceNote[] = [],
): BreadcrumbItem[] => {
  if (typeof note?.slug !== 'string' || note.slug.trim().length === 0) {
    return [];
  }

  const slug = note.slug.trim();
  const segments = slug.split('/').filter((segment) => segment.length > 0);
  if (segments.length === 0) {
    return [];
  }

  const directoryIndexMap = new Map<string, { label: string; href?: string }>();

  for (const entry of notes) {
    if (entry.noteKind !== 'directory-index') {
      continue;
    }

    const directoryPath =
      typeof entry.directoryPath === 'string' && entry.directoryPath.trim().length > 0
        ? entry.directoryPath.trim()
        : typeof entry.slug === 'string'
          ? entry.slug.trim()
          : '';

    if (directoryPath.length === 0) {
      continue;
    }

    const href =
      typeof entry.permalink === 'string' && entry.permalink.trim().length > 0
        ? entry.permalink.trim()
        : undefined;

    directoryIndexMap.set(directoryPath, {
      label: resolveDirectoryLabel(entry, directoryPath),
      ...(href !== undefined ? { href } : {}),
    });
  }

  const breadcrumbs: BreadcrumbItem[] = [{ label: 'Notes', href: '/' }];

  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index];
    if (!segment) {
      continue;
    }

    const currentPath = segments.slice(0, index + 1).join('/');
    const isLast = index === segments.length - 1;

    if (isLast) {
      const label =
        note.noteKind === 'directory-index'
          ? getDirectoryLabel(currentPath)
          : typeof note.title === 'string' && note.title.trim().length > 0
            ? note.title.trim()
            : (directoryIndexMap.get(currentPath)?.label ?? normalizeSegmentLabel(segment));

      breadcrumbs.push({ label });
      continue;
    }

    const linkedDirectory = directoryIndexMap.get(currentPath);
    if (linkedDirectory) {
      breadcrumbs.push({
        label: linkedDirectory.label,
        ...(linkedDirectory.href !== undefined ? { href: linkedDirectory.href } : {}),
      });
      continue;
    }

    breadcrumbs.push({
      label: normalizeSegmentLabel(segment),
    });
  }

  return breadcrumbs;
};

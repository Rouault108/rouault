export interface FooterLinkItem {
  readonly href: string;
  readonly label: string;
  readonly external?: boolean;
}

export interface FooterRenderOptions {
  readonly id?: string;
  readonly meta: {
    readonly eyebrow?: string;
    readonly siteName: string;
    readonly siteUrl?: string;
    readonly description?: string;
    readonly copyrightText: string;
    readonly buildLabel?: string;
  };
  readonly links?: readonly FooterLinkItem[];
  readonly a11y?: {
    readonly navLabel?: string;
  };
}

const DEFAULT_SITE_NAME = 'Rouault';
const DEFAULT_SITE_URL = '/';
const DEFAULT_NAV_LABEL = '補助ナビゲーション';

const DEFAULT_LINKS: readonly FooterLinkItem[] = [
  { href: '/search/', label: '検索' },
  { href: '/about/', label: 'このサイトについて' },
];

const normalizeOptionalText = (value: string | undefined): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const resolveDefaultCopyrightText = (): string =>
  `© ${new Date().getFullYear().toString()} Ruo Miyata. CC BY 4.0.`;

const parseFooterLinksJson = (value: string | undefined): readonly FooterLinkItem[] => {
  const normalized = normalizeOptionalText(value);
  if (!normalized) {
    return DEFAULT_LINKS;
  }

  try {
    const parsed: unknown = JSON.parse(normalized);
    if (!Array.isArray(parsed)) {
      return DEFAULT_LINKS;
    }

    return parsed.flatMap((item) => {
      if (typeof item !== 'object' || item === null) {
        return [];
      }

      const candidate = item as Record<string, unknown>;
      if (typeof candidate['href'] !== 'string' || typeof candidate['label'] !== 'string') {
        return [];
      }

      return [
        {
          href: candidate['href'],
          label: candidate['label'],
          ...(typeof candidate['external'] === 'boolean'
            ? { external: candidate['external'] }
            : {}),
        },
      ];
    });
  } catch {
    return DEFAULT_LINKS;
  }
};

export const buildLayoutFooterOptions = ({
  footerId,
  siteEyebrow,
  siteName,
  siteUrl,
  siteDescription,
  copyrightText,
  buildLabel,
  navLabel,
  linksJson,
}: {
  footerId: string | undefined;
  siteEyebrow: string | undefined;
  siteName: string | undefined;
  siteUrl: string | undefined;
  siteDescription: string | undefined;
  copyrightText: string | undefined;
  buildLabel: string | undefined;
  navLabel: string | undefined;
  linksJson: string | undefined;
}): FooterRenderOptions => {
  const normalizedFooterId = normalizeOptionalText(footerId);
  const normalizedSiteUrl = normalizeOptionalText(siteUrl) ?? DEFAULT_SITE_URL;
  const resolvedBuildLabel = normalizeOptionalText(buildLabel);
  const resolvedDescription = normalizeOptionalText(siteDescription);
  const resolvedEyebrow = normalizeOptionalText(siteEyebrow);

  const meta: FooterRenderOptions['meta'] = {
    ...(resolvedEyebrow ? { eyebrow: resolvedEyebrow } : {}),
    siteName: normalizeOptionalText(siteName) ?? DEFAULT_SITE_NAME,
    ...(normalizedSiteUrl ? { siteUrl: normalizedSiteUrl } : {}),
    ...(resolvedDescription ? { description: resolvedDescription } : {}),
    copyrightText: normalizeOptionalText(copyrightText) ?? resolveDefaultCopyrightText(),
    ...(resolvedBuildLabel ? { buildLabel: resolvedBuildLabel } : {}),
  };

  return {
    ...(normalizedFooterId ? { id: normalizedFooterId } : {}),
    meta,
    links: parseFooterLinksJson(linksJson),
    a11y: {
      navLabel: normalizeOptionalText(navLabel) ?? DEFAULT_NAV_LABEL,
    },
  };
};

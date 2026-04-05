import { LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import {
  ensureFooterDocumentStyles,
  renderFooter,
  type FooterLinkItem,
  type FooterRenderOptions,
} from '../ui/footer/footer.js';
import { loadBuildMetadataData } from '../../data/buildMetadata.js';

const DEFAULT_SITE_NAME = 'Rouault';
const DEFAULT_SITE_URL = '/';
const DEFAULT_NAV_LABEL = '補助ナビゲーション';

const DEFAULT_LINKS: readonly FooterLinkItem[] = [
  { href: '/search', label: '検索' },
  { href: '/about/', label: 'このサイトについて' },
];

const normalizeOptionalText = (value: string | undefined): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const escapePlainText = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

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
  const resolvedBuildLabel =
    normalizeOptionalText(buildLabel) ?? loadBuildMetadataData().buildLabel;
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

@customElement('layout-footer')
export class LayoutFooter extends LitElement {
  @property({ type: String, attribute: 'footer-id' })
  footerId?: string;

  @property({ type: String, attribute: 'site-eyebrow' })
  siteEyebrow?: string;

  @property({ type: String, attribute: 'site-name' })
  siteName?: string;

  @property({ type: String, attribute: 'site-url' })
  siteUrl?: string;

  @property({ type: String, attribute: 'site-description' })
  siteDescription?: string;

  @property({ type: String, attribute: 'copyright-text' })
  copyrightText?: string;

  @property({ type: String, attribute: 'build-label' })
  buildLabel?: string;

  @property({ type: String, attribute: 'nav-label' })
  navLabel?: string;

  @property({ type: String, attribute: 'links-json' })
  linksJson?: string;

  override createRenderRoot(): this {
    return this;
  }

  override connectedCallback(): void {
    ensureFooterDocumentStyles();
    super.connectedCallback();
  }

  override render() {
    return renderFooter(
      buildLayoutFooterOptions({
        footerId: this.footerId,
        siteEyebrow: this.siteEyebrow,
        siteName: this.siteName,
        siteUrl: this.siteUrl,
        siteDescription: this.siteDescription,
        copyrightText: this.copyrightText,
        buildLabel: this.buildLabel,
        navLabel: this.navLabel,
        linksJson: this.linksJson,
      }),
    );
  }
}

export const escapeLayoutFooterAttribute = (value: string): string => escapePlainText(value);

declare global {
  interface HTMLElementTagNameMap {
    'layout-footer': LayoutFooter;
  }
}

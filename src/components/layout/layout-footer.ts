import { LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import {
  ensureFooterDocumentStyles,
  renderFooter,
  type FooterLinkItem,
  type FooterRenderOptions,
} from '../ui/footer/footer';

declare const __GIT_HASH__: string | undefined;

const DEFAULT_SITE_NAME = 'Rouault';
const DEFAULT_SITE_URL = '/';
const DEFAULT_NAV_LABEL = '補助ナビゲーション';

const DEFAULT_LINKS: readonly FooterLinkItem[] = [
  { href: '/about', label: 'このサイトについて' },
  { href: '/contact', label: 'お問い合わせ' },
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

const resolveDefaultBuildLabel = (): string | undefined => {
  const gitHash = normalizeOptionalText(__GIT_HASH__);
  return gitHash ? `build ${gitHash}` : undefined;
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
  siteName,
  siteUrl,
  copyrightText,
  buildLabel,
  navLabel,
  linksJson,
}: {
  footerId: string | undefined;
  siteName: string | undefined;
  siteUrl: string | undefined;
  copyrightText: string | undefined;
  buildLabel: string | undefined;
  navLabel: string | undefined;
  linksJson: string | undefined;
}): FooterRenderOptions => {
  const normalizedFooterId = normalizeOptionalText(footerId);
  const normalizedSiteUrl = normalizeOptionalText(siteUrl) ?? DEFAULT_SITE_URL;
  const resolvedBuildLabel = normalizeOptionalText(buildLabel) ?? resolveDefaultBuildLabel();

  const meta: FooterRenderOptions['meta'] = {
    siteName: normalizeOptionalText(siteName) ?? DEFAULT_SITE_NAME,
    copyrightText: normalizeOptionalText(copyrightText) ?? resolveDefaultCopyrightText(),
    ...(normalizedSiteUrl ? { siteUrl: normalizedSiteUrl } : {}),
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
  private _didInitializeFromSsr = false;

  @property({ type: String, attribute: 'footer-id' })
  footerId?: string;

  @property({ type: String, attribute: 'site-name' })
  siteName?: string;

  @property({ type: String, attribute: 'site-url' })
  siteUrl?: string;

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

    if (!this._didInitializeFromSsr) {
      // 初回接続時のみ SSR のライトDOMを除去して、Lit の再描画と重複させない。
      this.replaceChildren();
      this._didInitializeFromSsr = true;
    }

    super.connectedCallback();
  }

  override render() {
    return renderFooter(
      buildLayoutFooterOptions({
        footerId: this.footerId,
        siteName: this.siteName,
        siteUrl: this.siteUrl,
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

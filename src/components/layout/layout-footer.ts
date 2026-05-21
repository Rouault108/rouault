import { LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import {
  ensureFooterDocumentStyles,
  renderFooter,
} from '../ui/footer/footer.js';
import { buildLayoutFooterOptions } from '../../layouts/footer-options.js';

const escapePlainText = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const hasDirectFooterChild = (host: HTMLElement): boolean =>
  Array.from(host.children).some(
    (child) => child instanceof HTMLElement && child.classList.contains('ui-footer'),
  );

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

  private _manualDomMode = false;
  private _allowClientRender = true;

  override createRenderRoot(): this {
    return this;
  }

  override connectedCallback(): void {
    ensureFooterDocumentStyles();
    this._manualDomMode = hasDirectFooterChild(this);
    this._allowClientRender = !this._manualDomMode;
    super.connectedCallback();
  }

  protected override performUpdate(): void {
    if (!this._allowClientRender) {
      return;
    }

    super.performUpdate();
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

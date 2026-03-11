import { LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { type UiFooterRenderOptions, renderFooter } from '../ui/footer/footer';

@customElement('layout-footer')
export class LayoutFooter extends LitElement {
  private _didInitializeFromSsr = false;

  @property({ type: String })
  revision?: string;

  @property({ type: Number })
  year?: number;

  override createRenderRoot(): this {
    return this;
  }

  override connectedCallback(): void {
    if (!this._didInitializeFromSsr) {
      // 初回接続時のみ SSR のライトDOMを除去して、Lit の再描画と重複させない。
      this.replaceChildren();
      this._didInitializeFromSsr = true;
    }

    super.connectedCallback();
  }

  override render() {
    const options: UiFooterRenderOptions = {
      ...(typeof this.revision === 'string' ? { revision: this.revision } : {}),
      ...(typeof this.year === 'number' ? { year: this.year } : {}),
    };
    return renderFooter(options);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'layout-footer': LayoutFooter;
  }
}

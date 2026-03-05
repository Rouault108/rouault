import { LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import {
  FOOTER_DEFAULT_APP_NAME,
  type UiFooterRenderOptions,
  renderFooter,
} from '../ui/footer/footer';

@customElement('layout-footer')
export class LayoutFooter extends LitElement {
  @property({ type: String, attribute: 'app-name' })
  appName = FOOTER_DEFAULT_APP_NAME;

  @property({ type: String })
  revision?: string;

  @property({ type: Number })
  year?: number;

  override createRenderRoot(): this {
    return this;
  }

  override render() {
    const options: UiFooterRenderOptions = {
      appName: this.appName,
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

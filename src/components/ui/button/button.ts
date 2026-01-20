import { LionButton } from '@lion/ui/button.js';
import { css } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('ui-button')
export class UiButton extends LionButton {
  static override styles = [
    ...LionButton.styles,
    css`
      :host {
        --btn-bg: #007bff;
        --btn-color: white;
        --btn-radius: 4px;
        --btn-padding: 8px 16px;
        
        /* Lion のデフォルトを上書き */
        background-color: var(--btn-bg);
        color: var(--btn-color);
        border-radius: var(--btn-radius);
        padding: var(--btn-padding);
      }
      /* フォーカス時 */
      :host(:focus:not([disabled])),
      :host(:focus-visible) {
        outline: 2px solid #007bff;
        outline-offset: 2px;
      }
      /* ホバー時 */
      :host(:hover) {
        opacity: 0.9;
      }
      /* バリアント */
      :host([variant="secondary"]) {
        --btn-bg: #6c757d;
      }
      :host([variant="outline"]) {
        background: transparent;
        border: 1px solid var(--btn-bg);
        color: var(--btn-bg);
      }
    `
  ];
  @property({ type: String, reflect: true })
  variant: 'primary' | 'secondary' | 'outline' = 'primary';
}

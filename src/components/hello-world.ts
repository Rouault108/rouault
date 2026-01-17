import { html, css, LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('hello-world')
export class HelloWorld extends LitElement {
  static override styles = css`
    p {
      color: blue;
      font-weight: bold;
    }
  `;

  @property({ type: String }) override accessor title = 'Hello World';

  override render() {
    return html`<p>Hello ${this.title}!</p>`;
  }
}

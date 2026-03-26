import '../../../icons/register.js';
import type { IconName } from '../../../icons/catalog.js';

const NAME_ATTRIBUTE = 'name';
const ARIA_LABEL_ATTRIBUTE = 'aria-label';

export class UiIcon extends HTMLElement {
  static readonly observedAttributes = [NAME_ATTRIBUTE, ARIA_LABEL_ATTRIBUTE];

  private readonly glyph = document.createElement('ui-icon');

  constructor() {
    super();

    this.glyph.setAttribute('part', 'glyph');
    this.glyph.style.inlineSize = '1em';
    this.glyph.style.blockSize = '1em';
    this.glyph.style.display = 'inline-block';
  }

  get name(): IconName | null {
    const value = this.getAttribute(NAME_ATTRIBUTE);
    return value === null ? null : (value as IconName);
  }

  set name(value: IconName | null) {
    if (value === null) {
      this.removeAttribute(NAME_ATTRIBUTE);
      return;
    }

    this.setAttribute(NAME_ATTRIBUTE, value);
  }

  connectedCallback(): void {
    this.#ensureHostPresentation();
    this.#sync();
  }

  attributeChangedCallback(): void {
    this.#sync();
  }

  #ensureHostPresentation(): void {
    if (this.style.display.length === 0) {
      this.style.display = 'inline-flex';
    }

    if (this.style.alignItems.length === 0) {
      this.style.alignItems = 'center';
    }

    if (this.style.justifyContent.length === 0) {
      this.style.justifyContent = 'center';
    }

    if (this.style.lineHeight.length === 0) {
      this.style.lineHeight = '1';
    }
  }

  #sync(): void {
    const name = this.getAttribute(NAME_ATTRIBUTE)?.trim();

    if (!name) {
      this.replaceChildren();
      return;
    }

    if (this.glyph.parentElement !== this) {
      this.replaceChildren(this.glyph);
    }

    this.glyph.setAttribute('icon', name);

    const ariaLabel = this.getAttribute(ARIA_LABEL_ATTRIBUTE)?.trim();
    if (ariaLabel && ariaLabel.length > 0) {
      this.setAttribute('role', 'img');
      this.glyph.setAttribute('aria-hidden', 'false');
      this.glyph.setAttribute('aria-label', ariaLabel);
    } else {
      this.removeAttribute('role');
      this.glyph.setAttribute('aria-hidden', 'true');
      this.glyph.removeAttribute('aria-label');
    }
  }
}

if (!customElements.get('ui-icon')) {
  customElements.define('ui-icon', UiIcon);
}

declare global {
  interface HTMLElementTagNameMap {
    'ui-icon': UiIcon;
  }
}
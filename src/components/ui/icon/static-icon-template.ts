import { html, type TemplateResult } from 'lit';
import { unsafeSVG } from 'lit/directives/unsafe-svg.js';
import {
  resolveStaticIconBody,
  STATIC_ICON_VIEWBOX,
  type IconName,
} from '../../../../shared/icons/icon-paths.js';

export const renderStaticIconTemplate = (
  name: IconName,
  className?: string,
): TemplateResult => html`
  <svg
    class=${className ?? ''}
    viewBox=${STATIC_ICON_VIEWBOX}
    aria-hidden="true"
    focusable="false"
    data-icon=${name}
  >
    ${unsafeSVG(resolveStaticIconBody(name))}
  </svg>
`;

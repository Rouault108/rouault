import { html, type TemplateResult } from 'lit';
import { unsafeSVG } from 'lit/directives/unsafe-svg.js';
import { LUCIDE_SUBSET } from '../../../generated/lucide-subset.js';
import type { IconName } from '../../../../shared/icons/icons-catalog.js';

interface IconDefinition {
  readonly body?: string;
}

interface IconAliasDefinition {
  readonly parent: string;
  readonly hFlip?: boolean;
  readonly vFlip?: boolean;
  readonly rotate?: number;
}

const icons = LUCIDE_SUBSET.icons as Record<string, IconDefinition>;
const aliases = LUCIDE_SUBSET.aliases as Record<string, IconAliasDefinition | undefined>;

const resolveIconBody = (name: IconName): string => {
  const direct = icons[name]?.body;
  if (typeof direct === 'string' && direct.length > 0) {
    return direct;
  }

  const alias = aliases[name];
  if (alias !== undefined) {
    if (alias.hFlip === true || alias.vFlip === true || typeof alias.rotate === 'number') {
      throw new Error(`Static icon alias must not require transform: "${name}".`);
    }

    const parentBody = icons[alias.parent]?.body;
    if (typeof parentBody === 'string' && parentBody.length > 0) {
      return parentBody;
    }
  }

  throw new Error(`Unknown static icon: "${name}".`);
};

export const renderStaticIconTemplate = (
  name: IconName,
  className?: string,
): TemplateResult => html`
  <svg
    class=${className ?? ''}
    viewBox="0 0 ${String(LUCIDE_SUBSET.width)} ${String(LUCIDE_SUBSET.height)}"
    aria-hidden="true"
    focusable="false"
    data-icon=${name}
  >
    ${unsafeSVG(resolveIconBody(name))}
  </svg>
`;

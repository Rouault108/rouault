import { LUCIDE_SUBSET } from '../../src/generated/lucide-subset.js';

export const ICON_NAMES = [
  'alert-circle',
  'alert-octagon',
  'alert-triangle',
  'archive',
  'arrow-left',
  'blend',
  'bold',
  'book-marked',
  'book-open',
  'calendar-clock',
  'captions',
  'captions-off',
  'check',
  'check-circle',
  'chevron-down',
  'chevron-left',
  'chevron-right',
  'chevron-up',
  'chevrons-up-down',
  'circle-check',
  'circle-help',
  'circle-x',
  'clipboard-list',
  'clock-3',
  'construction',
  'copy',
  'ellipsis',
  'fast-forward',
  'file',
  'file-code',
  'file-image',
  'file-pen',
  'file-plus',
  'file-search',
  'file-text',
  'film',
  'folder',
  'folder-open',
  'history',
  'home',
  'house',
  'image',
  'image-off',
  'inbox',
  'info',
  'italic',
  'layers-3',
  'lightbulb',
  'link',
  'loader-circle',
  'maximize',
  'menu',
  'minimize',
  'monitor',
  'moon',
  'moon-star',
  'more-horizontal',
  'music',
  'panel-left',
  'pause',
  'play',
  'printer',
  'rewind',
  'rotate-ccw',
  'rotate-cw',
  'save',
  'scale',
  'search',
  'search-x',
  'settings',
  'settings-2',
  'shield',
  'shield-alert',
  'smartphone',
  'square',
  'star',
  'sun',
  'sun-moon',
  'tablet',
  'tag',
  'trash-2',
  'triangle-alert',
  'underline',
  'volume-1',
  'volume-2',
  'volume-x',
  'x',
] as const;

export type IconName = (typeof ICON_NAMES)[number];

const ICON_NAME_SET = new Set<string>(ICON_NAMES);

export const isIconName = (value: string): value is IconName => ICON_NAME_SET.has(value);

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

export const STATIC_ICON_VIEWBOX = `0 0 ${String(LUCIDE_SUBSET.width)} ${String(
  LUCIDE_SUBSET.height,
)}`;

export const resolveStaticIconBody = (name: IconName): string => {
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

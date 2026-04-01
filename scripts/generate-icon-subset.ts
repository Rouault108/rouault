import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

import lucideCollection from '@iconify-json/lucide/icons.json' with { type: 'json' };
import { ICON_NAMES } from '../shared/icons/icons-catalog.js';

interface IconifyAliasDefinition {
  readonly parent: string;
  readonly rotate?: number;
  readonly hFlip?: boolean;
  readonly vFlip?: boolean;
}

interface IconifyCollection {
  readonly prefix: string;
  readonly width?: number;
  readonly height?: number;
  readonly icons: Record<string, unknown>;
  readonly aliases?: Record<string, IconifyAliasDefinition>;
}

const collection = lucideCollection as IconifyCollection;

const icons: Record<string, unknown> = {};
const aliases: Record<string, IconifyAliasDefinition> = {};

const includeIcon = (name: string): void => {
  if (name in icons || name in aliases) {
    return;
  }

  const icon = collection.icons[name];
  if (icon !== undefined) {
    icons[name] = icon;
    return;
  }

  const alias = collection.aliases?.[name];
  if (alias !== undefined) {
    aliases[name] = alias;
    includeIcon(alias.parent);
    return;
  }

  throw new Error(`Unknown Lucide icon name: ${name}`);
};

for (const name of ICON_NAMES) {
  includeIcon(name);
}

const orderedIcons = Object.fromEntries(
  [...Object.entries(icons)].sort(([left], [right]) => left.localeCompare(right)),
);

const orderedAliases = Object.fromEntries(
  [...Object.entries(aliases)].sort(([left], [right]) => left.localeCompare(right)),
);

const subset = {
  prefix: collection.prefix,
  ...(typeof collection.width === 'number' ? { width: collection.width } : {}),
  ...(typeof collection.height === 'number' ? { height: collection.height } : {}),
  icons: orderedIcons,
  ...(Object.keys(orderedAliases).length > 0 ? { aliases: orderedAliases } : {}),
};

const output = `/**
 * このファイルは scripts/generate-icon-subset.ts により自動生成されます。
 * 手編集しないでください。
 */
export const LUCIDE_SUBSET = ${JSON.stringify(subset, null, 2)} as const;
`;

const outputPath = resolve('src/generated/lucide-subset.ts');

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, output, 'utf8');

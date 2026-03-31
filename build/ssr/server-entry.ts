import { SSR_TARGET_TAGS, type SsrTargetTag } from './targets.js';
import { type SsrAttribute } from './attributes.js';
import {
  collectSsrDocumentStyles,
  renderSsrTarget,
} from './target-adapters.js';
import { type SsrDocumentStyleDefinition } from './target-definitions.js';

export { SSR_TARGET_TAGS };
export type { SsrAttribute, SsrDocumentStyleDefinition };

export const renderCustomElement = async (
  tagName: SsrTargetTag,
  attributes: readonly SsrAttribute[],
  innerHtml: string,
): Promise<string> => renderSsrTarget(tagName, attributes, innerHtml);

export const collectDocumentStylesForTags = (
  tagNames: Iterable<string>,
): SsrDocumentStyleDefinition[] => collectSsrDocumentStyles(tagNames);
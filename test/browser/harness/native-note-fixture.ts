import { toHtml } from 'hast-util-to-html';
import type { HastNode } from '../../../build/rehype/hast-utils.js';
import { lowerNativeNoteTree } from '../../../build/rehype/native-note-lowering.js';
import { createStaticRenderIdContext } from '../../../shared/static-render-id-context.js';
import { fixture } from './browser-fixture.js';

export {
  nativeElement as element,
  nativeText as text,
} from '../../../build/rehype/native-note-hast.js';

export const nativeNoteFixture = async <T extends HTMLElement = HTMLElement>(
  node: HastNode,
  profile: 'reader' | 'demo' = 'demo',
): Promise<T> => {
  const tree = structuredClone(node);
  lowerNativeNoteTree(tree, {
    idContext: createStaticRenderIdContext('browser-fixture'),
    previewProfile: profile,
    documentUrl: document.baseURI,
  });
  return fixture<T>(toHtml(tree as Parameters<typeof toHtml>[0]));
};

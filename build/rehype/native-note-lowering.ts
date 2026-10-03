import type { StaticRenderIdContext } from '../../shared/static-render-id-context.js';
import type { HastNode } from './hast-utils.js';
import { lowerNativeTranslation } from './native-translation.js';
import { lowerNativeTabs } from './native-tabs.js';
import { lowerNativeCodePreview } from './native-code-preview.js';
import { lowerNativePreviewSandbox } from './native-preview-sandbox.js';
import { lowerNativeVideo } from './native-video.js';

export interface NativeNoteLoweringOptions {
  readonly idContext: StaticRenderIdContext;
  readonly previewProfile?: 'reader' | 'demo';
  readonly documentUrl?: string;
}

export const lowerNativeNoteTree = (root: HastNode, options: NativeNoteLoweringOptions): void => {
  const visit = (node: HastNode): void => {
    // Sandboxのinert payloadは文書DOMではなく、別のsecurity境界に属する。
    if (node.tagName === 'template') return;
    for (const child of node.children ?? []) visit(child);
    switch (node.tagName) {
      case 'ui-translation':
        lowerNativeTranslation(node);
        break;
      case 'ui-tabs':
        lowerNativeTabs(node, options.idContext);
        break;
      case 'ui-code-preview':
        if (!options.previewProfile)
          throw new Error('[code-preview] resolved profile の明示入力が必要です');
        lowerNativeCodePreview(node, options.idContext, options.previewProfile);
        break;
      case 'ui-preview-sandbox':
        if (!options.documentUrl)
          throw new Error('[preview-sandbox] embedding document URL の明示入力が必要です');
        lowerNativePreviewSandbox(node, options.documentUrl);
        break;
      case 'ui-video':
        lowerNativeVideo(node, options.idContext);
        break;
    }
  };
  visit(root);
};

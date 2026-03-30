import type { ImagePayload } from '../payload/payload-types.js';
import type { MdastNode } from '../types.js';

const buildImageProperties = (payload: ImagePayload): Record<string, unknown> => ({
  ...(payload.loading ? { loading: payload.loading } : {}),
  ...(typeof payload.width === 'number' ? { width: payload.width } : {}),
  ...(typeof payload.height === 'number' ? { height: payload.height } : {}),
  ...(typeof payload.zoomable === 'boolean' ? { zoomable: payload.zoomable ? 'true' : 'false' } : {}),
});

export const adaptImageOutput = (node: MdastNode): MdastNode => {
  const payload = node.rouaultImagePayload as ImagePayload | undefined;
  if (!payload) {
    return node;
  }

  const properties = buildImageProperties(payload);
  if (Object.keys(properties).length === 0) {
    return node;
  }

  return {
    ...node,
    data: {
      ...(node.data ?? {}),
      hProperties: {
        ...(node.data?.hProperties ?? {}),
        ...properties,
      },
    },
  };
};

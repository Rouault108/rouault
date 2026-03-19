import type { MdastNode, VFileLike } from '../types';

export const getNodeLocation = (node: MdastNode): string => {
  const line = node.position?.start?.line;
  const column = node.position?.start?.column;
  if (typeof line === 'number' && typeof column === 'number') {
    return `:${String(line)}:${String(column)}`;
  }
  return '';
};

export const toError = (file: VFileLike | undefined, node: MdastNode, message: string): Error => {
  const sourcePath = file?.path ?? 'unknown file';
  return new Error(`[markdown] ${message}: ${sourcePath}${getNodeLocation(node)}`);
};

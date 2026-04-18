import { getDirectiveNameFromNode } from '../grammar/directive-grammar.js';
import type { MdastNode, VFileLike } from '../types.js';
import { adaptSyntaxCardOutput, type AdaptRemarkNode } from './adapt-syntax-output.js';

export const adaptCompoundFamilyOutput = (
  node: MdastNode,
  adaptNode: AdaptRemarkNode,
  file?: VFileLike,
): MdastNode | null => {
  const directiveName = getDirectiveNameFromNode(node);
  if (directiveName === 'syntax-card') {
    return adaptSyntaxCardOutput(node, adaptNode, file);
  }

  return null;
};

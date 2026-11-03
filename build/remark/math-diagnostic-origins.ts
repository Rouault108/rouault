import type { Nodes, Root } from 'mdast';
import type { Plugin } from 'unified';
import {
  getMathStartPosition,
  registerMathNodeOrigin,
  type MathDiagnosticOrigin,
} from '../content/math-diagnostic-origin.js';

const includeOrigin = (
  node: Nodes,
): Extract<MathDiagnosticOrigin, { kind: 'include' }> | undefined => {
  if (!('rouaultExpansionSource' in node)) return undefined;
  const expansion = node.rouaultExpansionSource;
  if (
    typeof expansion !== 'object' ||
    expansion === null ||
    !('kind' in expansion) ||
    expansion.kind !== 'example-include-expanded'
  )
    return undefined;
  return {
    kind: 'include',
    ...('ref' in expansion && typeof expansion.ref === 'string' ? { ref: expansion.ref } : {}),
  };
};

// 最終remark変換の後に注釈し、include parserの構文や位置情報は変更しない。
export const remarkMathDiagnosticOrigins: Plugin<[], Root> =
  () =>
  (tree, file): void => {
    const visit = (
      node: Nodes,
      inheritedInclude?: Extract<MathDiagnosticOrigin, { kind: 'include' }>,
    ): void => {
      const included = includeOrigin(node) ?? inheritedInclude;
      if (
        node.type === 'math' ||
        node.type === 'inlineMath' ||
        (node.type === 'code' && node.lang?.split(/\s+/u)[0] === 'math')
      ) {
        const position = getMathStartPosition(node.position);
        const origin: MathDiagnosticOrigin = included ?? {
          kind: 'document',
          ...(position ? { position } : {}),
        };
        node.data ??= {};
        node.data.hProperties ??= {};
        registerMathNodeOrigin(file, node.data.hProperties, origin);
      }
      if ('children' in node) node.children.forEach((child) => visit(child, included));
    };
    visit(tree);
  };

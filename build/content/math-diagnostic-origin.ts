import type { VFile } from 'vfile';

export interface MathDiagnosticPosition {
  readonly line: number;
  readonly column: number;
}
export type MathDiagnosticOrigin =
  | { readonly kind: 'document'; readonly position?: MathDiagnosticPosition }
  | { readonly kind: 'include'; readonly ref?: string };

interface MathDiagnosticOriginState {
  readonly nodes: Map<string, MathDiagnosticOrigin>;
  readonly messages: WeakMap<object, MathDiagnosticOrigin>;
}

declare module 'vfile' {
  interface DataMap {
    rouaultMathDiagnosticOrigins?: MathDiagnosticOriginState;
  }
}

// refや原稿pathを属性へ埋めず、HAST変換を渡る短命な識別子だけを置く。
const originProperty = 'dataRouaultMathDiagnosticOrigin';
const originAttribute = 'data-rouault-math-diagnostic-origin';
const getState = (file: VFile): MathDiagnosticOriginState =>
  (file.data.rouaultMathDiagnosticOrigins ??= {
    nodes: new Map(),
    messages: new WeakMap(),
  });

export const getMathStartPosition = (
  position: { readonly start?: { readonly line?: number; readonly column?: number } } | undefined,
): MathDiagnosticPosition | undefined => {
  const start = position?.start;
  if (
    typeof start?.line !== 'number' ||
    typeof start.column !== 'number' ||
    !Number.isInteger(start.line) ||
    !Number.isInteger(start.column) ||
    start.line < 1 ||
    start.column < 1
  )
    return undefined;
  return { line: start.line, column: start.column };
};

export const registerMathNodeOrigin = (
  file: VFile,
  properties: Record<string, unknown>,
  origin: MathDiagnosticOrigin,
): void => {
  const state = getState(file);
  const token = String(state.nodes.size);
  state.nodes.set(token, origin);
  properties[originProperty] = token;
};

export const takeMathNodeOrigin = (
  file: VFile,
  properties: Record<string, unknown>,
): MathDiagnosticOrigin | undefined => {
  const token = properties[originProperty] ?? properties[originAttribute];
  delete properties['dataRouaultMathDiagnosticOrigin'];
  delete properties['data-rouault-math-diagnostic-origin'];
  return typeof token === 'string' || typeof token === 'number'
    ? file.data.rouaultMathDiagnosticOrigins?.nodes.get(String(token))
    : undefined;
};

export const recordMathDiagnosticOrigin = (
  file: VFile,
  message: VFile['messages'][number],
  origin: MathDiagnosticOrigin,
): void => {
  getState(file).messages.set(message, origin);
};

// HAST位置だけからincludeか原稿かを復元しない。記録がなければ位置不明として扱う。
export const getMathDiagnosticOrigin = (
  file: VFile,
  message: VFile['messages'][number],
): MathDiagnosticOrigin | undefined =>
  file.data.rouaultMathDiagnosticOrigins?.messages.get(message);

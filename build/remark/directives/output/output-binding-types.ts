import type { MdastNode } from '../types.js';

export interface RemarkOutputBinding {
  readonly hName: string;
  readonly hProperties?: Record<string, unknown>;
  readonly children?: MdastNode[];
}

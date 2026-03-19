export interface MdastNodeData {
  hName?: string;
  hProperties?: Record<string, unknown>;
}

export interface MdastNode {
  type?: string;
  value?: string;
  lang?: string;
  meta?: string;
  url?: string;
  title?: string | null;
  alt?: string | null;
  children?: MdastNode[];
  data?: MdastNodeData;
  position?: {
    start?: {
      line?: number;
      column?: number;
      offset?: number;
    };
    end?: {
      line?: number;
      column?: number;
      offset?: number;
    };
  };
}

export interface VFileLike {
  path?: string;
  value?: unknown;
}

export type DirectiveName =
  | 'callout'
  | 'code-group'
  | 'code-preview'
  | 'preview-sandbox'
  | 'details'
  | 'info-box'
  | 'link-card'
  | 'score'
  | 'tabs'
  | 'translation'
  | 'preview'
  | 'toolbar'
  | 'tab'
  | 'panel';

export interface DirectiveMarker {
  readonly name: DirectiveName;
  readonly attrsSource: string;
  readonly node: MdastNode;
}

export interface DirectiveHandler {
  readonly name: DirectiveName;
  toNode(
    marker: DirectiveMarker,
    children: MdastNode[],
    attrs: Record<string, string>,
    file?: VFileLike,
  ): MdastNode;
}

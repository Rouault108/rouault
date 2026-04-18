export interface MdastNodeData {
  hName?: string;
  hProperties?: Record<string, unknown>;
}

export interface RouaultDirectiveState {
  readonly name: DirectiveName;
  readonly rawAttributes: Record<string, string>;
  payload?: unknown;
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
  rouaultDirective?: RouaultDirectiveState;
  rouaultCodeBlockPayload?: unknown;
  rouaultImagePayload?: unknown;
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
  | 'translation-overlay'
  | 'preview'
  | 'toolbar'
  | 'tab'
  | 'panel'
  | 'syntax-card'
  | 'syntax-signature'
  | 'syntax-section'
  | 'syntax-fields'
  | 'syntax-field';

export interface DirectiveMarker {
  readonly name: DirectiveName;
  readonly attrsSource: string;
  readonly node: MdastNode;
}

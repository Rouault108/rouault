export type RehypeLinkContractErrorReason =
  | 'unsafe-link-href'
  | 'unsafe-url-bearing-attribute'
  | 'invalid-link-kind'
  | 'invalid-link-surface'
  | 'invalid-target'
  | 'missing-rel-noopener'
  | 'forbidden-rel-token'
  | 'url-with-credentials';

export class RehypeLinkContractError extends Error {
  override readonly name = 'RehypeLinkContractError';
  readonly reason: RehypeLinkContractErrorReason;
  readonly sourceLabel: string;
  constructor(options: {
    readonly reason: RehypeLinkContractErrorReason;
    readonly sourceLabel: string;
    readonly message: string;
  }) {
    super(`[rehype-link-contract:${options.sourceLabel}] ${options.message}`);
    this.reason = options.reason;
    this.sourceLabel = options.sourceLabel;
  }
}

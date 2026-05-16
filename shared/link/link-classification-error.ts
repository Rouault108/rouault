export type LinkClassificationContractErrorReason =
  | 'invalid-relative-url'
  | 'invalid-current-url'
  | 'invalid-site-url-context'
  | 'missing-route-classification-context'
  | 'invalid-route-classification-mode';

export class LinkClassificationContractError extends Error {
  override readonly name = 'LinkClassificationContractError';
  readonly reason: LinkClassificationContractErrorReason;

  constructor(reason: LinkClassificationContractErrorReason, message: string) {
    super(message);
    this.reason = reason;
  }
}

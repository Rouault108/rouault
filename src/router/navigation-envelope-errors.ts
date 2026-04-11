export class NavigationEnvelopeContractError extends Error {
  override name = 'NavigationEnvelopeContractError' as const;
}

export class NavigationEnvelopeBuildMismatchError extends NavigationEnvelopeContractError {
  readonly currentBuildId: string;
  readonly envelopeBuildId: string;
  readonly normalizedUrl: string;

  constructor(options: {
    currentBuildId: string;
    envelopeBuildId: string;
    normalizedUrl: string;
  }) {
    super(
      `navigation envelope buildId mismatch: current=${options.currentBuildId}, envelope=${options.envelopeBuildId}, url=${options.normalizedUrl}`,
    );
    this.currentBuildId = options.currentBuildId;
    this.envelopeBuildId = options.envelopeBuildId;
    this.normalizedUrl = options.normalizedUrl;
  }
}

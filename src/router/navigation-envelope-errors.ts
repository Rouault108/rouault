export class NavigationEnvelopeContractError extends Error {
  override name = 'NavigationEnvelopeContractError' as const;
}

export class CurrentBuildMetadataInvalidError extends NavigationEnvelopeContractError {
  override name = 'CurrentBuildMetadataInvalidError' as const;

  constructor(
    readonly field: 'buildId' | 'generatedAt',
    readonly reason: string,
  ) {
    super(`current ${field} is invalid: ${reason}`);
  }
}

export class NavigationEnvelopeMetadataMismatchError extends NavigationEnvelopeContractError {
  override name = 'NavigationEnvelopeMetadataMismatchError' as const;

  constructor(
    readonly field: 'buildId' | 'generatedAt',
    readonly currentValue: string,
    readonly envelopeValue: string,
    readonly normalizedUrl: string,
  ) {
    super(
      `navigation envelope ${field} mismatch: current=${currentValue}, envelope=${envelopeValue}, url=${normalizedUrl}`,
    );
  }
}

export class NavigationEnvelopeBuildMismatchError extends NavigationEnvelopeMetadataMismatchError {
  override name = 'NavigationEnvelopeBuildMismatchError' as const;
  readonly currentBuildId: string;
  readonly envelopeBuildId: string;

  constructor(options: { currentBuildId: string; envelopeBuildId: string; normalizedUrl: string }) {
    super('buildId', options.currentBuildId, options.envelopeBuildId, options.normalizedUrl);
    this.currentBuildId = options.currentBuildId;
    this.envelopeBuildId = options.envelopeBuildId;
  }
}

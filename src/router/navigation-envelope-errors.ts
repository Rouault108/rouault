export class NavigationEnvelopeContractError extends Error {
  override name = 'NavigationEnvelopeContractError';
}

export class CurrentBuildMetadataInvalidError extends NavigationEnvelopeContractError {
  override name = 'CurrentBuildMetadataInvalidError';

  readonly kind: 'current-buildId-invalid' | 'current-generatedAt-invalid';

  constructor(
    readonly field: 'buildId' | 'generatedAt',
    readonly reason: string,
  ) {
    super(`current ${field} is invalid: ${reason}`);
    this.kind = field === 'buildId' ? 'current-buildId-invalid' : 'current-generatedAt-invalid';
  }
}

export class NavigationEnvelopeMetadataMismatchError extends NavigationEnvelopeContractError {
  override name = 'NavigationEnvelopeMetadataMismatchError';

  readonly kind: 'buildId' | 'generatedAt';

  constructor(
    readonly field: 'buildId' | 'generatedAt',
    readonly currentValue: string,
    readonly envelopeValue: string,
    readonly normalizedUrl: string,
  ) {
    super(
      `navigation envelope ${field} mismatch: current=${currentValue}, envelope=${envelopeValue}, url=${normalizedUrl}`,
    );
    this.kind = field;
  }
}

export class NavigationEnvelopeBuildMismatchError extends NavigationEnvelopeMetadataMismatchError {
  override name = 'NavigationEnvelopeBuildMismatchError';
  readonly currentBuildId: string;
  readonly envelopeBuildId: string;

  constructor(options: { currentBuildId: string; envelopeBuildId: string; normalizedUrl: string }) {
    super('buildId', options.currentBuildId, options.envelopeBuildId, options.normalizedUrl);
    this.currentBuildId = options.currentBuildId;
    this.envelopeBuildId = options.envelopeBuildId;
  }
}

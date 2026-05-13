export class NavigationEnvelopeContractError extends Error {
  override name = 'NavigationEnvelopeContractError';
}

export type CurrentBuildMetadataInvalidReason = 'missing' | 'empty' | 'invalid-format';

export interface CurrentBuildMetadataInvalidErrorOptions {
  readonly field: 'buildId' | 'generatedAt';
  readonly reason: CurrentBuildMetadataInvalidReason;
  readonly value?: string | undefined;
}

export class CurrentBuildMetadataInvalidError extends NavigationEnvelopeContractError {
  override name = 'CurrentBuildMetadataInvalidError';

  readonly kind: 'current-buildId-invalid' | 'current-generatedAt-invalid';
  readonly field: 'buildId' | 'generatedAt';
  readonly reason: CurrentBuildMetadataInvalidReason;
  readonly value?: string | undefined;

  constructor(options: CurrentBuildMetadataInvalidErrorOptions) {
    super(
      options.value === undefined
        ? `current ${options.field} is invalid: ${options.reason}`
        : `current ${options.field} is invalid: ${options.reason}: ${options.value}`,
    );
    this.field = options.field;
    this.reason = options.reason;
    this.value = options.value;
    this.kind = options.field === 'buildId' ? 'current-buildId-invalid' : 'current-generatedAt-invalid';
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

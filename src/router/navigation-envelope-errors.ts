export class NavigationEnvelopeContractError extends Error {
  override name = 'NavigationEnvelopeContractError';
}

export class NavigationEnvelopeHttpStatusError extends Error {
  override name = 'NavigationEnvelopeHttpStatusError';
  readonly status: number;

  constructor(status: number) {
    super(`[navigation-envelope] artifact HTTP status ${String(status)}`);
    this.status = status;
  }
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
    super(`[navigation-envelope] current ${options.field} is ${options.reason}`);
    this.field = options.field;
    this.reason = options.reason;
    this.value = options.value;
    this.kind =
      options.field === 'buildId' ? 'current-buildId-invalid' : 'current-generatedAt-invalid';
  }
}

export interface NavigationEnvelopeMetadataMismatchErrorOptions {
  readonly kind: 'buildId' | 'generatedAt';
  readonly currentValue: string;
  readonly envelopeValue: string;
  readonly normalizedUrl: string;
}

export class NavigationEnvelopeMetadataMismatchError extends NavigationEnvelopeContractError {
  override name = 'NavigationEnvelopeMetadataMismatchError';

  readonly kind: 'buildId' | 'generatedAt';
  readonly field: 'buildId' | 'generatedAt';
  readonly currentValue: string;
  readonly envelopeValue: string;
  readonly normalizedUrl: string;

  constructor(options: NavigationEnvelopeMetadataMismatchErrorOptions) {
    super(
      `[navigation-envelope] ${options.kind} mismatch for ${options.normalizedUrl}: current=${options.currentValue}, envelope=${options.envelopeValue}`,
    );
    this.kind = options.kind;
    this.field = options.kind;
    this.currentValue = options.currentValue;
    this.envelopeValue = options.envelopeValue;
    this.normalizedUrl = options.normalizedUrl;
  }
}

export class NavigationEnvelopeBuildMismatchError extends NavigationEnvelopeMetadataMismatchError {
  override name = 'NavigationEnvelopeBuildMismatchError';
  readonly currentBuildId: string;
  readonly envelopeBuildId: string;

  constructor(options: { currentBuildId: string; envelopeBuildId: string; normalizedUrl: string }) {
    super({
      kind: 'buildId',
      currentValue: options.currentBuildId,
      envelopeValue: options.envelopeBuildId,
      normalizedUrl: options.normalizedUrl,
    });
    this.currentBuildId = options.currentBuildId;
    this.envelopeBuildId = options.envelopeBuildId;
  }
}

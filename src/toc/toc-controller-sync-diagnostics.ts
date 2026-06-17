export const tocControllerSyncDiagnosticReasons = [
  'missing-active-heading',
  'stale-source-map',
  'invalid-owner',
  'controller-unavailable',
  'panel-signature-mismatch',
] as const;

export type TocControllerSyncDiagnosticReason = (typeof tocControllerSyncDiagnosticReasons)[number];

export type TocControllerSyncDiagnosticPayload =
  | {
      readonly reason: 'missing-active-heading';
      readonly ownerId: string;
    }
  | {
      readonly reason: 'stale-source-map';
      readonly ownerId: string;
      readonly sourceVersion: string;
    }
  | {
      readonly reason: 'invalid-owner';
      readonly ownerId: string;
    }
  | {
      readonly reason: 'controller-unavailable';
      readonly controllerName: string;
    }
  | {
      readonly reason: 'panel-signature-mismatch';
      readonly ownerId: string;
      readonly expectedSignature: string;
      readonly actualSignature: string;
    };

const reasonSet = new Set<string>(tocControllerSyncDiagnosticReasons);

export const isTocControllerSyncDiagnosticReason = (
  value: unknown,
): value is TocControllerSyncDiagnosticReason => typeof value === 'string' && reasonSet.has(value);

export const createMissingActiveHeadingDiagnostic = (
  ownerId: string,
): TocControllerSyncDiagnosticPayload => ({
  reason: 'missing-active-heading',
  ownerId,
});

export const createControllerUnavailableDiagnostic = (
  controllerName: string,
): TocControllerSyncDiagnosticPayload => ({
  reason: 'controller-unavailable',
  controllerName,
});

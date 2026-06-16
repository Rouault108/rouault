import { createHash } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import {
  MEDIA_DELIVERY_CACHE_CONTROL,
  assertMediaDeliveryAttemptManifest,
  assertProductionReleaseStateArtifact,
  assertR2UploadPlanArtifact,
  assertR2UploadAttemptManifest,
  assertUploadedVerifiedObjectSetConsistency,
  type ProductionReleaseStateArtifact,
  type R2UploadPlanObject,
  type UploadedMediaObjectEvidence,
  type VerifiedMediaObjectEvidence,
} from '../../scripts/deploy/release-state-schema.js';
import { verifyUploadedMediaObjectDelivery } from '../../scripts/deploy/verify-media-delivery.js';
import {
  buildMediaObjectKey,
  type MediaFormat,
  type MediaVariant,
} from '../../shared/media/media-object-contract.js';

const contentSha256 = createHash('sha256').update(Buffer.from('hello world!')).digest('hex');
const commitSha = '0123456789abcdef0123456789abcdef01234567';

const uploadedObject = (
  overrides: Partial<UploadedMediaObjectEvidence> = {},
): UploadedMediaObjectEvidence => {
  const variant: MediaVariant = overrides.variant ?? 'thumb';
  const format: MediaFormat = overrides.format ?? 'avif';
  const objectKey = overrides.objectKey ?? buildMediaObjectKey(contentSha256, variant, format);

  return {
    mediaItemId: 'fixture-media',
    variant,
    format,
    objectKey,
    contentSha256,
    byteSize: 12,
    contentType: 'image/avif',
    publicUrl: `https://media.example.com/${objectKey}`,
    uploadStatus: 'uploaded',
    cacheControl: MEDIA_DELIVERY_CACHE_CONTROL,
    ...overrides,
  };
};

const uploadPlanObject = (overrides: Partial<R2UploadPlanObject> = {}): R2UploadPlanObject => {
  const uploaded = uploadedObject();
  return {
    mediaItemId: uploaded.mediaItemId,
    variant: uploaded.variant,
    format: uploaded.format,
    objectKey: uploaded.objectKey,
    contentSha256: uploaded.contentSha256,
    byteSize: uploaded.byteSize,
    contentType: uploaded.contentType,
    publicUrl: uploaded.publicUrl,
    cacheControl: MEDIA_DELIVERY_CACHE_CONTROL,
    ...overrides,
  };
};

const verifiedObject = (
  overrides: Partial<VerifiedMediaObjectEvidence> = {},
): VerifiedMediaObjectEvidence => {
  const uploaded = uploadedObject();
  return {
    mediaItemId: uploaded.mediaItemId,
    variant: uploaded.variant,
    format: uploaded.format,
    objectKey: uploaded.objectKey,
    publicUrl: uploaded.publicUrl,
    httpStatus: 200,
    contentType: uploaded.contentType,
    bodyByteSize: uploaded.byteSize,
    bodySha256: uploaded.contentSha256,
    cacheControl: MEDIA_DELIVERY_CACHE_CONTROL,
    ...overrides,
  };
};

const releaseState = (
  overrides: Partial<ProductionReleaseStateArtifact> = {},
): ProductionReleaseStateArtifact => ({
  schemaVersion: 1,
  artifactKind: 'production-release-state',
  commitSha,
  createdAt: '2026-01-01T00:00:00.000Z',
  uploadedObjects: [uploadedObject()],
  verifiedObjects: [verifiedObject()],
  cloudflarePages: {
    deploymentId: 'fixture-deployment',
    deploymentUrl: 'https://fixture.pages.dev/',
    projectName: 'rouault',
    branch: 'main',
    commitSha,
    wranglerOutputKind: 'jsonl-structured-output',
    wranglerVersion: '4.100.0',
  },
  runtimeVerification: {
    status: 'not-run',
    checkedAt: null,
  },
  ...overrides,
});

describe('release state and media attempt schemas', () => {
  it('accepts canonical R2 upload plan artifacts', () => {
    expect(
      assertR2UploadPlanArtifact({
        schemaVersion: 1,
        artifactKind: 'r2-media-upload-plan',
        objectCount: 1,
        plannedObjects: [uploadPlanObject()],
      }),
    ).toEqual({
      schemaVersion: 1,
      artifactKind: 'r2-media-upload-plan',
      objectCount: 1,
      plannedObjects: [uploadPlanObject()],
    });
  });

  it('rejects R2 upload plan extra fields', () => {
    expect(() =>
      assertR2UploadPlanArtifact({
        schemaVersion: 1,
        artifactKind: 'r2-media-upload-plan',
        objectCount: 1,
        plannedObjects: [
          {
            ...uploadPlanObject(),
            extra: true,
          },
        ],
      }),
    ).toThrow(/extra field/u);
  });

  it('rejects unsafe R2 upload plan evidence', () => {
    expect(() =>
      assertR2UploadPlanArtifact({
        schemaVersion: 1,
        artifactKind: 'r2-media-upload-plan',
        objectCount: 1,
        plannedObjects: [
          {
            ...uploadPlanObject(),
            credentialPath: 'redacted',
          },
        ],
      }),
    ).toThrow(/forbidden field name/u);

    expect(() =>
      assertR2UploadPlanArtifact({
        schemaVersion: 1,
        artifactKind: 'r2-media-upload-plan',
        objectCount: 1,
        plannedObjects: [
          {
            ...uploadPlanObject(),
            publicUrl: 'C:\\Users\\runner\\media.avif',
          },
        ],
      }),
    ).toThrow(/local absolute path|HTTPS URL/u);
  });

  it('rejects duplicate R2 upload plan object identities', () => {
    expect(() =>
      assertR2UploadPlanArtifact({
        schemaVersion: 1,
        artifactKind: 'r2-media-upload-plan',
        objectCount: 2,
        plannedObjects: [uploadPlanObject(), uploadPlanObject()],
      }),
    ).toThrow(/duplicate object identity/u);
  });

  it('accepts uploadedObjects evidence on successful R2 upload attempts', () => {
    expect(
      assertR2UploadAttemptManifest({
        schemaVersion: 1,
        attemptKind: 'r2-media-upload',
        status: 'succeeded',
        objectCount: 1,
        uploadedObjects: [uploadedObject()],
        failureReason: null,
      }).uploadedObjects,
    ).toEqual([uploadedObject()]);
  });

  it('forces uploadedObjects to an empty array on failed R2 upload attempts', () => {
    expect(
      assertR2UploadAttemptManifest({
        schemaVersion: 1,
        attemptKind: 'r2-media-upload',
        status: 'failed',
        objectCount: 0,
        uploadedObjects: [],
        failureReason: 'network failure',
      }).uploadedObjects,
    ).toEqual([]);

    expect(() =>
      assertR2UploadAttemptManifest({
        schemaVersion: 1,
        attemptKind: 'r2-media-upload',
        status: 'failed',
        objectCount: 0,
        uploadedObjects: [uploadedObject()],
        failureReason: 'network failure',
      }),
    ).toThrow(/uploadedObjects: \[\]/u);
  });

  it('accepts verifiedObjects evidence on successful media delivery attempts', () => {
    expect(
      assertMediaDeliveryAttemptManifest({
        schemaVersion: 1,
        attemptKind: 'media-delivery-verification',
        status: 'succeeded',
        objectCount: 1,
        verifiedObjects: [verifiedObject()],
        failureReason: null,
      }).verifiedObjects,
    ).toEqual([verifiedObject()]);
  });

  it('forces verifiedObjects to an empty array on failed media delivery attempts', () => {
    expect(
      assertMediaDeliveryAttemptManifest({
        schemaVersion: 1,
        attemptKind: 'media-delivery-verification',
        status: 'failed',
        objectCount: 0,
        verifiedObjects: [],
        failureReason: 'HTTP 500',
      }).verifiedObjects,
    ).toEqual([]);

    expect(() =>
      assertMediaDeliveryAttemptManifest({
        schemaVersion: 1,
        attemptKind: 'media-delivery-verification',
        status: 'failed',
        objectCount: 0,
        verifiedObjects: [verifiedObject()],
        failureReason: 'HTTP 500',
      }),
    ).toThrow(/verifiedObjects: \[\]/u);
  });

  it('rejects uploadedObjects and verifiedObjects set mismatches', () => {
    expect(() =>
      assertUploadedVerifiedObjectSetConsistency(
        [uploadedObject()],
        [verifiedObject({ mediaItemId: 'other-media' })],
      ),
    ).toThrow(/object sets differ/u);
  });

  it.each([
    ['bodyByteSize mismatch', verifiedObject({ bodyByteSize: 13 }), /bodyByteSize mismatch/u],
    ['contentSha256 mismatch', verifiedObject({ bodySha256: 'b'.repeat(64) }), /contentSha256 mismatch/u],
    ['Cache-Control mismatch', verifiedObject({ cacheControl: 'no-store' as typeof MEDIA_DELIVERY_CACHE_CONTROL }), /Cache-Control mismatch/u],
    ['publicUrl mismatch', verifiedObject({ publicUrl: 'https://media.example.com/other.avif' }), /publicUrl mismatch/u],
    ['objectKey mismatch', verifiedObject({ objectKey: buildMediaObjectKey('b'.repeat(64), 'thumb', 'avif') }), /object sets differ/u],
  ])('rejects %s', (_label, object, errorPattern) => {
    expect(() => assertUploadedVerifiedObjectSetConsistency([uploadedObject()], [object])).toThrow(
      errorPattern,
    );
  });

  it('rejects extra top-level fields', () => {
    expect(() =>
      assertProductionReleaseStateArtifact({
        ...releaseState(),
        extra: true,
      }),
    ).toThrow(/extra field/u);
  });

  it('rejects nested extra fields', () => {
    expect(() =>
      assertProductionReleaseStateArtifact({
        ...releaseState(),
        runtimeVerification: {
          status: 'not-run',
          checkedAt: null,
          extra: true,
        },
      }),
    ).toThrow(/extra field/u);
  });

  it('rejects secret-like field names', () => {
    expect(() =>
      assertProductionReleaseStateArtifact({
        ...releaseState(),
        cloudflarePages: {
          ...releaseState().cloudflarePages,
          apiToken: 'redacted',
        },
      }),
    ).toThrow(/forbidden field name/u);
  });

  it('rejects local absolute paths', () => {
    expect(() =>
      assertR2UploadAttemptManifest({
        schemaVersion: 1,
        attemptKind: 'r2-media-upload',
        status: 'failed',
        objectCount: 0,
        uploadedObjects: [],
        failureReason: 'C:\\Users\\runner\\secret.txt',
      }),
    ).toThrow(/local absolute path/u);
  });

  it('verifies public delivery evidence from HTTP response data', async () => {
    const body = Buffer.from('hello world!');

    await expect(
      verifyUploadedMediaObjectDelivery(uploadedObject(), async () => ({
        status: 200,
        contentType: 'image/avif',
        cacheControl: MEDIA_DELIVERY_CACHE_CONTROL,
        body,
      })),
    ).resolves.toEqual(verifiedObject());
  });

  it('rejects body byte size mismatches during delivery verification', async () => {
    const body = Buffer.from('different body');

    await expect(
      verifyUploadedMediaObjectDelivery(uploadedObject(), async () => ({
        status: 200,
        contentType: 'image/avif',
        cacheControl: MEDIA_DELIVERY_CACHE_CONTROL,
        body,
      })),
    ).rejects.toThrow(/bodyByteSize mismatch/u);
  });
});

/// <reference types="node" />

import { createHash } from 'node:crypto';

import {
  MEDIA_FORMATS,
  MEDIA_VARIANTS,
  assertMediaObjectContract,
  type MediaFormat,
  type MediaObjectContract,
  type MediaVariant,
} from '../../shared/media/media-object-contract.js';

export const RELEASE_STATE_SCHEMA_VERSION = 1;
export const MEDIA_DELIVERY_CACHE_CONTROL = 'public, max-age=31536000, immutable';

const SHA256_PATTERN = /^[0-9a-f]{64}$/u;
const COMMIT_SHA_PATTERN = /^[0-9a-f]{40}$/u;
const HTTPS_URL_PATTERN = /^https:\/\/[A-Za-z0-9.-]+(?:\/[^\s]*)?$/u;
const SECRET_FIELD_PATTERN =
  /(?:secret|token|credential|password|passwd|private[_-]?key|access[_-]?key|api[_-]?key|environment|process[_-]?env|raw[_-]?env|local[_-]?path)/iu;
const WINDOWS_ABSOLUTE_PATH_PATTERN = /^[A-Za-z]:[\\/]/u;

export interface UploadedMediaObjectEvidence extends MediaObjectContract {
  readonly uploadStatus: 'uploaded' | 'skipped-existing';
  readonly cacheControl: typeof MEDIA_DELIVERY_CACHE_CONTROL;
}

export interface R2UploadPlanObject extends MediaObjectContract {
  readonly cacheControl: typeof MEDIA_DELIVERY_CACHE_CONTROL;
}

export interface R2UploadPlanArtifact {
  readonly schemaVersion: typeof RELEASE_STATE_SCHEMA_VERSION;
  readonly artifactKind: 'r2-media-upload-plan';
  readonly objectCount: number;
  readonly plannedObjects: readonly R2UploadPlanObject[];
}

export interface VerifiedMediaObjectEvidence {
  readonly mediaItemId: string;
  readonly variant: MediaVariant;
  readonly format: MediaFormat;
  readonly objectKey: string;
  readonly publicUrl: string;
  readonly httpStatus: 200;
  readonly contentType: string;
  readonly bodyByteSize: number;
  readonly bodySha256: string;
  readonly cacheControl: typeof MEDIA_DELIVERY_CACHE_CONTROL;
}

export interface R2UploadAttemptManifest {
  readonly schemaVersion: typeof RELEASE_STATE_SCHEMA_VERSION;
  readonly attemptKind: 'r2-media-upload';
  readonly status: 'succeeded' | 'failed';
  readonly objectCount: number;
  readonly uploadedObjects: readonly UploadedMediaObjectEvidence[];
  readonly failureReason: string | null;
}

export interface MediaDeliveryAttemptManifest {
  readonly schemaVersion: typeof RELEASE_STATE_SCHEMA_VERSION;
  readonly attemptKind: 'media-delivery-verification';
  readonly status: 'succeeded' | 'failed';
  readonly objectCount: number;
  readonly verifiedObjects: readonly VerifiedMediaObjectEvidence[];
  readonly failureReason: string | null;
}

export interface CloudflarePagesReleaseEvidence {
  readonly deploymentId: string;
  readonly deploymentUrl: string;
  readonly projectName: string;
  readonly branch: 'main';
  readonly commitSha: string;
  readonly wranglerOutputKind: 'jsonl-structured-output';
  readonly wranglerVersion: string;
}

export interface RuntimeVerificationState {
  readonly status:
    | 'not-run'
    | 'verified-by-production-runtime-artifacts'
    | 'verification-failed'
    | 'release-state-resolution-failed';
  readonly checkedAt: string | null;
}

export interface ProductionReleaseStateArtifact {
  readonly schemaVersion: typeof RELEASE_STATE_SCHEMA_VERSION;
  readonly artifactKind: 'production-release-state';
  readonly commitSha: string;
  readonly createdAt: string;
  readonly uploadedObjects: readonly UploadedMediaObjectEvidence[];
  readonly verifiedObjects: readonly VerifiedMediaObjectEvidence[];
  readonly cloudflarePages: CloudflarePagesReleaseEvidence;
  readonly runtimeVerification: RuntimeVerificationState;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const assertRecord = (value: unknown, label: string): Record<string, unknown> => {
  if (!isRecord(value)) {
    throw new Error(`[release-state] ${label} must be an object`);
  }
  return value;
};

const assertAllowedKeys = (
  value: Record<string, unknown>,
  allowedKeys: readonly string[],
  label: string,
): void => {
  const allowed = new Set(allowedKeys);
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) {
      throw new Error(`[release-state] ${label} contains extra field: ${key}`);
    }
  }
};

const assertSafeFieldName = (key: string, label: string): void => {
  if (SECRET_FIELD_PATTERN.test(key)) {
    throw new Error(`[release-state] ${label} contains forbidden field name: ${key}`);
  }
};

const assertSafeStringValue = (value: string, label: string): void => {
  if (WINDOWS_ABSOLUTE_PATH_PATTERN.test(value) || value.startsWith('/')) {
    throw new Error(`[release-state] ${label} contains a local absolute path`);
  }
};

export const assertNoForbiddenReleaseStateEvidence = (value: unknown, label = 'artifact'): void => {
  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      assertNoForbiddenReleaseStateEvidence(item, `${label}[${String(index)}]`);
    });
    return;
  }

  if (isRecord(value)) {
    for (const [key, item] of Object.entries(value)) {
      assertSafeFieldName(key, label);
      assertNoForbiddenReleaseStateEvidence(item, `${label}.${key}`);
    }
    return;
  }

  if (typeof value === 'string') {
    assertSafeStringValue(value, label);
  }
};

const assertString = (value: unknown, label: string): string => {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`[release-state] ${label} must be a non-empty string`);
  }
  return value;
};

const assertNullableString = (value: unknown, label: string): string | null => {
  if (value === null) {
    return null;
  }
  return assertString(value, label);
};

const assertSha256 = (value: unknown, label: string): string => {
  const sha256 = assertString(value, label);
  if (!SHA256_PATTERN.test(sha256)) {
    throw new Error(`[release-state] ${label} must be a lowercase SHA-256`);
  }
  return sha256;
};

const assertPositiveInteger = (value: unknown, label: string): number => {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`[release-state] ${label} must be a positive integer`);
  }
  return value;
};

const assertNonNegativeInteger = (value: unknown, label: string): number => {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
    throw new Error(`[release-state] ${label} must be a non-negative integer`);
  }
  return value;
};

const assertHttpsUrl = (value: unknown, label: string): string => {
  const url = assertString(value, label);
  if (!HTTPS_URL_PATTERN.test(url)) {
    throw new Error(`[release-state] ${label} must be an HTTPS URL`);
  }
  return url;
};

const assertVariant = (value: unknown, label: string): MediaVariant => {
  if (typeof value === 'string' && (MEDIA_VARIANTS as readonly string[]).includes(value)) {
    return value as MediaVariant;
  }
  throw new Error(`[release-state] ${label} has invalid media variant`);
};

const assertFormat = (value: unknown, label: string): MediaFormat => {
  if (typeof value === 'string' && (MEDIA_FORMATS as readonly string[]).includes(value)) {
    return value as MediaFormat;
  }
  throw new Error(`[release-state] ${label} has invalid media format`);
};

export const assertUploadedMediaObjectEvidence = (
  value: unknown,
): UploadedMediaObjectEvidence => {
  const object = assertRecord(value, 'uploaded object');
  assertAllowedKeys(
    object,
    [
      'mediaItemId',
      'variant',
      'format',
      'objectKey',
      'contentSha256',
      'byteSize',
      'contentType',
      'publicUrl',
      'uploadStatus',
      'cacheControl',
    ],
    'uploaded object',
  );
  assertNoForbiddenReleaseStateEvidence(object, 'uploaded object');

  const mediaObject = assertMediaObjectContract(object);
  assertHttpsUrl(mediaObject.publicUrl, 'uploaded object publicUrl');
  const uploadStatus = object['uploadStatus'];
  if (uploadStatus !== 'uploaded' && uploadStatus !== 'skipped-existing') {
    throw new Error('[release-state] uploaded object uploadStatus is invalid');
  }
  if (object['cacheControl'] !== MEDIA_DELIVERY_CACHE_CONTROL) {
    throw new Error('[release-state] uploaded object Cache-Control mismatch');
  }

  return {
    ...mediaObject,
    uploadStatus,
    cacheControl: MEDIA_DELIVERY_CACHE_CONTROL,
  };
};

export const assertVerifiedMediaObjectEvidence = (
  value: unknown,
): VerifiedMediaObjectEvidence => {
  const object = assertRecord(value, 'verified object');
  assertAllowedKeys(
    object,
    [
      'mediaItemId',
      'variant',
      'format',
      'objectKey',
      'publicUrl',
      'httpStatus',
      'contentType',
      'bodyByteSize',
      'bodySha256',
      'cacheControl',
    ],
    'verified object',
  );
  assertNoForbiddenReleaseStateEvidence(object, 'verified object');

  const httpStatus = object['httpStatus'];
  if (httpStatus !== 200) {
    throw new Error('[release-state] verified object HTTP status mismatch');
  }
  const bodySha256 = assertSha256(object['bodySha256'], 'verified object bodySha256');
  const cacheControl = object['cacheControl'];
  if (cacheControl !== MEDIA_DELIVERY_CACHE_CONTROL) {
    throw new Error('[release-state] verified object Cache-Control mismatch');
  }

  return {
    mediaItemId: assertString(object['mediaItemId'], 'verified object mediaItemId'),
    variant: assertVariant(object['variant'], 'verified object variant'),
    format: assertFormat(object['format'], 'verified object format'),
    objectKey: assertString(object['objectKey'], 'verified object objectKey'),
    publicUrl: assertHttpsUrl(object['publicUrl'], 'verified object publicUrl'),
    httpStatus: 200,
    contentType: assertString(object['contentType'], 'verified object contentType'),
    bodyByteSize: assertPositiveInteger(object['bodyByteSize'], 'verified object bodyByteSize'),
    bodySha256,
    cacheControl: MEDIA_DELIVERY_CACHE_CONTROL,
  };
};

export const compareUploadedAndVerifiedObject = (
  uploaded: UploadedMediaObjectEvidence,
  verified: VerifiedMediaObjectEvidence,
): void => {
  if (uploaded.mediaItemId !== verified.mediaItemId) {
    throw new Error('[release-state] mediaItemId mismatch');
  }
  if (uploaded.variant !== verified.variant) {
    throw new Error('[release-state] variant mismatch');
  }
  if (uploaded.format !== verified.format) {
    throw new Error('[release-state] format mismatch');
  }
  if (uploaded.objectKey !== verified.objectKey) {
    throw new Error('[release-state] objectKey mismatch');
  }
  if (uploaded.publicUrl !== verified.publicUrl) {
    throw new Error('[release-state] publicUrl mismatch');
  }
  if (uploaded.contentType !== verified.contentType) {
    throw new Error('[release-state] Content-Type mismatch');
  }
  if (uploaded.byteSize !== verified.bodyByteSize) {
    throw new Error('[release-state] bodyByteSize mismatch');
  }
  if (uploaded.contentSha256 !== verified.bodySha256) {
    throw new Error('[release-state] contentSha256 mismatch');
  }
  const uploadedCacheControl: string = uploaded.cacheControl;
  const verifiedCacheControl: string = verified.cacheControl;
  if (uploadedCacheControl !== verifiedCacheControl) {
    throw new Error('[release-state] Cache-Control mismatch');
  }
};

export const objectEvidenceIdentity = (object: {
  readonly mediaItemId: string;
  readonly variant: MediaVariant;
  readonly format: MediaFormat;
  readonly objectKey: string;
}): string => `${object.mediaItemId}\u0000${object.variant}\u0000${object.format}\u0000${object.objectKey}`;

export const assertR2UploadPlanObject = (value: unknown): R2UploadPlanObject => {
  const object = assertRecord(value, 'R2 upload plan object');
  assertAllowedKeys(
    object,
    [
      'mediaItemId',
      'variant',
      'format',
      'objectKey',
      'contentSha256',
      'byteSize',
      'contentType',
      'publicUrl',
      'cacheControl',
    ],
    'R2 upload plan object',
  );
  assertNoForbiddenReleaseStateEvidence(object, 'R2 upload plan object');

  const mediaObject = assertMediaObjectContract(object);
  assertHttpsUrl(mediaObject.publicUrl, 'R2 upload plan object publicUrl');
  if (object['cacheControl'] !== MEDIA_DELIVERY_CACHE_CONTROL) {
    throw new Error('[release-state] R2 upload plan object Cache-Control mismatch');
  }

  return {
    ...mediaObject,
    cacheControl: MEDIA_DELIVERY_CACHE_CONTROL,
  };
};

export const assertR2UploadPlanArtifact = (value: unknown): R2UploadPlanArtifact => {
  const artifact = assertRecord(value, 'R2 upload plan artifact');
  assertAllowedKeys(
    artifact,
    ['schemaVersion', 'artifactKind', 'objectCount', 'plannedObjects'],
    'R2 upload plan artifact',
  );
  assertNoForbiddenReleaseStateEvidence(artifact, 'R2 upload plan artifact');

  if (artifact['schemaVersion'] !== RELEASE_STATE_SCHEMA_VERSION) {
    throw new Error('[release-state] R2 upload plan schemaVersion is unsupported');
  }
  if (artifact['artifactKind'] !== 'r2-media-upload-plan') {
    throw new Error('[release-state] R2 upload plan artifactKind mismatch');
  }

  const plannedObjects = Array.isArray(artifact['plannedObjects'])
    ? artifact['plannedObjects'].map((object) => assertR2UploadPlanObject(object))
    : null;
  if (plannedObjects === null) {
    throw new Error('[release-state] R2 upload plan plannedObjects must be an array');
  }

  const objectCount = assertNonNegativeInteger(artifact['objectCount'], 'R2 upload plan objectCount');
  if (objectCount !== plannedObjects.length) {
    throw new Error('[release-state] R2 upload plan objectCount mismatch');
  }

  const identities = new Set<string>();
  for (const object of plannedObjects) {
    const identity = objectEvidenceIdentity(object);
    if (identities.has(identity)) {
      throw new Error('[release-state] R2 upload plan contains duplicate object identity');
    }
    identities.add(identity);
  }

  return {
    schemaVersion: RELEASE_STATE_SCHEMA_VERSION,
    artifactKind: 'r2-media-upload-plan',
    objectCount,
    plannedObjects,
  };
};

export const assertUploadedVerifiedObjectSetConsistency = (
  uploadedObjects: readonly UploadedMediaObjectEvidence[],
  verifiedObjects: readonly VerifiedMediaObjectEvidence[],
): void => {
  if (uploadedObjects.length !== verifiedObjects.length) {
    throw new Error('[release-state] uploadedObjects and verifiedObjects object sets differ');
  }

  const verifiedByIdentity = new Map<string, VerifiedMediaObjectEvidence>();
  for (const verified of verifiedObjects) {
    const identity = objectEvidenceIdentity(verified);
    if (verifiedByIdentity.has(identity)) {
      throw new Error('[release-state] verifiedObjects contains duplicate object identity');
    }
    verifiedByIdentity.set(identity, verified);
  }

  for (const uploaded of uploadedObjects) {
    const verified = verifiedByIdentity.get(objectEvidenceIdentity(uploaded));
    if (verified === undefined) {
      throw new Error('[release-state] uploadedObjects and verifiedObjects object sets differ');
    }
    compareUploadedAndVerifiedObject(uploaded, verified);
  }
};

export const assertR2UploadAttemptManifest = (value: unknown): R2UploadAttemptManifest => {
  const manifest = assertRecord(value, 'R2 upload attempt manifest');
  assertAllowedKeys(
    manifest,
    ['schemaVersion', 'attemptKind', 'status', 'objectCount', 'uploadedObjects', 'failureReason'],
    'R2 upload attempt manifest',
  );
  assertNoForbiddenReleaseStateEvidence(manifest, 'R2 upload attempt manifest');

  if (manifest['schemaVersion'] !== RELEASE_STATE_SCHEMA_VERSION) {
    throw new Error('[release-state] R2 upload attempt schemaVersion is unsupported');
  }
  if (manifest['attemptKind'] !== 'r2-media-upload') {
    throw new Error('[release-state] R2 upload attempt kind mismatch');
  }
  const status = manifest['status'];
  if (status !== 'succeeded' && status !== 'failed') {
    throw new Error('[release-state] R2 upload attempt status is invalid');
  }
  const uploadedObjects = Array.isArray(manifest['uploadedObjects'])
    ? manifest['uploadedObjects'].map((object) => assertUploadedMediaObjectEvidence(object))
    : null;
  if (uploadedObjects === null) {
    throw new Error('[release-state] R2 upload attempt uploadedObjects must be an array');
  }
  if (status === 'failed' && uploadedObjects.length !== 0) {
    throw new Error('[release-state] failed R2 upload attempt must use uploadedObjects: []');
  }
  const objectCount = assertNonNegativeInteger(manifest['objectCount'], 'R2 upload objectCount');
  if (status === 'succeeded' && objectCount !== uploadedObjects.length) {
    throw new Error('[release-state] R2 upload objectCount mismatch');
  }

  return {
    schemaVersion: RELEASE_STATE_SCHEMA_VERSION,
    attemptKind: 'r2-media-upload',
    status,
    objectCount,
    uploadedObjects,
    failureReason: assertNullableString(manifest['failureReason'], 'R2 upload failureReason'),
  };
};

export const assertMediaDeliveryAttemptManifest = (
  value: unknown,
): MediaDeliveryAttemptManifest => {
  const manifest = assertRecord(value, 'media delivery attempt manifest');
  assertAllowedKeys(
    manifest,
    ['schemaVersion', 'attemptKind', 'status', 'objectCount', 'verifiedObjects', 'failureReason'],
    'media delivery attempt manifest',
  );
  assertNoForbiddenReleaseStateEvidence(manifest, 'media delivery attempt manifest');

  if (manifest['schemaVersion'] !== RELEASE_STATE_SCHEMA_VERSION) {
    throw new Error('[release-state] media delivery attempt schemaVersion is unsupported');
  }
  if (manifest['attemptKind'] !== 'media-delivery-verification') {
    throw new Error('[release-state] media delivery attempt kind mismatch');
  }
  const status = manifest['status'];
  if (status !== 'succeeded' && status !== 'failed') {
    throw new Error('[release-state] media delivery attempt status is invalid');
  }
  const verifiedObjects = Array.isArray(manifest['verifiedObjects'])
    ? manifest['verifiedObjects'].map((object) => assertVerifiedMediaObjectEvidence(object))
    : null;
  if (verifiedObjects === null) {
    throw new Error('[release-state] media delivery attempt verifiedObjects must be an array');
  }
  if (status === 'failed' && verifiedObjects.length !== 0) {
    throw new Error('[release-state] failed media delivery attempt must use verifiedObjects: []');
  }
  const objectCount = assertNonNegativeInteger(manifest['objectCount'], 'media delivery objectCount');
  if (status === 'succeeded' && objectCount !== verifiedObjects.length) {
    throw new Error('[release-state] media delivery objectCount mismatch');
  }

  return {
    schemaVersion: RELEASE_STATE_SCHEMA_VERSION,
    attemptKind: 'media-delivery-verification',
    status,
    objectCount,
    verifiedObjects,
    failureReason: assertNullableString(manifest['failureReason'], 'media delivery failureReason'),
  };
};

const assertCloudflarePagesReleaseEvidence = (
  value: unknown,
): CloudflarePagesReleaseEvidence => {
  const evidence = assertRecord(value, 'cloudflarePages');
  assertAllowedKeys(
    evidence,
    [
      'deploymentId',
      'deploymentUrl',
      'projectName',
      'branch',
      'commitSha',
      'wranglerOutputKind',
      'wranglerVersion',
    ],
    'cloudflarePages',
  );
  assertNoForbiddenReleaseStateEvidence(evidence, 'cloudflarePages');
  const commitSha = assertString(evidence['commitSha'], 'cloudflarePages commitSha');
  if (!COMMIT_SHA_PATTERN.test(commitSha)) {
    throw new Error('[release-state] cloudflarePages commitSha must be a commit SHA');
  }
  if (evidence['branch'] !== 'main') {
    throw new Error('[release-state] cloudflarePages branch mismatch');
  }
  if (evidence['wranglerOutputKind'] !== 'jsonl-structured-output') {
    throw new Error('[release-state] cloudflarePages wranglerOutputKind mismatch');
  }

  return {
    deploymentId: assertString(evidence['deploymentId'], 'cloudflarePages deploymentId'),
    deploymentUrl: assertHttpsUrl(evidence['deploymentUrl'], 'cloudflarePages deploymentUrl'),
    projectName: assertString(evidence['projectName'], 'cloudflarePages projectName'),
    branch: 'main',
    commitSha,
    wranglerOutputKind: 'jsonl-structured-output',
    wranglerVersion: assertString(evidence['wranglerVersion'], 'cloudflarePages wranglerVersion'),
  };
};

const assertRuntimeVerificationState = (value: unknown): RuntimeVerificationState => {
  const state = assertRecord(value, 'runtimeVerification');
  assertAllowedKeys(state, ['status', 'checkedAt'], 'runtimeVerification');
  assertNoForbiddenReleaseStateEvidence(state, 'runtimeVerification');
  const status = state['status'];
  if (
    status !== 'not-run' &&
    status !== 'verified-by-production-runtime-artifacts' &&
    status !== 'verification-failed' &&
    status !== 'release-state-resolution-failed'
  ) {
    throw new Error('[release-state] runtimeVerification status is invalid');
  }
  return {
    status,
    checkedAt:
      state['checkedAt'] === null
        ? null
        : assertString(state['checkedAt'], 'runtimeVerification checkedAt'),
  };
};

export const assertProductionReleaseStateArtifact = (
  value: unknown,
): ProductionReleaseStateArtifact => {
  const artifact = assertRecord(value, 'release state artifact');
  assertAllowedKeys(
    artifact,
    [
      'schemaVersion',
      'artifactKind',
      'commitSha',
      'createdAt',
      'uploadedObjects',
      'verifiedObjects',
      'cloudflarePages',
      'runtimeVerification',
    ],
    'release state artifact',
  );
  assertNoForbiddenReleaseStateEvidence(artifact, 'release state artifact');

  if (artifact['schemaVersion'] !== RELEASE_STATE_SCHEMA_VERSION) {
    throw new Error('[release-state] release state schemaVersion is unsupported');
  }
  if (artifact['artifactKind'] !== 'production-release-state') {
    throw new Error('[release-state] release state artifactKind mismatch');
  }
  const commitSha = assertString(artifact['commitSha'], 'release state commitSha');
  if (!COMMIT_SHA_PATTERN.test(commitSha)) {
    throw new Error('[release-state] release state commitSha must be a commit SHA');
  }
  const uploadedObjects = Array.isArray(artifact['uploadedObjects'])
    ? artifact['uploadedObjects'].map((object) => assertUploadedMediaObjectEvidence(object))
    : null;
  const verifiedObjects = Array.isArray(artifact['verifiedObjects'])
    ? artifact['verifiedObjects'].map((object) => assertVerifiedMediaObjectEvidence(object))
    : null;
  if (uploadedObjects === null || verifiedObjects === null) {
    throw new Error('[release-state] release state object evidence must be arrays');
  }
  assertUploadedVerifiedObjectSetConsistency(uploadedObjects, verifiedObjects);

  return {
    schemaVersion: RELEASE_STATE_SCHEMA_VERSION,
    artifactKind: 'production-release-state',
    commitSha,
    createdAt: assertString(artifact['createdAt'], 'release state createdAt'),
    uploadedObjects,
    verifiedObjects,
    cloudflarePages: assertCloudflarePagesReleaseEvidence(artifact['cloudflarePages']),
    runtimeVerification: assertRuntimeVerificationState(artifact['runtimeVerification']),
  };
};

export const sha256Json = (value: unknown): string =>
  createHash('sha256').update(`${JSON.stringify(value, null, 2)}\n`, 'utf8').digest('hex');

export const toFailureReason = (error: unknown): string =>
  error instanceof Error && error.message.trim() ? error.message.trim().slice(0, 500) : 'unknown';

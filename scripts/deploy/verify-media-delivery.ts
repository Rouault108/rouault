/// <reference types="node" />

import { appendFile, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { sha256Hex as sha256TextHex, writeJsonAtomically } from './production-authority.js';
import {
  MEDIA_DELIVERY_CACHE_CONTROL,
  assertMediaDeliveryAttemptManifest,
  assertR2UploadAttemptManifest,
  assertUploadedVerifiedObjectSetConsistency,
  toFailureReason,
  type MediaDeliveryAttemptManifest,
  type UploadedMediaObjectEvidence,
  type VerifiedMediaObjectEvidence,
} from './release-state-schema.js';

const R2_ATTEMPT_PATH = path.resolve(process.cwd(), '.generated', 'deployment', 'r2-attempt.json');
const MEDIA_DELIVERY_ATTEMPT_PATH = path.resolve(
  process.cwd(),
  '.generated',
  'deployment',
  'media-delivery-attempt.json',
);
const ATTEMPT_ARTIFACT_NAME = 'rouault-media-delivery-attempt';

interface HttpFetchResult {
  readonly status: number;
  readonly contentType: string;
  readonly cacheControl: string;
  readonly body: Buffer;
}

const firstVerifiedObject = (
  manifest: MediaDeliveryAttemptManifest,
): VerifiedMediaObjectEvidence => {
  const object = manifest.verifiedObjects[0];
  if (object === undefined) {
    throw new Error('[media-delivery] media delivery attempt did not contain verified evidence');
  }
  return object;
};

const readJson = async (filePath: string): Promise<unknown> =>
  JSON.parse(await readFile(filePath, 'utf8')) as unknown;

const sha256BufferHex = async (body: Buffer): Promise<string> => {
  const { createHash } = await import('node:crypto');
  return createHash('sha256').update(body).digest('hex');
};

const normalizeHeader = (value: string | null): string => value?.trim() ?? '';

const fetchMediaObject = async (publicUrl: string): Promise<HttpFetchResult> => {
  const response = await fetch(publicUrl, {
    headers: {
      'User-Agent': 'rouault-media-delivery-verifier',
    },
  });
  const body = Buffer.from(await response.arrayBuffer());

  return {
    status: response.status,
    contentType: normalizeHeader(response.headers.get('content-type')).split(';', 1)[0] ?? '',
    cacheControl: normalizeHeader(response.headers.get('cache-control')),
    body,
  };
};

export const verifyUploadedMediaObjectDelivery = async (
  object: UploadedMediaObjectEvidence,
  fetchObject: (publicUrl: string) => Promise<HttpFetchResult> = fetchMediaObject,
): Promise<VerifiedMediaObjectEvidence> => {
  const response = await fetchObject(object.publicUrl);
  const bodyByteSize = response.body.byteLength;
  const bodySha256 = await sha256BufferHex(response.body);

  const verifiedObject = {
    mediaItemId: object.mediaItemId,
    variant: object.variant,
    format: object.format,
    objectKey: object.objectKey,
    publicUrl: object.publicUrl,
    httpStatus: response.status,
    contentType: response.contentType,
    bodyByteSize,
    bodySha256,
    cacheControl: response.cacheControl,
  };

  const manifest = assertMediaDeliveryAttemptManifest({
    schemaVersion: 1,
    attemptKind: 'media-delivery-verification',
    status: 'succeeded',
    objectCount: 1,
    verifiedObjects: [verifiedObject],
    failureReason: null,
  });
  const normalized = firstVerifiedObject(manifest);
  assertUploadedVerifiedObjectSetConsistency([object], [normalized]);
  const observedCacheControl: string = normalized.cacheControl;
  if (observedCacheControl !== MEDIA_DELIVERY_CACHE_CONTROL) {
    throw new Error('[media-delivery] Cache-Control mismatch');
  }
  return normalized;
};

const writeAttemptManifest = async (manifest: MediaDeliveryAttemptManifest): Promise<string> => {
  const normalized = assertMediaDeliveryAttemptManifest(manifest);
  await writeJsonAtomically(MEDIA_DELIVERY_ATTEMPT_PATH, normalized);
  const serialized = `${JSON.stringify(normalized, null, 2)}\n`;
  return sha256TextHex(serialized);
};

const writeGithubOutput = async (attemptSha256: string): Promise<void> => {
  const githubOutput = process.env['GITHUB_OUTPUT']?.trim();
  if (!githubOutput) {
    return;
  }

  await appendFile(
    githubOutput,
    [
      `media-delivery-attempt-artifact-name=${ATTEMPT_ARTIFACT_NAME}`,
      `media-delivery-attempt-sha256=${attemptSha256}`,
      '',
    ].join('\n'),
    'utf8',
  );
};

const verifyMediaDelivery = async (): Promise<void> => {
  const uploadAttempt = assertR2UploadAttemptManifest(await readJson(R2_ATTEMPT_PATH));
  if (uploadAttempt.status !== 'succeeded') {
    throw new Error('[media-delivery] R2 upload attempt did not succeed');
  }

  const verifiedObjects: VerifiedMediaObjectEvidence[] = [];
  for (const object of uploadAttempt.uploadedObjects) {
    verifiedObjects.push(await verifyUploadedMediaObjectDelivery(object));
  }
  assertUploadedVerifiedObjectSetConsistency(uploadAttempt.uploadedObjects, verifiedObjects);

  const attemptSha256 = await writeAttemptManifest({
    schemaVersion: 1,
    attemptKind: 'media-delivery-verification',
    status: 'succeeded',
    objectCount: uploadAttempt.uploadedObjects.length,
    verifiedObjects,
    failureReason: null,
  });
  await writeGithubOutput(attemptSha256);
  console.log(
    `[media-delivery] verified ${String(verifiedObjects.length)} public media objects over HTTP`,
  );
};

const run = async (): Promise<void> => {
  try {
    await verifyMediaDelivery();
  } catch (error) {
    const attemptSha256 = await writeAttemptManifest({
      schemaVersion: 1,
      attemptKind: 'media-delivery-verification',
      status: 'failed',
      objectCount: 0,
      verifiedObjects: [],
      failureReason: toFailureReason(error),
    });
    await writeGithubOutput(attemptSha256);
    throw error;
  }
};

const entryPoint = process.argv[1];
if (typeof entryPoint === 'string' && fileURLToPath(import.meta.url) === path.resolve(entryPoint)) {
  void run();
}

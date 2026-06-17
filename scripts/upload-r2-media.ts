/// <reference types="node" />

import { appendFile, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
  S3ServiceException,
} from '@aws-sdk/client-s3';

import {
  assertMediaManifestContract,
  type MediaManifest,
  type MediaObjectContract,
} from '../shared/media/media-object-contract.js';
import {
  observeProductionBranchHead,
  productionAuthorityFromProcessEnv,
  sha256Hex as sha256TextHex,
  writeJsonAtomically,
} from './deploy/production-authority.js';
import {
  MEDIA_DELIVERY_CACHE_CONTROL,
  assertR2UploadPlanArtifact,
  assertR2UploadAttemptManifest,
  toFailureReason,
  type R2UploadPlanArtifact,
  type R2UploadPlanObject,
  type R2UploadAttemptManifest,
  type UploadedMediaObjectEvidence,
} from './deploy/release-state-schema.js';

const GENERATED_ROOT = path.resolve(process.cwd(), '.generated', 'media');
const GENERATED_ASSET_ROOT = path.join(GENERATED_ROOT, 'assets');
const MANIFEST_PATH = path.join(GENERATED_ROOT, 'image-manifest.json');
const ATTEMPT_MANIFEST_PATH = path.resolve(
  process.cwd(),
  '.generated',
  'deployment',
  'r2-attempt.json',
);
const UPLOAD_PLAN_PATH = path.resolve(
  process.cwd(),
  '.generated',
  'deployment',
  'r2-upload-plan.json',
);
const ATTEMPT_ARTIFACT_NAME = 'rouault-r2-attempt';
const CACHE_CONTROL = MEDIA_DELIVERY_CACHE_CONTROL;
const R2_REGION = 'auto';

interface R2Credentials {
  readonly accountId: string;
  readonly accessKeyId: string;
  readonly secretAccessKey: string;
  readonly bucketName: string;
}

interface UploadTarget {
  readonly objectKey: string;
  readonly localPath: string;
  readonly contentType: string;
  readonly contentLength: number;
  readonly sha256: string;
  readonly planObject: R2UploadPlanObject;
  readonly fileBuffer: Buffer;
}

interface ParsedUploadTarget {
  readonly objectKey: string;
  readonly localPath: string;
  readonly contentType: string;
}

interface HeadObjectMetadata {
  readonly sha256: string | undefined;
}

const firstPlannedObject = (artifact: R2UploadPlanArtifact): R2UploadPlanObject => {
  const object = artifact.plannedObjects[0];
  if (object === undefined) {
    throw new Error('[media] R2 upload plan artifact did not contain a planned object');
  }
  return object;
};

const firstUploadedObject = (manifest: R2UploadAttemptManifest): UploadedMediaObjectEvidence => {
  const object = manifest.uploadedObjects[0];
  if (object === undefined) {
    throw new Error('[media] R2 upload attempt manifest did not contain uploaded evidence');
  }
  return object;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const readRequiredEnv = (name: string): string => {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`[media] missing required environment variable: ${name}`);
  }
  return value;
};

const validateBareBucketName = (bucketName: string): string => {
  if (bucketName.includes('://') || bucketName.includes('/')) {
    throw new Error(`[media] R2_BUCKET_NAME must be a bare bucket name, but got: ${bucketName}`);
  }
  return bucketName;
};

const getCredentials = (): R2Credentials => ({
  accountId: readRequiredEnv('CLOUDFLARE_ACCOUNT_ID'),
  accessKeyId: readRequiredEnv('R2_ACCESS_KEY_ID'),
  secretAccessKey: readRequiredEnv('R2_SECRET_ACCESS_KEY'),
  bucketName: validateBareBucketName(readRequiredEnv('R2_BUCKET_NAME')),
});

const createS3Client = (credentials: R2Credentials): S3Client =>
  new S3Client({
    region: R2_REGION,
    endpoint: `https://${credentials.accountId}.r2.cloudflarestorage.com`,
    forcePathStyle: true,
    credentials: {
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey,
    },
  });

const loadManifest = async (): Promise<MediaManifest> => {
  const raw = await readFile(MANIFEST_PATH, 'utf8');
  const parsed = JSON.parse(raw) as unknown;

  if (!isRecord(parsed) || !isRecord(parsed['items'])) {
    throw new Error('[media] invalid image manifest');
  }

  return assertMediaManifestContract(parsed);
};

const sha256Hex = async (fileBuffer: Buffer): Promise<string> => {
  const { createHash } = await import('node:crypto');
  return createHash('sha256').update(fileBuffer).digest('hex');
};

const formatS3Error = (
  operation: 'inspect' | 'upload',
  bucketName: string,
  objectKey: string,
  error: unknown,
): string => {
  if (error instanceof S3ServiceException) {
    const status = error.$metadata.httpStatusCode;
    const requestId = error.$metadata.requestId;
    const extendedRequestId = error.$metadata.extendedRequestId;

    const lines = [
      `[media] failed to ${operation} ${objectKey}: ${String(status ?? 'unknown')} ${error.name}`,
      `bucket=${bucketName}`,
      `message=${error.message}`,
    ];

    if (requestId) {
      lines.push(`requestId=${requestId}`);
    }

    if (extendedRequestId) {
      lines.push(`extendedRequestId=${extendedRequestId}`);
    }

    return lines.join('\n');
  }

  if (error instanceof Error) {
    return [
      `[media] failed to ${operation} ${objectKey}: unexpected error`,
      `bucket=${bucketName}`,
      `message=${error.message}`,
    ].join('\n');
  }

  return [
    `[media] failed to ${operation} ${objectKey}: unexpected non-error value`,
    `bucket=${bucketName}`,
    `message=${String(error)}`,
  ].join('\n');
};

const parseUploadTarget = (output: MediaObjectContract): ParsedUploadTarget => {
  return {
    objectKey: output.objectKey,
    localPath: path.join(
      GENERATED_ASSET_ROOT,
      output.mediaItemId,
      `${output.variant}.${path.extname(output.objectKey).replace('.', '')}`,
    ),
    contentType: output.contentType,
  };
};

const createUploadTarget = async (output: MediaObjectContract): Promise<UploadTarget> => {
  const parsedTarget = parseUploadTarget(output);
  const fileBuffer = await readFile(parsedTarget.localPath);
  const contentLength = fileBuffer.byteLength;
  const sha256 = await sha256Hex(fileBuffer);

  if (contentLength !== output.byteSize) {
    throw new Error(`[media] local media byteSize mismatch: ${output.objectKey}`);
  }
  if (sha256 !== output.contentSha256) {
    throw new Error(`[media] local media contentSha256 mismatch: ${output.objectKey}`);
  }

  return {
    ...parsedTarget,
    contentLength,
    sha256,
    planObject: firstPlannedObject(
      assertR2UploadPlanArtifact({
        schemaVersion: 1,
        artifactKind: 'r2-media-upload-plan',
        objectCount: 1,
        plannedObjects: [
          {
            ...output,
            cacheControl: CACHE_CONTROL,
          },
        ],
      }),
    ),
    fileBuffer,
  };
};

const createUploadedEvidence = (
  target: UploadTarget,
  uploadStatus: UploadedMediaObjectEvidence['uploadStatus'],
): UploadedMediaObjectEvidence =>
  firstUploadedObject(
    assertR2UploadAttemptManifest({
      schemaVersion: 1,
      attemptKind: 'r2-media-upload',
      status: 'succeeded',
      objectCount: 1,
      uploadedObjects: [
        {
          ...target.planObject,
          uploadStatus,
        },
      ],
      failureReason: null,
    }),
  );

const headObject = async (
  client: S3Client,
  credentials: R2Credentials,
  objectKey: string,
): Promise<HeadObjectMetadata | null> => {
  try {
    const response = await client.send(
      new HeadObjectCommand({
        Bucket: credentials.bucketName,
        Key: objectKey,
      }),
    );

    return {
      sha256: response.Metadata?.['sha256'],
    };
  } catch (error) {
    if (error instanceof S3ServiceException) {
      const status = error.$metadata.httpStatusCode;
      if (status === 404 || error.name === 'NotFound' || error.name === 'NoSuchKey') {
        return null;
      }
    }

    throw new Error(formatS3Error('inspect', credentials.bucketName, objectKey, error));
  }
};

const putObject = async (
  client: S3Client,
  credentials: R2Credentials,
  target: UploadTarget,
): Promise<void> => {
  try {
    await client.send(
      new PutObjectCommand({
        Bucket: credentials.bucketName,
        Key: target.objectKey,
        Body: target.fileBuffer,
        ContentType: target.contentType,
        ContentLength: target.contentLength,
        CacheControl: CACHE_CONTROL,
        Metadata: {
          sha256: target.sha256,
        },
      }),
    );
  } catch (error) {
    throw new Error(formatS3Error('upload', credentials.bucketName, target.objectKey, error));
  }
};

const collectUploadPlan = async (manifest: MediaManifest): Promise<readonly UploadTarget[]> => {
  const items = Object.entries(manifest.items).sort(([left], [right]) => left.localeCompare(right));
  const uploadPlan: UploadTarget[] = [];

  for (const [, item] of items) {
    const variants = Object.values(item.variants);
    for (const variant of variants) {
      for (const output of variant.outputs) {
        uploadPlan.push(await createUploadTarget(output));
      }
    }
  }

  return uploadPlan.sort((left, right) => left.objectKey.localeCompare(right.objectKey));
};

const createUploadPlanArtifact = (uploadPlan: readonly UploadTarget[]): R2UploadPlanArtifact =>
  assertR2UploadPlanArtifact({
    schemaVersion: 1,
    artifactKind: 'r2-media-upload-plan',
    objectCount: uploadPlan.length,
    plannedObjects: uploadPlan.map((target) => target.planObject),
  });

const writeUploadPlanArtifact = async (uploadPlan: readonly UploadTarget[]): Promise<void> => {
  await writeJsonAtomically(UPLOAD_PLAN_PATH, createUploadPlanArtifact(uploadPlan));
};

const writeAttemptManifest = async (manifest: R2UploadAttemptManifest): Promise<string> => {
  const normalized = assertR2UploadAttemptManifest(manifest);
  await writeJsonAtomically(ATTEMPT_MANIFEST_PATH, normalized);
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
      `r2-attempt-artifact-name=${ATTEMPT_ARTIFACT_NAME}`,
      `r2-attempt-sha256=${attemptSha256}`,
      '',
    ].join('\n'),
    'utf8',
  );
};

const uploadMediaObjects = async (): Promise<void> => {
  const authority = productionAuthorityFromProcessEnv();
  await observeProductionBranchHead(authority, 'r2-media-upload');

  const credentials = getCredentials();
  const client = createS3Client(credentials);
  const manifest = await loadManifest();
  const uploadPlan = await collectUploadPlan(manifest);
  await writeUploadPlanArtifact(uploadPlan);

  console.log(
    `[media] starting upload: bucket=${credentials.bucketName}, objectCount=${String(
      uploadPlan.length,
    )}`,
  );

  let uploadedCount = 0;
  let skippedCount = 0;
  const uploadedObjects: UploadedMediaObjectEvidence[] = [];

  for (const target of uploadPlan) {
    const existingObject = await headObject(client, credentials, target.objectKey);

    if (existingObject?.sha256 === target.sha256) {
      skippedCount += 1;
      uploadedObjects.push(createUploadedEvidence(target, 'skipped-existing'));
      console.log(`[media] skipped ${target.objectKey}`);
      continue;
    }

    await putObject(client, credentials, target);
    uploadedObjects.push(createUploadedEvidence(target, 'uploaded'));
    uploadedCount += 1;
    console.log(`[media] uploaded ${target.objectKey}`);
  }

  const attemptSha256 = await writeAttemptManifest({
    schemaVersion: 1,
    attemptKind: 'r2-media-upload',
    status: 'succeeded',
    objectCount: uploadPlan.length,
    uploadedObjects,
    failureReason: null,
  });
  await writeGithubOutput(attemptSha256);

  console.log(
    `[media] upload complete: ${String(uploadedCount)} uploaded, ${String(skippedCount)} skipped`,
  );
};

const run = async (): Promise<void> => {
  try {
    await uploadMediaObjects();
  } catch (error) {
    const attemptSha256 = await writeAttemptManifest({
      schemaVersion: 1,
      attemptKind: 'r2-media-upload',
      status: 'failed',
      objectCount: 0,
      uploadedObjects: [],
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

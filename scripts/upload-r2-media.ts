/// <reference types="node" />

import { readFile } from 'node:fs/promises';
import path from 'node:path';

import {
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
  S3ServiceException,
} from '@aws-sdk/client-s3';

import type { MediaManifest, MediaVariantOutput } from '../build/media/image-resolver.js';

const GENERATED_ROOT = path.resolve(process.cwd(), '.generated', 'media');
const GENERATED_ASSET_ROOT = path.join(GENERATED_ROOT, 'assets');
const MANIFEST_PATH = path.join(GENERATED_ROOT, 'image-manifest.json');
const CACHE_CONTROL = 'public, max-age=31536000, immutable';
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

  if (
    !isRecord(parsed) ||
    parsed['schemaVersion'] !== 1 ||
    parsed['variantSetVersion'] !== 'reading-v1' ||
    !isRecord(parsed['items'])
  ) {
    throw new Error('[media] invalid image manifest');
  }

  return parsed as unknown as MediaManifest;
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

const parseUploadTarget = (output: MediaVariantOutput): ParsedUploadTarget => {
  const parsedUrl = new URL(output.url, 'https://media.invalid');
  const segments = parsedUrl.pathname.split('/').filter(Boolean);

  if (segments.length < 2) {
    throw new Error(`[media] invalid media object URL: ${output.url}`);
  }

  const fileName = segments.at(-1);
  const hash = segments.at(-2);
  if (fileName === undefined || hash === undefined) {
    throw new Error(`[media] invalid media object URL: ${output.url}`);
  }

  return {
    objectKey: segments.join('/'),
    localPath: path.join(GENERATED_ASSET_ROOT, hash, fileName),
    contentType: output.mediaType,
  };
};

const createUploadTarget = async (output: MediaVariantOutput): Promise<UploadTarget> => {
  const parsedTarget = parseUploadTarget(output);
  const fileBuffer = await readFile(parsedTarget.localPath);

  return {
    ...parsedTarget,
    contentLength: fileBuffer.byteLength,
    sha256: await sha256Hex(fileBuffer),
    fileBuffer,
  };
};

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

const uploadMediaObjects = async (): Promise<void> => {
  const credentials = getCredentials();
  const client = createS3Client(credentials);
  const manifest = await loadManifest();
  const items = Object.entries(manifest.items).sort(([left], [right]) => left.localeCompare(right));

  console.log(
    `[media] starting upload: bucket=${credentials.bucketName}, itemCount=${String(items.length)}`,
  );

  let uploadedCount = 0;
  let skippedCount = 0;

  for (const [, item] of items) {
    const variants = Object.values(item.variants);
    for (const variant of variants) {
      for (const output of variant.outputs) {
        const target = await createUploadTarget(output);
        const existingObject = await headObject(client, credentials, target.objectKey);

        if (existingObject?.sha256 === target.sha256) {
          skippedCount += 1;
          console.log(`[media] skipped ${target.objectKey}`);
          continue;
        }

        await putObject(client, credentials, target);
        uploadedCount += 1;
        console.log(`[media] uploaded ${target.objectKey}`);
      }
    }
  }

  console.log(
    `[media] upload complete: ${String(uploadedCount)} uploaded, ${String(skippedCount)} skipped`,
  );
};

const run = async (): Promise<void> => {
  await uploadMediaObjects();
};

const entryPoint = process.argv[1];
if (typeof entryPoint === 'string' && import.meta.url === `file://${entryPoint}`) {
  void run();
}

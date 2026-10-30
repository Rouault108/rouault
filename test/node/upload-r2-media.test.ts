import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
  S3ServiceException,
} from '@aws-sdk/client-s3';

import { headObject, putObject } from '../../scripts/upload-r2-media.js';
import {
  assertR2UploadAttemptManifest,
  MEDIA_DELIVERY_CACHE_CONTROL,
  toFailureReason,
} from '../../scripts/deploy/release-state-schema.js';

const credentials = {
  accountId: 'fixture-account',
  accessKeyId: 'fixture-access',
  secretAccessKey: 'fixture-value',
  bucketName: 'fixture-bucket',
};
const digest = 'a'.repeat(64);
const objectKey = `media/${digest}/reading.webp`;
const target: Parameters<typeof putObject>[2] = {
  objectKey,
  localPath: 'fixture.webp',
  contentType: 'image/webp',
  contentLength: 1,
  sha256: digest,
  fileBuffer: Buffer.from('x'),
  planObject: {
    mediaItemId: 'fixture',
    variant: 'reading',
    format: 'webp',
    objectKey,
    contentSha256: digest,
    byteSize: 1,
    contentType: 'image/webp',
    publicUrl: `https://media.example.com/${objectKey}`,
    cacheControl: MEDIA_DELIVERY_CACHE_CONTROL,
  },
};

const clients: S3Client[] = [];
const createClient = (): S3Client => {
  const client = new S3Client({ region: 'auto', credentials });
  clients.push(client);
  return client;
};

const captureFailure = async (run: () => Promise<unknown>): Promise<Error> => {
  try {
    await run();
  } catch (error) {
    if (error instanceof Error) return error;
    throw error;
  }
  throw new Error('Expected a media operation failure');
};

const failureCases = [
  {
    label: 'SDK error',
    create: () =>
      new S3ServiceException({
        name: 'AccessDenied',
        $fault: 'client',
        $metadata: { httpStatusCode: 403, requestId: 'fixture-request' },
        message: 'benign SDK fixture',
      }),
  },
  { label: 'ordinary error', create: () => new Error('benign transport fixture') },
  { label: 'non-error string', create: () => 'benign non-error fixture' },
  { label: 'non-error object', create: () => ({ detail: 'benign object fixture' }) },
];

describe('R2 media operation failures', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    for (const client of clients.splice(0)) client.destroy();
  });

  it.each([
    { status: 404, name: 'UnexpectedName' },
    { status: 400, name: 'NotFound' },
    { status: 400, name: 'NoSuchKey' },
  ])('keeps missing objects as null for $status/$name', async ({ status, name }) => {
    const client = createClient();
    const original = new S3ServiceException({
      name,
      $fault: 'client',
      $metadata: { httpStatusCode: status },
      message: 'benign missing object fixture',
    });
    const send = vi.spyOn(client, 'send').mockImplementation(async () => {
      throw original;
    });

    await expect(headObject(client, credentials, objectKey)).resolves.toBeNull();
    expect(send).toHaveBeenCalledExactlyOnceWith(expect.any(HeadObjectCommand));
  });

  describe.each(['inspect', 'upload'] as const)('%s', (operation) => {
    it.each(failureCases)('preserves context and the original $label cause', async ({ create }) => {
      const original = create();
      const client = createClient();
      const send = vi.spyOn(client, 'send').mockImplementation(async () => {
        throw original;
      });
      const error = await captureFailure(() =>
        operation === 'inspect'
          ? headObject(client, credentials, objectKey)
          : putObject(client, credentials, target),
      );

      expect(error.name).toBe('Error');
      expect(error.cause).toBe(original);
      const detail =
        original instanceof S3ServiceException
          ? '403 AccessDenied'
          : original instanceof Error
            ? 'unexpected error'
            : 'unexpected non-error value';
      expect(error.message).toBe(
        [
          `[media] failed to ${operation} ${objectKey}: ${detail}`,
          'bucket=fixture-bucket',
          `message=${original instanceof Error ? original.message : String(original)}`,
          ...(original instanceof S3ServiceException ? ['requestId=fixture-request'] : []),
        ].join('\n'),
      );
      expect(send).toHaveBeenCalledExactlyOnceWith(
        expect.any(operation === 'inspect' ? HeadObjectCommand : PutObjectCommand),
      );
      const evidence = assertR2UploadAttemptManifest({
        schemaVersion: 1,
        attemptKind: 'r2-media-upload',
        status: 'failed',
        objectCount: 0,
        uploadedObjects: [],
        failureReason: toFailureReason(error),
      });
      expect(evidence.failureReason).toBe('error:Error');
      expect(JSON.stringify(evidence)).not.toContain('benign');
      expect(evidence).not.toHaveProperty('cause');
    });
  });
});

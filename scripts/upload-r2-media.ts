/// <reference types="node" />

import { createHash, createHmac } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import type { MediaManifest, MediaVariantOutput } from '../build/media/image-resolver.js';

const GENERATED_ROOT = path.resolve(process.cwd(), '.generated', 'media');
const GENERATED_ASSET_ROOT = path.join(GENERATED_ROOT, 'assets');
const MANIFEST_PATH = path.join(GENERATED_ROOT, 'image-manifest.json');
const CACHE_CONTROL = 'public, max-age=31536000, immutable';
const R2_SERVICE = 's3';
const R2_REGION = 'auto';
const ERROR_BODY_MAX_LENGTH = 1_500;

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
    throw new Error(
      `[media] R2_BUCKET_NAME must be a bare bucket name, but got: ${bucketName}`,
    );
  }
  return bucketName;
};

const getCredentials = (): R2Credentials => ({
  accountId: readRequiredEnv('CLOUDFLARE_ACCOUNT_ID'),
  accessKeyId: readRequiredEnv('R2_ACCESS_KEY_ID'),
  secretAccessKey: readRequiredEnv('R2_SECRET_ACCESS_KEY'),
  bucketName: validateBareBucketName(readRequiredEnv('R2_BUCKET_NAME')),
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

const encodeRfc3986 = (value: string): string =>
  encodeURIComponent(value).replace(
    /[!'()*]/g,
    (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  );

const encodeCanonicalPath = (pathname: string): string =>
  pathname
    .split('/')
    .map((segment) => encodeRfc3986(segment))
    .join('/');

const getAmzDate = (date = new Date()): string =>
  date.toISOString().replace(/[:-]|\.\d{3}/g, '');

const sha256Hex = (value: string | Uint8Array): string =>
  createHash('sha256').update(value).digest('hex');

const hmac = (key: string | Uint8Array, value: string): Buffer =>
  createHmac('sha256', key).update(value, 'utf8').digest();

const getSigningKey = (secretAccessKey: string, dateStamp: string): Buffer => {
  const kDate = hmac(`AWS4${secretAccessKey}`, dateStamp);
  const kRegion = hmac(kDate, R2_REGION);
  const kService = hmac(kRegion, R2_SERVICE);
  return hmac(kService, 'aws4_request');
};

const buildSignedHeaders = (
  method: 'GET' | 'HEAD' | 'PUT',
  url: URL,
  payloadHash: string,
  extraHeaders: Record<string, string>,
  credentials: R2Credentials,
): Record<string, string> => {
  const amzDate = getAmzDate();
  const dateStamp = amzDate.slice(0, 8);
  const headers: Record<string, string> = {
    host: url.host,
    'x-amz-date': amzDate,
    'x-amz-content-sha256': payloadHash,
    ...extraHeaders,
  };

  const canonicalHeaders = Object.entries(headers)
    .map(([name, value]) => [name.toLowerCase(), value.trim().replace(/\s+/g, ' ')] as const)
    .sort(([left], [right]) => left.localeCompare(right));
  const signedHeaderNames = canonicalHeaders.map(([name]) => name).join(';');
  const canonicalHeadersText = `${canonicalHeaders
    .map(([name, value]) => `${name}:${value}`)
    .join('\n')}\n`;
  const canonicalRequest = [
    method,
    encodeCanonicalPath(url.pathname),
    '',
    canonicalHeadersText,
    signedHeaderNames,
    payloadHash,
  ].join('\n');

  const credentialScope = `${dateStamp}/${R2_REGION}/${R2_SERVICE}/aws4_request`;
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join('\n');
  const signature = createHmac('sha256', getSigningKey(credentials.secretAccessKey, dateStamp))
    .update(stringToSign, 'utf8')
    .digest('hex');

  return {
    ...headers,
    authorization: [
      'AWS4-HMAC-SHA256',
      `Credential=${credentials.accessKeyId}/${credentialScope}`,
      `SignedHeaders=${signedHeaderNames}`,
      `Signature=${signature}`,
    ].join(' '),
  };
};

const normalizeErrorText = (value: string): string =>
  value.replace(/\s+/g, ' ').trim();

const truncateText = (value: string, maxLength = ERROR_BODY_MAX_LENGTH): string =>
  value.length <= maxLength ? value : `${value.slice(0, maxLength)}…`;

const readResponseTextSafe = async (response: Response): Promise<string | undefined> => {
  try {
    const text = await response.text();
    const normalized = normalizeErrorText(text);
    return normalized.length > 0 ? truncateText(normalized) : undefined;
  } catch {
    return undefined;
  }
};

const formatResponseHeaders = (response: Response): string | undefined => {
  const headerEntries: [string, string][] = [];

  for (const [name, value] of [
    ['content-type', response.headers.get('content-type')],
    ['cf-ray', response.headers.get('cf-ray')],
    ['x-amz-request-id', response.headers.get('x-amz-request-id')],
    ['x-amz-id-2', response.headers.get('x-amz-id-2')],
  ] as const) {
    if (typeof value === 'string' && value.length > 0) {
      headerEntries.push([name, value]);
    }
  }

  if (headerEntries.length === 0) {
    return undefined;
  }

  return headerEntries.map(([name, value]) => `${name}=${value}`).join(', ');
};

const formatFailureMessage = (args: {
  readonly operation: 'inspect' | 'upload';
  readonly objectKey: string;
  readonly bucketName: string;
  readonly url: URL;
  readonly response: Response;
  readonly responseBody: string | undefined;
}): string => {
  const responseHeaders = formatResponseHeaders(args.response);

  const lines = [
    `[media] failed to ${args.operation} ${args.objectKey}: ${String(args.response.status)} ${args.response.statusText}`,
    `bucket=${args.bucketName}`,
    `url=${args.url.toString()}`,
  ];

  if (responseHeaders !== undefined) {
    lines.push(`responseHeaders=${responseHeaders}`);
  }

  if (args.responseBody !== undefined) {
    lines.push(`responseBody=${args.responseBody}`);
  }

  return lines.join('\n');
};

const getObjectUrl = (credentials: R2Credentials, objectKey: string): URL =>
  new URL(
    `https://${credentials.accountId}.r2.cloudflarestorage.com/${credentials.bucketName}/${objectKey}`,
  );

const readHeadFailureDiagnosticBody = async (
  credentials: R2Credentials,
  objectKey: string,
): Promise<string | undefined> => {
  const url = getObjectUrl(credentials, objectKey);
  const headers = buildSignedHeaders(
    'GET',
    url,
    sha256Hex(''),
    { range: 'bytes=0-0' },
    credentials,
  );

  const response = await fetch(url, {
    method: 'GET',
    headers,
  });

  if (response.ok || response.status === 206) {
    return undefined;
  }

  return readResponseTextSafe(response);
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

  const objectKey = segments.join('/');
  const localPath = path.join(GENERATED_ASSET_ROOT, hash, fileName);

  return {
    objectKey,
    localPath,
    contentType: output.mediaType,
  };
};

const createUploadTarget = async (output: MediaVariantOutput): Promise<UploadTarget> => {
  const parsedTarget = parseUploadTarget(output);
  const fileBuffer = await readFile(parsedTarget.localPath);

  return {
    ...parsedTarget,
    contentLength: fileBuffer.byteLength,
    sha256: sha256Hex(fileBuffer),
    fileBuffer,
  };
};

const headObject = async (
  credentials: R2Credentials,
  objectKey: string,
): Promise<HeadObjectMetadata | null> => {
  const url = getObjectUrl(credentials, objectKey);
  const headers = buildSignedHeaders('HEAD', url, sha256Hex(''), {}, credentials);
  const response = await fetch(url, {
    method: 'HEAD',
    headers,
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    const responseBody =
      (await readResponseTextSafe(response)) ??
      (await readHeadFailureDiagnosticBody(credentials, objectKey));

    throw new Error(
      formatFailureMessage({
        operation: 'inspect',
        objectKey,
        bucketName: credentials.bucketName,
        url,
        response,
        responseBody,
      }),
    );
  }

  return {
    sha256: response.headers.get('x-amz-meta-sha256') ?? undefined,
  };
};

const putObject = async (
  credentials: R2Credentials,
  target: UploadTarget,
  fileBuffer: Buffer,
): Promise<void> => {
  const url = getObjectUrl(credentials, target.objectKey);
  const payloadHash = target.sha256;
  const headers = buildSignedHeaders(
    'PUT',
    url,
    payloadHash,
    {
      'cache-control': CACHE_CONTROL,
      'content-length': String(target.contentLength),
      'content-type': target.contentType,
      'x-amz-meta-sha256': target.sha256,
    },
    credentials,
  );

  const response = await fetch(url, {
    method: 'PUT',
    headers,
    body: fileBuffer as unknown as BodyInit,
  });

  if (!response.ok) {
    const responseBody = await readResponseTextSafe(response);

    throw new Error(
      formatFailureMessage({
        operation: 'upload',
        objectKey: target.objectKey,
        bucketName: credentials.bucketName,
        url,
        response,
        responseBody,
      }),
    );
  }
};

const uploadMediaObjects = async (): Promise<void> => {
  const credentials = getCredentials();
  const manifest = await loadManifest();
  const items = Object.entries(manifest.items).sort(([left], [right]) =>
    left.localeCompare(right),
  );

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
        const existingObject = await headObject(credentials, target.objectKey);

        if (existingObject?.sha256 === target.sha256) {
          skippedCount += 1;
          console.log(`[media] skipped ${target.objectKey}`);
          continue;
        }

        await putObject(credentials, target, target.fileBuffer);
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

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

const getCredentials = (): R2Credentials => ({
  accountId: readRequiredEnv('CLOUDFLARE_ACCOUNT_ID'),
  accessKeyId: readRequiredEnv('R2_ACCESS_KEY_ID'),
  secretAccessKey: readRequiredEnv('R2_SECRET_ACCESS_KEY'),
  bucketName: readRequiredEnv('R2_BUCKET_NAME'),
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

const getAmzDate = (date = new Date()): string => date.toISOString().replace(/[:-]|\.\d{3}/g, '');

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
  method: 'HEAD' | 'PUT',
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
  const canonicalHeadersText = `${canonicalHeaders.map(([name, value]) => `${name}:${value}`).join('\n')}\n`;
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
  const url = new URL(
    `https://${credentials.accountId}.r2.cloudflarestorage.com/${credentials.bucketName}/${objectKey}`,
  );
  const headers = buildSignedHeaders('HEAD', url, sha256Hex(''), {}, credentials);
  const response = await fetch(url, {
    method: 'HEAD',
    headers,
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(
      `[media] failed to inspect ${objectKey}: ${String(response.status)} ${response.statusText}`,
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
  const url = new URL(
    `https://${credentials.accountId}.r2.cloudflarestorage.com/${credentials.bucketName}/${target.objectKey}`,
  );
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
    throw new Error(
      `[media] failed to upload ${target.objectKey}: ${String(response.status)} ${response.statusText}`,
    );
  }
};

const uploadMediaObjects = async (): Promise<void> => {
  const credentials = getCredentials();
  const manifest = await loadManifest();
  const items = Object.entries(manifest.items).sort(([left], [right]) => left.localeCompare(right));

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

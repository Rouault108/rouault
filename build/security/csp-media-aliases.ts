import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import {
  assertMediaManifestContract,
  assertMediaObjectContract,
  MEDIA_FORMAT_EXTENSION,
} from '../../shared/media/media-object-contract.js';

export interface CspMediaAlias {
  file: string;
  sourceAsset: string;
  sha256: string;
  contentType: string;
}

export const validateMediaAlias = async (dist: string, value: unknown): Promise<CspMediaAlias> => {
  const output = assertMediaObjectContract(value);
  if (
    !/^(?:content\/_assets|examples\/media)\//u.test(output.mediaItemId) ||
    output.mediaItemId.includes('\\') ||
    output.mediaItemId.split('/').some((part) => !part || part === '.' || part === '..')
  )
    throw new Error('[csp] unsafe media source identity');
  const sourceAsset = `.generated/media/assets/${output.mediaItemId}/${output.variant}.${MEDIA_FORMAT_EXTENSION[output.format]}`;
  const bytes = await readFile(path.resolve(dist, '..', sourceAsset));
  const digest = createHash('sha256').update(bytes).digest('hex');
  if (digest !== output.contentSha256 || bytes.length !== output.byteSize)
    throw new Error('[csp] media alias byte/hash mismatch');
  return {
    file: `media/${output.objectKey}`,
    sourceAsset,
    sha256: digest,
    contentType: output.contentType,
  };
};

export const loadMediaAliases = async (dist: string): Promise<CspMediaAlias[]> => {
  const raw: unknown = JSON.parse(
    await readFile(path.resolve(dist, '../.generated/media/image-manifest.json'), 'utf8'),
  );
  const manifest = assertMediaManifestContract(raw);
  const aliases: CspMediaAlias[] = [];
  for (const item of Object.values(manifest.items))
    for (const variant of Object.values(item.variants))
      for (const output of variant.outputs) aliases.push(await validateMediaAlias(dist, output));
  return aliases;
};

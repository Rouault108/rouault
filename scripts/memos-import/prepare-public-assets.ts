import path from 'node:path';
import {
  validateImageInput,
  type ImageInputGuards,
} from '../../build/media/validate-image-inputs.js';
import { hashBytes, readSourceFile } from './source-snapshot.js';
import type { Snapshot } from './model.js';
import { assertMetadataFreeAvif } from './inspect-avif.js';
const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const stripPngMetadata = (input: Buffer, rightsConfirmed: boolean): Buffer => {
  if (!input.subarray(0, 8).equals(pngSignature))
    throw new Error('[images] PNG signature mismatch');
  const chunks: Buffer[] = [input.subarray(0, 8)];
  const retained = new Set([
    'IHDR',
    'PLTE',
    'IDAT',
    'IEND',
    'tRNS',
    'sRGB',
    'gAMA',
    'cHRM',
    'sBIT',
    'pHYs',
  ]);
  let offset = 8;
  while (offset < input.length) {
    const length = input.readUInt32BE(offset);
    const end = offset + length + 12;
    if (end > input.length) throw new Error('[images] truncated PNG');
    const type = input.toString('ascii', offset + 4, offset + 8);
    if (type === 'iCCP' || type === 'eXIf')
      throw new Error('[images] unverified display metadata requires review');
    if (retained.has(type)) chunks.push(input.subarray(offset, end));
    else if (['tEXt', 'zTXt', 'iTXt'].includes(type) && !rightsConfirmed)
      throw new Error('[images] textual rights metadata requires an approved body notice');
    else if (!['tEXt', 'zTXt', 'iTXt', 'tIME'].includes(type))
      throw new Error('[images] unverified PNG chunk');
    offset = end;
  }
  return Buffer.concat(chunks);
};
const stripJpegMetadata = (input: Buffer, rightsConfirmed: boolean): Buffer => {
  if (input.length < 2 || input.readUInt16BE(0) !== 0xffd8)
    throw new Error('[images] JPEG signature mismatch');
  const chunks = [input.subarray(0, 2)];
  const codingMarkers = new Set([
    0xc0, 0xc1, 0xc2, 0xc3, 0xc4, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcc, 0xcd, 0xce, 0xcf, 0xda,
    0xdb, 0xdd,
  ]);
  let offset = 2;
  let scanned = false;
  while (offset < input.length) {
    const start = offset;
    if (input[offset] !== 0xff) throw new Error('[images] invalid JPEG marker');
    while (input[offset] === 0xff) offset += 1;
    const marker = input[offset++];
    if (marker === 0xd9) {
      if (!scanned || offset !== input.length)
        throw new Error('[images] unverified JPEG data after EOI or missing scan');
      chunks.push(input.subarray(start, offset));
      return Buffer.concat(chunks);
    }
    if (
      marker === undefined ||
      !(codingMarkers.has(marker) || (marker >= 0xe0 && marker <= 0xef) || marker === 0xfe)
    )
      throw new Error('[images] unverified JPEG marker');
    if (offset + 2 > input.length) throw new Error('[images] truncated JPEG');
    const length = input.readUInt16BE(offset);
    const end = offset + length;
    if (length < 2 || end > input.length) throw new Error('[images] truncated JPEG');
    if (marker === 0xe2 || marker === 0xee)
      throw new Error('[images] unverified JPEG color metadata');
    if (((marker >= 0xe1 && marker <= 0xef) || marker === 0xfe) && !rightsConfirmed)
      throw new Error('[images] textual rights metadata requires an approved body notice');
    if (!((marker >= 0xe1 && marker <= 0xef) || marker === 0xfe)) {
      if (marker === 0xe0) {
        const payload = input.subarray(offset + 2, end);
        if (payload.toString('ascii', 0, 5) !== 'JFIF\0' || payload.length !== 14)
          throw new Error('[images] JPEG thumbnail metadata');
      }
      chunks.push(input.subarray(start, end));
    }
    offset = end;
    if (marker === 0xda) {
      scanned = true;
      const scanStart = offset;
      // entropy内のstuffing/restartは画素符号として保持し、次のmarkerから全域検査を続ける。
      while (offset < input.length) {
        if (input[offset] !== 0xff) {
          offset += 1;
          continue;
        }
        const prefix = offset++;
        while (input[offset] === 0xff) offset += 1;
        const next = input[offset];
        if (next === 0) {
          if (offset !== prefix + 1) throw new Error('[images] invalid JPEG stuffing');
          offset += 1;
        } else if (next !== undefined && next >= 0xd0 && next <= 0xd7) {
          offset += 1;
        } else {
          offset = prefix;
          break;
        }
      }
      chunks.push(input.subarray(scanStart, offset));
    }
  }
  throw new Error('[images] JPEG EOI missing');
};
const stripWebpMetadata = (input: Buffer, rightsConfirmed: boolean): Buffer => {
  if (input.toString('ascii', 0, 4) !== 'RIFF' || input.toString('ascii', 8, 12) !== 'WEBP')
    throw new Error('[images] WebP signature mismatch');
  const chunks: Buffer[] = [];
  let offset = 12;
  while (offset < input.length) {
    const type = input.toString('ascii', offset, offset + 4);
    const length = input.readUInt32LE(offset + 4);
    const end = offset + 8 + length + (length % 2);
    if (end > input.length) throw new Error('[images] truncated WebP');
    if (type === 'ICCP') throw new Error('[images] unverified WebP color metadata');
    if (['EXIF', 'XMP '].includes(type) && !rightsConfirmed)
      throw new Error('[images] textual rights metadata requires an approved body notice');
    if (['VP8 ', 'VP8L', 'ALPH', 'VP8X'].includes(type)) {
      const chunk = Buffer.from(input.subarray(offset, end));
      if (type === 'VP8X') chunk[8] = (chunk[8] ?? 0) & ~0x2c;
      chunks.push(chunk);
    } else if (!['EXIF', 'XMP '].includes(type)) throw new Error('[images] unverified WebP chunk');
    offset = end;
  }
  const header = Buffer.from(input.subarray(0, 12));
  header.writeUInt32LE(chunks.reduce((sum, chunk) => sum + chunk.length, 0) + 4, 4);
  return Buffer.concat([header, ...chunks]);
};
export const preparePublicAsset = async (
  snapshot: Snapshot,
  sourcePath: string,
  guards: ImageInputGuards,
  rightsConfirmed: boolean,
) => {
  const input = Buffer.from(readSourceFile(snapshot, sourcePath));
  const extension = path.posix.extname(sourcePath).slice(1).toLowerCase();
  const before = await validateImageInput(input, extension, guards);
  if ((before.metadata.orientation ?? 1) !== 1 || before.metadata.icc)
    throw new Error('[images] display metadata cannot be safely preserved');
  if ((before.metadata.exif || before.metadata.xmp || before.metadata.iptc) && !rightsConfirmed)
    throw new Error('[images] rights metadata requires an approved body notice');
  let output: Buffer;
  if (extension === 'png') output = stripPngMetadata(input, rightsConfirmed);
  else if (extension === 'jpg' || extension === 'jpeg')
    output = stripJpegMetadata(input, rightsConfirmed);
  else if (extension === 'webp') output = stripWebpMetadata(input, rightsConfirmed);
  else {
    assertMetadataFreeAvif(input);
    output = input;
  }
  const after = await validateImageInput(output, extension, guards);
  if (
    after.metadata.exif ||
    after.metadata.xmp ||
    after.metadata.iptc ||
    after.metadata.icc ||
    !before.decoded.equals(after.decoded) ||
    before.metadata.space !== after.metadata.space ||
    before.metadata.width !== after.metadata.width ||
    before.metadata.height !== after.metadata.height
  )
    throw new Error('[images] metadata or visual invariant failed');
  const formatExtension = extension === 'jpeg' ? 'jpg' : extension;
  const publicPath = `content/_assets/memos-import/${hashBytes(output)}.${formatExtension}`;
  return {
    sourcePath,
    publicPath,
    bytes: output,
    sourceHash: hashBytes(input),
    outputHash: hashBytes(output),
  };
};

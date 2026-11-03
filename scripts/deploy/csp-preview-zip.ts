import { inflateRawSync } from 'node:zlib';
import { mkdir, open, realpath } from 'node:fs/promises';
import path from 'node:path';

export interface PreviewZipEntry {
  name: string;
  bytes: Buffer;
  directory: boolean;
}
const MAX_BYTES = 128 * 1024 * 1024,
  MAX_FILE = 32 * 1024 * 1024,
  MAX_ENTRIES = 2000;
const fail = (): never => {
  throw new Error('[preview-delivery] invalid/unsupported bounded ZIP');
};
const crcTable = Array.from({ length: 256 }, (_, initial) => {
  let value = initial;
  for (let bit = 0; bit < 8; bit++) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  return value >>> 0;
});
export const previewCrc32 = (bytes: Uint8Array): number => {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = (crc >>> 8) ^ (crcTable[(crc ^ byte) & 255] ?? 0);
  return (crc ^ 0xffffffff) >>> 0;
};
const extras = (bytes: Buffer): void => {
  let offset = 0;
  while (offset < bytes.length) {
    if (offset + 4 > bytes.length) fail();
    const tag = bytes.readUInt16LE(offset),
      size = bytes.readUInt16LE(offset + 2);
    offset += 4;
    // 時刻metadataだけを許可し、ZIP64や別名のUnicode path等は解釈しない。
    if ((tag !== 0x5455 && tag !== 0x000a) || offset + size > bytes.length || size > 64) fail();
    offset += size;
  }
};
const safeName = (bytes: Buffer, flags: number): string => {
  let name: string;
  try {
    name = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return fail();
  }
  if (
    name.length === 0 ||
    name.normalize('NFC') !== name ||
    /[\\:]/u.test(name) ||
    Array.from(name).some((c) => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127) ||
    name.startsWith('/') ||
    (!(flags & 0x0800) && /[^\x20-\x7e]/u.test(name))
  )
    fail();
  const parts = name.replace(/\/$/u, '').split('/');
  if (parts.length > 32 || parts.some((part) => !part || part.startsWith('.'))) fail();
  return name;
};

export const readPreviewZip = (archive: Buffer): PreviewZipEntry[] => {
  if (archive.length < 22 || archive.length > MAX_BYTES) fail();
  const end = archive.length - 22;
  if (
    archive.readUInt32LE(end) !== 0x06054b50 ||
    archive.readUInt16LE(end + 20) !== 0 ||
    archive.readUInt16LE(end + 4) !== 0 ||
    archive.readUInt16LE(end + 6) !== 0
  )
    fail();
  const count = archive.readUInt16LE(end + 10),
    centralSize = archive.readUInt32LE(end + 12),
    centralStart = archive.readUInt32LE(end + 16);
  if (
    !count ||
    count > MAX_ENTRIES ||
    count !== archive.readUInt16LE(end + 8) ||
    centralStart + centralSize !== end
  )
    fail();
  const central: {
    name: string;
    nameBytes: Buffer;
    flags: number;
    method: number;
    crc: number;
    compressed: number;
    size: number;
    offset: number;
    directory: boolean;
  }[] = [];
  const names = new Set<string>();
  let at = centralStart,
    total = 0;
  for (let index = 0; index < count; index++) {
    if (at + 46 > end || archive.readUInt32LE(at) !== 0x02014b50) fail();
    const flags = archive.readUInt16LE(at + 8),
      method = archive.readUInt16LE(at + 10),
      crc = archive.readUInt32LE(at + 16),
      compressed = archive.readUInt32LE(at + 20),
      size = archive.readUInt32LE(at + 24),
      nameSize = archive.readUInt16LE(at + 28),
      extraSize = archive.readUInt16LE(at + 30),
      commentSize = archive.readUInt16LE(at + 32),
      offset = archive.readUInt32LE(at + 42),
      mode = (archive.readUInt32LE(at + 38) >>> 16) & 0o170000;
    if (
      archive.readUInt16LE(at + 34) !== 0 ||
      flags & ~(0x0800 | 0x0008 | 0x0006) ||
      ![0, 8].includes(method) ||
      (method === 0 && flags & 0x0006) ||
      size > MAX_FILE ||
      (total += size) > MAX_BYTES ||
      at + 46 + nameSize + extraSize + commentSize > end ||
      commentSize
    )
      fail();
    const nameBytes = archive.subarray(at + 46, at + 46 + nameSize),
      name = safeName(nameBytes, flags),
      directory = name.endsWith('/');
    const key = name.replace(/\/$/u, '').toLocaleLowerCase('en-US');
    if (
      names.has(key) ||
      (mode !== 0 && mode !== (directory ? 0o040000 : 0o100000)) ||
      (directory && (size !== 0 || crc !== 0))
    )
      fail();
    names.add(key);
    extras(archive.subarray(at + 46 + nameSize, at + 46 + nameSize + extraSize));
    central.push({ name, nameBytes, flags, method, crc, compressed, size, offset, directory });
    at += 46 + nameSize + extraSize + commentSize;
  }
  if (at !== end) fail();
  const entries: PreviewZipEntry[] = [];
  let local = 0;
  for (const entry of central.sort((a, b) => a.offset - b.offset)) {
    if (
      entry.offset !== local ||
      local + 30 > centralStart ||
      archive.readUInt32LE(local) !== 0x04034b50 ||
      archive.readUInt16LE(local + 6) !== entry.flags ||
      archive.readUInt16LE(local + 8) !== entry.method
    )
      fail();
    const nameSize = archive.readUInt16LE(local + 26),
      extraSize = archive.readUInt16LE(local + 28),
      start = local + 30 + nameSize + extraSize;
    if (
      start > centralStart ||
      !archive.subarray(local + 30, local + 30 + nameSize).equals(entry.nameBytes)
    )
      fail();
    extras(archive.subarray(local + 30 + nameSize, start));
    for (const [position, expected] of [
      [14, entry.crc],
      [18, entry.compressed],
      [22, entry.size],
    ]) {
      const value = archive.readUInt32LE(local + (position ?? 0));
      if (value !== expected && (!(entry.flags & 8) || value !== 0)) fail();
    }
    if (start + entry.compressed > centralStart) fail();
    const compressed = archive.subarray(start, start + entry.compressed);
    let bytes: Buffer;
    try {
      bytes =
        entry.method === 0
          ? Buffer.from(compressed)
          : inflateRawSync(compressed, { maxOutputLength: Math.max(1, entry.size) });
    } catch {
      return fail();
    }
    if (bytes.length !== entry.size || previewCrc32(bytes) !== entry.crc) fail();
    local = start + entry.compressed;
    if (entry.flags & 8) {
      if (local + 12 > centralStart) fail();
      if (archive.readUInt32LE(local) === 0x08074b50) local += 4;
      if (
        local + 12 > centralStart ||
        archive.readUInt32LE(local) !== entry.crc ||
        archive.readUInt32LE(local + 4) !== entry.compressed ||
        archive.readUInt32LE(local + 8) !== entry.size
      )
        fail();
      local += 12;
    }
    entries.push({ name: entry.name, bytes, directory: entry.directory });
  }
  if (local !== centralStart) fail();
  const files = new Set(
    entries
      .filter((entry) => !entry.directory)
      .map((entry) => entry.name.toLocaleLowerCase('en-US')),
  );
  for (const entry of entries) {
    const parts = entry.name.replace(/\/$/u, '').toLocaleLowerCase('en-US').split('/');
    for (let i = 1; i < parts.length; i++) if (files.has(parts.slice(0, i).join('/'))) fail();
  }
  return entries;
};

export const extractPreviewZip = async (archive: Buffer, root: string): Promise<void> => {
  const entries = readPreviewZip(archive);
  if ((await realpath(path.dirname(root))) !== path.resolve(path.dirname(root))) fail();
  await mkdir(root, { mode: 0o700 });
  for (const entry of entries) {
    const target = path.join(root, entry.name);
    if (entry.directory) await mkdir(target, { recursive: true, mode: 0o700 });
    else {
      await mkdir(path.dirname(target), { recursive: true, mode: 0o700 });
      const file = await open(target, 'wx', 0o600);
      try {
        await file.writeFile(entry.bytes);
      } finally {
        await file.close();
      }
    }
  }
};

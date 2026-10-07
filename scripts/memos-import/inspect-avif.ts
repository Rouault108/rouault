// metadataがないと検証できるAVIFだけを通し、未知のbox/item/OBUは公開前に止める。
// https://aomediacodec.github.io/av1-avif/v1.2.0.html
interface Box {
  type: string;
  data: Buffer;
}
const boxes = (bytes: Buffer): Box[] => {
  const result: Box[] = [];
  let offset = 0;
  while (offset < bytes.length) {
    if (offset + 8 > bytes.length) throw new Error('[images] truncated AVIF box');
    const size = bytes.readUInt32BE(offset);
    if (size < 8 || offset + size > bytes.length)
      throw new Error('[images] unsupported AVIF box size');
    result.push({
      type: bytes.toString('ascii', offset + 4, offset + 8),
      data: bytes.subarray(offset + 8, offset + size),
    });
    offset += size;
  }
  return result;
};
const zeroVersion = (data: Buffer): Buffer => {
  if (data.length < 4 || data.readUInt32BE(0) !== 0)
    throw new Error('[images] unsupported AVIF version');
  return data.subarray(4);
};
const reject: () => never = () => {
  throw new Error('[images] AVIF metadata or unverified structure requires review');
};
const inspectObus = (data: Buffer): void => {
  let offset = 0;
  while (offset < data.length) {
    const header = data[offset++];
    if (header === undefined || header & 0x81 || !(header & 2)) reject();
    const type = (header >> 3) & 15;
    if (![1, 2, 3, 4, 6, 7, 8].includes(type)) reject();
    if (header & 4) {
      const extension = data[offset++];
      if (extension === undefined || extension & 7) reject();
    }
    let length = 0;
    let count = 0;
    for (let i = 0; i < 9; i++) {
      const byte = data[offset++];
      if (byte === undefined || count >= 8) reject();
      length += (byte & 127) * 2 ** (7 * count++);
      if (!(byte & 128)) break;
    }
    if (!Number.isSafeInteger(length) || offset + length > data.length) reject();
    if (type === 2 && length !== 0) reject();
    offset += length;
  }
};
const inspectProperties = (data: Buffer): void => {
  for (const box of boxes(data)) {
    const p = box.data;
    if (box.type === 'av1C') {
      if (p.length !== 4 || p[0] !== 0x81) reject();
    } else if (box.type === 'ispe') {
      if (zeroVersion(p).length !== 8) reject();
    } else if (box.type === 'pixi') {
      const q = zeroVersion(p);
      if (!q[0] || q.length !== 1 + q[0]) reject();
    } else if (box.type === 'colr') {
      if (p.length !== 11 || p.toString('ascii', 0, 4) !== 'nclx') reject();
    } else if (box.type === 'auxC') {
      if (zeroVersion(p).toString('ascii') !== 'urn:mpeg:mpegB:cicp:systems:auxiliary:alpha\0')
        reject();
    } else reject();
  }
};
export const assertMetadataFreeAvif = (input: Buffer): void => {
  const top = boxes(input);
  if (
    top.length !== 3 ||
    top[0]?.type !== 'ftyp' ||
    top[1]?.type !== 'meta' ||
    top[2]?.type !== 'mdat'
  )
    reject();
  const brands = top[0].data;
  if (
    brands.length < 12 ||
    brands.length % 4 ||
    brands.toString('ascii', 0, 4) !== 'avif' ||
    brands.readUInt32BE(4) !== 0
  )
    reject();
  for (let i = 8; i < brands.length; i += 4)
    if (!['avif', 'mif1', 'miaf', 'MA1A', 'MA1B'].includes(brands.toString('ascii', i, i + 4)))
      reject();
  const seen = new Set<string>();
  for (const box of boxes(zeroVersion(top[1].data))) {
    if (seen.has(box.type)) reject();
    seen.add(box.type);
    const p = box.data;
    if (box.type === 'hdlr') {
      const q = zeroVersion(p);
      if (
        q.length !== 21 ||
        q.readUInt32BE(0) !== 0 ||
        q.toString('ascii', 4, 8) !== 'pict' ||
        q.subarray(8).some((byte) => byte !== 0)
      )
        reject();
    } else if (box.type === 'pitm') {
      if (zeroVersion(p).length !== 2) reject();
    } else if (box.type === 'iinf') {
      const q = zeroVersion(p);
      const items = boxes(q.subarray(2));
      if (q.length < 2 || q.readUInt16BE(0) !== items.length) reject();
      for (const item of items)
        if (
          item.type !== 'infe' ||
          item.data.length !== 13 ||
          item.data.readUInt32BE(0) !== 0x02000000 ||
          item.data.readUInt16BE(6) !== 0 ||
          item.data.toString('ascii', 8, 12) !== 'av01' ||
          item.data[12] !== 0
        )
          reject();
    } else if (box.type === 'iloc') {
      const q = zeroVersion(p);
      // 外部data参照と複雑なextentはmetadataの不存在を証明できないため通さない。
      if (q.length < 4 || q[0] !== 0x44 || q[1] !== 0x40 || q.length !== 4 + q.readUInt16BE(2) * 18)
        reject();
      for (let i = 4; i < q.length; i += 18)
        if (q.readUInt16BE(i + 2) !== 0 || q.readUInt16BE(i + 8) !== 1) reject();
    } else if (box.type === 'iprp') {
      const parts = boxes(p);
      if (parts.length !== 2 || parts[0]?.type !== 'ipco' || parts[1]?.type !== 'ipma') reject();
      inspectProperties(parts[0].data);
      const q = zeroVersion(parts[1].data);
      if (q.length < 4) reject();
      let offset = 4;
      for (let n = 0; n < q.readUInt32BE(0); n++) {
        if (offset + 3 > q.length) reject();
        offset += 3 + (q[offset + 2] ?? 0);
      }
      if (offset !== q.length) reject();
    } else if (box.type === 'iref') {
      for (const ref of boxes(zeroVersion(p)))
        if (
          !['auxl', 'dimg'].includes(ref.type) ||
          ref.data.length < 4 ||
          ref.data.length !== 4 + ref.data.readUInt16BE(2) * 2
        )
          reject();
    } else reject();
  }
  for (const required of ['hdlr', 'pitm', 'iloc', 'iinf', 'iprp'])
    if (!seen.has(required)) reject();
  inspectObus(top[2].data);
};

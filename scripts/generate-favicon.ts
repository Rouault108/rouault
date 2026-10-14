import { readFile, writeFile } from 'node:fs/promises';
import sharp from 'sharp';

// 承認済みの SVG を正本とし、固定色の fallback も同じ輪郭から再生成する。
const source = await readFile(new URL('../src/assets/favicon.svg', import.meta.url));
const sizes = [16, 32] as const;
const images = await Promise.all(
  sizes.map((size) => sharp(source, { density: 288 }).resize(size, size).png().toBuffer()),
);

const header = Buffer.alloc(6 + sizes.length * 16);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(sizes.length, 4);
let offset = header.length;
for (const [index, size] of sizes.entries()) {
  const image = images[index];
  if (!image) throw new Error(`Missing favicon image: ${String(size)}`);
  const entry = 6 + index * 16;
  header[entry] = size;
  header[entry + 1] = size;
  header.writeUInt16LE(1, entry + 4);
  header.writeUInt16LE(32, entry + 6);
  header.writeUInt32LE(image.length, entry + 8);
  header.writeUInt32LE(offset, entry + 12);
  offset += image.length;
  await writeFile(new URL(`../src/assets/favicon-${String(size)}.png`, import.meta.url), image);
}
await writeFile(
  new URL('../src/assets/favicon.ico', import.meta.url),
  Buffer.concat([header, ...images]),
);

import { readFileSync } from 'node:fs';
import { mkdtemp, readdir, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { parse, serialize, type DefaultTreeAdapterMap } from 'parse5';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { generateUiCheckCases } from '../../tools/ui-check/codegen-ui-check-cases.js';
import { generatedCaseNames } from '../../tools/ui-check/generated-cases.js';
import {
  renderFooterCase,
  renderNotFoundCase,
  renderReadingInteractionsCase,
  renderVideoCase,
} from '../../tools/ui-check/fixtures/retained-surfaces.js';

type Node = DefaultTreeAdapterMap['node'];
type Element = DefaultTreeAdapterMap['element'];
const elements = (node: Node): Element[] => [
  ...('tagName' in node ? [node] : []),
  ...('childNodes' in node ? node.childNodes.flatMap(elements) : []),
];

describe('UI Check生成fixture', () => {
  let temporaryDirectory: string;
  let outputDirectory: string;
  beforeAll(async () => {
    temporaryDirectory = await mkdtemp(path.join(tmpdir(), 'rouault-ui-check-'));
    outputDirectory = path.join(temporaryDirectory, 'cases');
    await generateUiCheckCases(outputDirectory);
  }, 30_000);
  afterAll(async () => {
    if (temporaryDirectory) await rm(temporaryDirectory, { recursive: true, force: true });
  });

  it('7件だけを生成し、別領域への再生成と一致し、同じ出力は書き換えないこと', async () => {
    const filenames = generatedCaseNames.map((name) => `${name}.html`).sort();
    expect((await readdir(outputDirectory)).sort()).toEqual(filenames);
    const repeatedDirectory = path.join(temporaryDirectory, 'repeated');
    const previousStats = await Promise.all(
      filenames.map((filename) => stat(path.join(outputDirectory, filename))),
    );
    await generateUiCheckCases(repeatedDirectory);
    await generateUiCheckCases(outputDirectory);
    for (const [index, filename] of filenames.entries()) {
      const file = path.join(outputDirectory, filename);
      expect(readFileSync(file, 'utf8')).toBe(
        readFileSync(path.join(repeatedDirectory, filename), 'utf8'),
      );
      expect((await stat(file)).mtimeMs).toBe(previousStats[index]?.mtimeMs);
    }
  }, 30_000);

  for (const [name, render] of [
    ['footer', renderFooterCase],
    ['not-found', renderNotFoundCase],
    ['reading-interactions', renderReadingInteractionsCase],
    ['video', renderVideoCase],
  ] as const) {
    it(`${name}は生成元と同期し、IDとstylesheetの接続を維持すること`, () => {
      const generated = readFileSync(path.join(outputDirectory, `${name}.html`), 'utf8');
      expect(serialize(parse(generated))).toEqual(
        serialize(parse(render().replace(/[ \t]+$/gmu, ''))),
      );
      const nodes = elements(parse(generated));
      const ids = nodes.flatMap((node) =>
        node.attrs.filter((attr) => attr.name === 'id').map((attr) => attr.value),
      );
      expect(new Set(ids).size).toBe(ids.length);
      expect(
        nodes.filter(
          (node) =>
            node.tagName === 'link' &&
            node.attrs.some(
              (attr) => attr.name === 'href' && attr.value === '/src/assets/css/main.css',
            ),
        ),
      ).toHaveLength(1);
    });
  }

  it('static footerのminimal表示はnav/buildを持たず、full表示は導線を持つこと', () => {
    const nodes = elements(parse(renderFooterCase()));
    const minimal = nodes.find((node) =>
      node.attrs.some((attr) => attr.name === 'id' && attr.value === 'footer-minimal'),
    );
    const full = nodes.find((node) =>
      node.attrs.some((attr) => attr.name === 'id' && attr.value === 'footer-full'),
    );
    expect(minimal).toBeDefined();
    expect(full).toBeDefined();
    if (!minimal || !full) throw new Error('footer fixture不足');
    expect(elements(minimal).filter((node) => node.tagName === 'nav')).toHaveLength(0);
    expect(elements(full).filter((node) => node.tagName === 'nav')).toHaveLength(1);
  });

  it('動画fixtureは既存ローカルmediaを参照し、empty表示を残すこと', () => {
    const nodes = elements(parse(renderVideoCase())).filter((node) => node.tagName === 'video');
    expect(nodes.filter((node) => !node.attrs.some((attr) => attr.name === 'src'))).toHaveLength(1);
    for (const node of nodes) {
      for (const attr of node.attrs.filter(
        (attr) => attr.name === 'src' || attr.name === 'poster',
      )) {
        expect(readFileSync(attr.value.slice(1)).length).toBeGreaterThan(0);
      }
    }
  });
});

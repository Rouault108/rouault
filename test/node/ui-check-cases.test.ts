import { readFileSync } from 'node:fs';
import { parse, serialize, type DefaultTreeAdapterMap } from 'parse5';
import { describe, expect, it } from 'vitest';
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
  for (const [name, render] of [
    ['footer', renderFooterCase],
    ['not-found', renderNotFoundCase],
    ['reading-interactions', renderReadingInteractionsCase],
    ['video', renderVideoCase],
  ] as const) {
    it(`${name}は生成元と同期し、IDとstylesheetの接続を維持すること`, () => {
      const generated = readFileSync(`tools/ui-check/cases/${name}.html`, 'utf8');
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
    const nodes = elements(parse(renderVideoCase())).filter((node) => node.tagName === 'ui-video');
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

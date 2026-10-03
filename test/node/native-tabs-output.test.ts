import { describe, expect, it } from 'vitest';
import { toHtml } from 'hast-util-to-html';
import { parseFragment, serialize } from 'parse5';
import { lowerNativeTabs } from '../../build/rehype/native-tabs.js';
import { nativeElement, nativeText } from '../../build/rehype/native-note-hast.js';
import { createStaticRenderIdContext } from '../../shared/static-render-id-context.js';

describe('native Tabs output', () => {
  it('formatting と一意な fragment link を HTML reparse 後も保持する', () => {
    const root = nativeElement('ui-tabs', {}, [
      nativeElement('div', { slot: 'tab', value: 'one' }, [
        nativeText('Text '),
        nativeElement('em', {}, [nativeText('Emphasis')]),
        nativeElement('strong', {}, [nativeText('Strong')]),
        nativeElement('code', {}, [nativeText('code')]),
      ]),
      nativeElement('div', { slot: 'panel' }, [nativeText('本文')]),
    ]);
    lowerNativeTabs(root, createStaticRenderIdContext('test'));
    const html = toHtml(root as Parameters<typeof toHtml>[0]);
    const reparsed = serialize(parseFragment(html));
    expect(reparsed).toBe(html);
    expect(html.match(/<a /gu)).toHaveLength(1);
    expect(html).toContain('<em>Emphasis</em><strong>Strong</strong><code>code</code>');
    expect(html).not.toMatch(/\shidden(?:[\s=>])/u);
    expect(html).not.toContain('role="tab"');
    const ids = [...html.matchAll(/ id="([^"]+)"/gu)].map((match) => match[1]);
    expect(new Set(ids).size).toBe(ids.length);
    expect(html).toContain(`href="#${ids[1]}"`);
  });
  it('defensive assertion は nested link を救済せず失敗する', () => {
    const root = nativeElement('ui-tabs', {}, [
      nativeElement('div', { slot: 'tab', value: 'one' }, [
        nativeElement('a', { href: '/reference' }, [nativeText('Link')]),
      ]),
      nativeElement('div', { slot: 'panel' }, [nativeText('本文')]),
    ]);
    expect(() => lowerNativeTabs(root, createStaticRenderIdContext('test'))).toThrow(
      'interactive descendant',
    );
    expect(root.tagName).toBe('ui-tabs');
    expect(root.children?.[0]?.children?.[0]?.tagName).toBe('a');
  });

  it('同一documentの複数rootでtab/panel IDとfragment対応が衝突しない', () => {
    const ids = createStaticRenderIdContext('multiple roots');
    const roots = ['one', 'two'].map((value) => {
      const root = nativeElement('ui-tabs', {}, [
        nativeElement('div', { slot: 'tab', value }, [nativeText(value)]),
        nativeElement('div', { slot: 'panel' }, [nativeText(`本文 ${value}`)]),
      ]);
      lowerNativeTabs(root, ids);
      return root;
    });
    const html = roots.map((root) => toHtml(root as Parameters<typeof toHtml>[0])).join('');
    expect(serialize(parseFragment(html))).toBe(html);
    const identifiers = [...html.matchAll(/ id="([^"]+)"/gu)].map((match) => match[1]);
    expect(new Set(identifiers).size).toBe(4);
    for (const root of roots) {
      const anchor = root.children?.[0]?.children?.[0];
      const panel = root.children?.[1];
      expect(anchor?.properties?.['href']).toBe(`#${String(panel?.properties?.['id'])}`);
      expect(anchor?.children?.[0]?.value?.length).toBeGreaterThan(0);
    }
  });
});

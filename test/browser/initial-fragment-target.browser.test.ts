import { describe, expect, it } from 'vitest';
import {
  isInitialFragmentTargetRenderable,
  resolveInitialFragmentTarget,
} from '../../src/navigation/initial-fragment-target.js';
import { fixture, requireFixtureValue } from './harness/browser-fixture.js';

const fragmentUrl = (fragment: string | null): string => {
  const current = new URL(document.URL);
  current.hash = '';
  return fragment === null ? current.href : `${current.href}#${fragment}`;
};

describe('managed初回fragmentの解決とrenderable判定', () => {
  it('raw IDをdecoded IDより優先しraw HTML nameもdecoded IDより優先する', async () => {
    const root = await fixture('<main><h2 id="%61">Raw</h2><h2 id="a">Decoded</h2></main>');
    const raw = requireFixtureValue(root.querySelector('[id="%61"]'));
    expect(resolveInitialFragmentTarget(document, root, fragmentUrl('%61'))).toMatchObject({
      kind: 'element',
      element: raw,
    });
    raw.removeAttribute('id');
    const named = document.createElement('a');
    named.setAttribute('name', '%61');
    root.prepend(named);
    expect(resolveInitialFragmentTarget(document, root, fragmentUrl('%61'))).toMatchObject({
      kind: 'element',
      element: named,
    });
  });

  it('IDは先行するnameより優先しroot外の最初のIDを別候補へ読み替えない', async () => {
    const container = await fixture(
      '<div><h2 id="same">Outside</h2><main><a name="same">Name</a><h2 id="same">Inside</h2></main></div>',
    );
    const root = requireFixtureValue(container.querySelector('main'));
    expect(resolveInitialFragmentTarget(document, root, fragmentUrl('same'))).toMatchObject({
      kind: 'outside-root',
      element: container.firstElementChild,
    });
    container.firstElementChild?.remove();
    expect(resolveInitialFragmentTarget(document, root, fragmentUrl('same'))).toMatchObject({
      kind: 'element',
      element: root.querySelector('h2'),
    });
  });

  it('fragmentなしと空fragment、特別なtopと実在するtopを区別する', async () => {
    const root = await fixture(
      '<main><h2 id="top">Real top</h2><a name="TOP">Named top</a></main>',
    );
    expect(resolveInitialFragmentTarget(document, root, fragmentUrl(null))).toEqual({
      kind: 'no-fragment',
    });
    expect(resolveInitialFragmentTarget(document, root, fragmentUrl(''))).toMatchObject({
      kind: 'document-top',
      reason: 'empty-fragment',
    });
    expect(resolveInitialFragmentTarget(document, root, fragmentUrl('top'))).toMatchObject({
      kind: 'element',
      element: root.querySelector('h2'),
    });
    expect(resolveInitialFragmentTarget(document, root, fragmentUrl('TOP'))).toMatchObject({
      kind: 'element',
      element: root.querySelector('a'),
    });
    expect(resolveInitialFragmentTarget(document, root, fragmentUrl('Top'))).toMatchObject({
      kind: 'document-top',
      reason: 'top',
    });
  });

  it('nameだけの空HTML anchorとSVG IDを解決しSVG nameは候補にしない', async () => {
    const root = await fixture(
      '<main><a name="legacy" style="display:block;height:0"></a><svg width="40" height="40"><g id="drawing"><rect width="20" height="20"/></g><a name="svg-name"><rect width="5" height="5"/></a></svg></main>',
    );
    const named = requireFixtureValue(root.querySelector('a'));
    const drawing = requireFixtureValue(root.querySelector('g'));
    expect(resolveInitialFragmentTarget(document, root, fragmentUrl('legacy'))).toMatchObject({
      kind: 'element',
      element: named,
    });
    expect(named.getBoundingClientRect().height).toBe(0);
    expect(isInitialFragmentTargetRenderable(named)).toBe(true);
    expect(resolveInitialFragmentTarget(document, root, fragmentUrl('drawing'))).toMatchObject({
      kind: 'element',
      element: drawing,
    });
    expect(isInitialFragmentTargetRenderable(drawing)).toBe(true);
    expect(resolveInitialFragmentTarget(document, root, fragmentUrl('svg-name'))).toMatchObject({
      kind: 'missing',
    });
  });

  it('部分的に不正なpercentと不正UTF-8を全体rawへ戻さず解決する', async () => {
    const root = await fixture('<main><h2></h2><h3></h3></main>');
    const malformedPercent = requireFixtureValue(root.querySelector('h2'));
    const malformedUtf8 = requireFixtureValue(root.querySelector('h3'));
    malformedPercent.id = 'a%ZZ';
    malformedUtf8.id = '\uFFFD(';
    expect(resolveInitialFragmentTarget(document, root, fragmentUrl('%61%ZZ'))).toMatchObject({
      kind: 'element',
      element: malformedPercent,
    });
    expect(resolveInitialFragmentTarget(document, root, fragmentUrl('%C3%28'))).toMatchObject({
      kind: 'element',
      element: malformedUtf8,
    });
  });

  it.each(['hidden', 'collapse'])(
    'rectが残るvisibility:%sを非表示として扱う',
    async (visibility) => {
      const root = await fixture(
        `<main><h2 style="height:20px;visibility:${visibility}">Hidden</h2><svg width="40" height="40"><rect width="20" height="20" style="visibility:${visibility}"/></svg></main>`,
      );
      for (const target of root.querySelectorAll('h2, rect')) {
        expect(target.getClientRects().length).toBeGreaterThan(0);
        expect(isInitialFragmentTargetRenderable(target)).toBe(false);
      }
    },
  );

  it('取得前・出現・同ID置換・消失をその時点のnode identityで読み直す', async () => {
    const root = await fixture('<main></main>');
    const url = fragmentUrl('late');
    expect(resolveInitialFragmentTarget(document, root, url).kind).toBe('missing');
    const first = document.createElement('h2');
    first.id = 'late';
    first.textContent = 'First';
    root.append(first);
    expect(resolveInitialFragmentTarget(document, root, url)).toMatchObject({
      kind: 'element',
      element: first,
    });
    const replacement = first.cloneNode(true);
    first.replaceWith(replacement);
    expect(resolveInitialFragmentTarget(document, root, url)).toMatchObject({
      kind: 'element',
      element: replacement,
    });
    first.remove();
    root.replaceChildren();
    expect(resolveInitialFragmentTarget(document, root, url).kind).toBe('missing');
    expect(isInitialFragmentTargetRenderable(first)).toBe(false);
  });

  it('異なるdocument URLを現在の本文のfragmentとして解決しない', async () => {
    const root = await fixture('<main><h2 id="target">Target</h2></main>');
    const different = new URL(fragmentUrl('target'));
    different.pathname += '/different-document';
    expect(resolveInitialFragmentTarget(document, root, different.href)).toEqual({
      kind: 'invalid',
      reason: 'different-document',
    });
  });
});

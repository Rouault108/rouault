import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import {
  captureHistoryGeometry,
  isHistoryPresentationVerificationPair,
  matchesHistoryGeometry,
  type HistoryGeometryCheckpoint,
} from '../../src/components/app/controllers/history-presentation-geometry.js';
import type { ReadingPosition } from '../../src/components/app/navigation/reading-position-store.js';
import { fixture } from './harness/browser-fixture.js';

const source = '/notes/testing/reader-basic';
const target = '/notes/testing/toc-readable-long-heading';
const proseId = 'note-content-testing-toc-readable-long-heading';
const originalUrl = location.pathname + location.search + location.hash;
const originalState: unknown = history.state;

const readAddress = (): string => location.pathname + location.search + location.hash;
const settleHistoryQuota = (): Promise<void> =>
  new Promise((resolve) => window.setTimeout(resolve, 10_000));

beforeAll(async () => {
  // WebKitのquotaは同じtop-level sessionの前suiteから引き継ぐ。
  // URL検証に必要な実書込みだけを、quota期間を空けて開始する。
  await settleHistoryQuota();
  history.replaceState(originalState, '', target);
}, 15_000);

afterEach(() => {
  vi.restoreAllMocks();
  if (readAddress() !== target) history.replaceState(originalState, '', target);
});

afterAll(async () => {
  history.replaceState(originalState, '', originalUrl);
  // 次suiteの既存履歴試験がこのsuiteの書込みをquotaとして負担しない。
  await settleHistoryQuota();
}, 15_000);

const setup = async () => {
  const main =
    await fixture<HTMLElement>(`<main id="main-content" style="display:flow-root;width:720px;font-family:serif">
    <section class="note-shell" data-hydration-scope="note-shell" style="display:grid;grid-template-columns:minmax(0,1fr) 240px;gap:32px;align-items:start"><article data-hydration-scope="note-content" style="grid-column:1;min-width:0">
      <header data-article-header><h1>TOC Readable Long Heading</h1></header>
      <div class="prose" id="${proseId}" data-note-static-surface="true"
        data-hydration-key="note-static-surface-enhancer" data-hydration-capability="progressive"
        data-hydration-trigger="post-commit">
        <p>このノートは静的な日本語本文です。</p>
        ${Array.from({ length: 12 }, (_, i) => `<h2 id="heading-${i}" style="margin-top:110px"><span class="heading-text">第${i + 1}章 読書用見出し</span><a data-heading-permalink="true" href="#heading-${i}" style="opacity:0"><svg><path></path></svg></a></h2><p>本文の位置と字体を確認します。</p>`).join('')}
      </div></article>
      <div data-layout-toc-root style="position:sticky;top:64px;align-self:start;height:calc(100vh - 64px);max-height:calc(100vh - 64px);grid-column:2;min-width:0;overflow:hidden">
      ${Array.from({ length: 12 }, (_, i) => `<a href="#heading-${i}" style="font-weight:400;display:block"><span>第${i + 1}章の目次</span></a>`).join('')}
      </div>
      <script type="application/json" data-hydration-marker="toc-source" data-hydration-scope="note-toc">[]</script>
      <layout-toc-controller source-id="toc-source-testing-toc-readable-long-heading"
        toc-runtime-id="toc-source-testing-toc-readable-long-heading"
        toc-owner-id="toc-owner-testing-toc-readable-long-heading"
        capabilities-json='{"activeTracking":true,"dynamicScopes":false,"mobilePanel":true}'
        data-toc-trigger-reserved="true" data-hydration-deferred="toc-trigger"
        data-hydration-scope="note-toc" data-hydration-trigger="initial"
        data-hydration-capability="interactive" content-root-id="${proseId}"></layout-toc-controller>
    </section></main>`);
  await document.fonts.ready;
  const position: ReadingPosition = { version: 1, url: target, x: 0, y: 650 };
  const prose = main.querySelector<HTMLElement>('.prose');
  if (!prose) throw new Error('prose missing');
  return { main, prose, position };
};

const checkpoint = (root: HTMLElement, position: ReadingPosition): HistoryGeometryCheckpoint => {
  const captured = captureHistoryGeometry(root, position, 'verified-layout');
  expect(captured).not.toBeNull();
  if (!captured) throw new Error('checkpoint missing');
  return captured;
};

describe('限定履歴経路の幾何checkpoint', () => {
  it('directed pairのexact URLだけを認める', () => {
    expect(isHistoryPresentationVerificationPair(source, target)).toBe(true);
    expect(isHistoryPresentationVerificationPair(`${source}/`, `${target}/`)).toBe(true);
    for (const [previous, next] of [
      [target, source],
      [source, `${target}#heading-1`],
      [source, `${target}?tab=one`],
      [`${source}#section`, target],
      [`${source}?tab=one`, target],
      [source, `${target}//`],
      ['/notes/other', target],
      [source, '/notes/other'],
    ]) {
      expect(isHistoryPresentationVerificationPair(previous ?? '', next ?? '')).toBe(false);
    }
  });

  it('plain本文の実幾何・本文・実使用font・近傍anchorと保存座標を保持する', async () => {
    const { main, position } = await setup();
    const captured = checkpoint(main, position);
    expect(captured.position).toEqual(position);
    expect(captured.position).not.toBe(position);
    expect(captured.anchorId).toMatch(/^heading-/u);
    expect(captured.anchorY).toBeGreaterThan(0);
    expect(captured.fontFingerprint).toContain('serif');
    expect(captured.text).toContain('静的な日本語本文');
    expect(captured.headingIds).toHaveLength(12);
    expect(matchesHistoryGeometry(main, captured, 'verified-layout')).toBe(true);
    // 復元先は別DOM世代でもよい。要素参照の一致を幾何の一致に代用しない。
    const restored = main.cloneNode(true);
    if (!(restored instanceof HTMLElement)) throw new Error('restored root missing');
    main.replaceWith(restored);
    expect(matchesHistoryGeometry(restored, captured, 'verified-layout')).toBe(true);
  });

  it.each(['table', 'img', 'pre', 'details', 'iframe', 'video', 'unknown-widget'])(
    '%sがある本文は安全未証明として拒否する',
    async (tag) => {
      const { main, prose, position } = await setup();
      prose.append(document.createElement(tag));
      expect(captureHistoryGeometry(main, position, 'verified-layout')).toBeNull();
    },
  );

  it.each(['unknown-hydrator', 'root-hydrator', 'copy-target', 'unreserved-toc', 'unknown-scope'])(
    '%sを許可済み汎用surfaceと同一視しない',
    async (change) => {
      const { main, prose, position } = await setup();
      if (change === 'unknown-hydrator') prose.dataset['hydrationKey'] = 'future-enhancer';
      else if (change === 'root-hydrator') main.dataset['hydrationKey'] = 'future-enhancer';
      else if (change === 'copy-target') prose.setAttribute('data-copy-button', '');
      else if (change === 'unreserved-toc')
        main.querySelector('layout-toc-controller')?.removeAttribute('data-toc-trigger-reserved');
      else prose.setAttribute('data-hydration-scope', 'future-scope');
      expect(captureHistoryGeometry(main, position, 'verified-layout')).toBeNull();
    },
  );

  it('rootの種類・非接続・非表示と対象以外のaddressを拒否する', async () => {
    const { main, position } = await setup();
    const wrong = document.createElement('div');
    wrong.id = 'main-content';
    expect(captureHistoryGeometry(wrong, position, 'verified-layout')).toBeNull();
    main.hidden = true;
    expect(captureHistoryGeometry(main, position, 'verified-layout')).toBeNull();
    main.hidden = false;
    main.style.visibility = 'hidden';
    expect(captureHistoryGeometry(main, position, 'verified-layout')).toBeNull();
    main.style.visibility = 'visible';
    const parent = main.parentElement;
    if (!parent) throw new Error('parent missing');
    parent.style.opacity = '0';
    expect(captureHistoryGeometry(main, position, 'verified-layout')).toBeNull();
    parent.style.opacity = '1';
    history.replaceState(originalState, '', `${target}#heading-1`);
    expect(captureHistoryGeometry(main, position, 'verified-layout')).toBeNull();
    history.replaceState(originalState, '', target);
    main.remove();
    expect(captureHistoryGeometry(main, position, 'verified-layout')).toBeNull();
  });

  it('scopeはtrailing slashを許可し保存URLと実addressのexact一致は維持する', async () => {
    const { main, position } = await setup();
    history.replaceState(originalState, '', `${target}/`);
    expect(captureHistoryGeometry(main, position, 'verified-layout')).toBeNull();
    const exact = { ...position, url: `${target}/` };
    const captured = checkpoint(main, exact);
    expect(captured.position.url).toBe(`${target}/`);
    expect(matchesHistoryGeometry(main, captured, 'verified-layout')).toBe(true);
    history.replaceState(originalState, '', target);
    expect(matchesHistoryGeometry(main, captured, 'verified-layout')).toBe(false);
  });

  it('一時的なrange不足へのclampをreadyとして保存しない', async () => {
    const { main, position } = await setup();
    expect(captureHistoryGeometry(main, { ...position, y: 100_000 }, 'verified-layout')).toBeNull();
    expect(captureHistoryGeometry(main, { ...position, x: 100_000 }, 'verified-layout')).toBeNull();
    expect(captureHistoryGeometry(main, { ...position, y: NaN }, 'verified-layout')).toBeNull();
    expect(
      captureHistoryGeometry(main, { ...position, url: source }, 'verified-layout'),
    ).toBeNull();
  });

  it.each(['shell', 'text', 'main-width', 'anchor', 'font', 'range', 'viewport'])(
    '%s変更後は以前のcheckpointを適用しない',
    async (change) => {
      const { main, prose, position } = await setup();
      const captured = checkpoint(main, position);
      let layout = 'verified-layout';
      if (change === 'shell') layout = 'changed-layout';
      else if (change === 'text') prose.querySelector('p')?.append('追記');
      else if (change === 'main-width') main.style.width = '680px';
      else if (change === 'anchor') {
        const anchor = main.querySelector<HTMLElement>(`#${captured.anchorId}`);
        if (!anchor) throw new Error('anchor missing');
        anchor.style.paddingTop = '12px';
      } else if (change === 'font') prose.style.fontFamily = 'monospace';
      else if (change === 'viewport')
        vi.spyOn(window, 'devicePixelRatio', 'get').mockReturnValue(window.devicePixelRatio + 0.5);
      else main.style.paddingBottom = '25px';
      expect(matchesHistoryGeometry(main, captured, layout)).toBe(false);
    },
  );

  it('既知reserved TOCのactivation完了状態は同runtime headerとの整合時だけ許可する', async () => {
    const { main, position } = await setup();
    await import('../../src/components/layout/layout-toc-controller.js');
    const header = await fixture(`<header data-layout-header><a data-toc-trigger="true"
      data-toc-runtime-id="toc-source-testing-toc-readable-long-heading"
      data-toc-hydration-state="hydrated" data-toc-trigger-interactive="true"></a></header>`);
    const controller = main.querySelector('layout-toc-controller');
    const trigger = header.querySelector('a');
    if (!controller || !trigger) throw new Error('TOC fixture missing');
    controller.removeAttribute('data-toc-trigger-reserved');
    const captured = checkpoint(main, position);
    expect(matchesHistoryGeometry(main, captured, 'verified-layout')).toBe(true);
    trigger.setAttribute('data-toc-hydration-state', 'hydrating');
    expect(matchesHistoryGeometry(main, captured, 'verified-layout')).toBe(false);
    trigger.setAttribute('data-toc-hydration-state', 'hydrated');
    controller.setAttribute(
      'capabilities-json',
      '{"activeTracking":true,"dynamicScopes":true,"mobilePanel":true}',
    );
    expect(matchesHistoryGeometry(main, captured, 'verified-layout')).toBe(false);
  });

  it('独立TOCのactive font差分は許可し実使用textと400/500のloadは確認する', async () => {
    const { main, position } = await setup();
    const captured = checkpoint(main, position);
    const links = main.querySelectorAll<HTMLElement>('[data-layout-toc-root] a');
    for (const link of links) {
      link.style.fontWeight = '500';
      expect(matchesHistoryGeometry(main, captured, 'verified-layout')).toBe(true);
      link.style.fontWeight = '400';
    }
    const check = vi
      .spyOn(document.fonts, 'check')
      .mockImplementation((font, text) => !(font.includes(' 500 ') && text?.includes('目次')));
    expect(matchesHistoryGeometry(main, captured, 'verified-layout')).toBe(false);
    expect(
      check.mock.calls.some(([font, text]) => font.includes(' 500 ') && text?.includes('目次')),
    ).toBe(true);
  });

  it.each(['track', 'position', 'height', 'overflow'])(
    'TOCの%s制約が崩れた場合はfont差分を安全扱いしない',
    async (constraint) => {
      const { main, position } = await setup();
      const captured = checkpoint(main, position);
      const toc = main.querySelector<HTMLElement>('[data-layout-toc-root]');
      const shell = main.querySelector<HTMLElement>('.note-shell');
      if (!toc || !shell) throw new Error('toc shell missing');
      if (constraint === 'track') shell.style.gridTemplateColumns = 'minmax(0,1fr) 250px';
      else if (constraint === 'position') toc.style.position = 'static';
      else if (constraint === 'height') toc.style.height = 'auto';
      else toc.style.overflow = 'visible';
      expect(matchesHistoryGeometry(main, captured, 'verified-layout')).toBe(false);
    },
  );

  it('font未確定・check失敗・API例外はいずれも演出不可に縮退する', async () => {
    const { main, position } = await setup();
    const captured = checkpoint(main, position);
    const status = vi.spyOn(document.fonts, 'status', 'get').mockReturnValue('loading');
    expect(captureHistoryGeometry(main, position, 'verified-layout')).toBeNull();
    expect(matchesHistoryGeometry(main, captured, 'verified-layout')).toBe(false);
    status.mockRestore();
    const check = vi.spyOn(document.fonts, 'check').mockReturnValue(false);
    expect(captureHistoryGeometry(main, position, 'verified-layout')).toBeNull();
    check.mockImplementation(() => {
      throw new Error('font check unavailable');
    });
    expect(captureHistoryGeometry(main, position, 'verified-layout')).toBeNull();
  });

  it('測定だけでscrollやfocusを書き込まない', async () => {
    const { main, position } = await setup();
    const scroll = vi.spyOn(window, 'scrollTo');
    const focus = vi.spyOn(main, 'focus');
    const captured = checkpoint(main, position);
    expect(matchesHistoryGeometry(main, captured, 'verified-layout')).toBe(true);
    expect(scroll).not.toHaveBeenCalled();
    expect(focus).not.toHaveBeenCalled();
  });
});

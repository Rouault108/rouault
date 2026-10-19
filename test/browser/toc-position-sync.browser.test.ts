import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { fixture } from './harness/browser-fixture.js';
import { syncTocAtReadingPosition } from '../../src/toc/sync-toc-at-reading-position.js';
import { independentTocTrack } from '../../src/toc/toc-track-independence.js';
import {
  adoptContentBinding,
  beginContentMutation,
  beginNavigationIntent,
  initializeContentContext,
  releaseContentContext,
} from '../../src/navigation/content-navigation-context.js';
import {
  readAddress,
  readHistoryEntry,
  writeHistoryEntry,
} from '../../src/navigation/history-entry.js';
import { readCurrentShellCommitId } from '../../src/components/app/shell/app-shell-lifecycle.js';
import type { AcceptedReadingPosition } from '../../src/components/app/controllers/reading-position-controller.js';

const originalState: unknown = history.state;
const originalUrl = readAddress();
let baselineState: unknown;
let root: HTMLElement | null = null;

beforeAll(() => {
  // 同一entryでreceiptの所有権を検証し、各caseで不要な履歴書込を増やさない。
  writeHistoryEntry({ mode: 'replace', owner: 'router', url: originalUrl, state: {} });
  baselineState = history.state;
});
afterAll(() => history.replaceState(originalState, '', originalUrl));
afterEach(() => {
  vi.restoreAllMocks();
  releaseContentContext(root);
  root = null;
  // stateが複製されても、参照差だけで無変更の履歴を書き戻さない。
  if (
    readAddress() !== originalUrl ||
    JSON.stringify(history.state) !== JSON.stringify(baselineState)
  )
    history.replaceState(baselineState, '', originalUrl);
  window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
});

const headings = [
  { id: 'sync-one', text: '最初の見出し', level: 2 },
  { id: 'sync-two', text: '途中の見出し', level: 2 },
  { id: 'sync-three', text: '最後の見出し', level: 2 },
];

const setup = async (empty = false): Promise<AcceptedReadingPosition> => {
  const source = empty ? [] : headings;
  root = await fixture(`<main id="main-content" style="display:flow-root">
    <div class="note-shell" style="display:grid;grid-template-columns:minmax(0,1fr) 240px;--note-toc-track:240px">
      <article style="height:5000px;min-width:0">
        ${source.map((heading, index) => `<h2 id="${heading.id}" style="margin:0;position:relative;top:${index * 1200}px">${heading.text}</h2>`).join('')}
      </article>
      <aside data-layout-toc-root data-hydration-owner-id="sync-owner"
        style="position:sticky;top:0;grid-column:2;align-self:start;min-inline-size:0;overflow:hidden;block-size:600px;max-block-size:600px">
        <nav data-layout-toc-nav>${source.map((heading, index) => `<div class="layout-toc__item" data-heading-id="${heading.id}"><a href="#${heading.id}" data-toc-link data-heading-id="${heading.id}"${index === 0 ? ' aria-current="location" data-active="true" class="is-active"' : ''}>${heading.text}</a></div>`).join('')}</nav>
        <layout-toc-controller source-id="sync-source" toc-owner-id="sync-owner"
          content-root-id="main-content" toc-runtime-id="sync-source"
          capabilities-json='{"activeTracking":true}'></layout-toc-controller>
        <script id="sync-source" type="application/json" data-toc-owner-id="sync-owner"
          data-hydration-owner-id="sync-owner" data-hydration-scope="main-content"
          data-hydration-marker="toc-source">${JSON.stringify(source)}</script>
      </aside>
    </div>
  </main>`);
  const contentEpoch = initializeContentContext(root);
  const intent = beginNavigationIntent('traverse', readAddress());
  const receipt = Object.freeze({
    commitId: 1,
    intentId: intent.intentId,
    entryId: readHistoryEntry()?.id ?? null,
    url: readAddress(),
    contentEpoch,
    root,
    shellCommitId: readCurrentShellCommitId(),
    stateOnly: false,
    commitTiming: 'synchronous' as const,
  });
  window.scrollTo({ top: 1300, left: 0, behavior: 'instant' });
  expect(independentTocTrack(root)).toBe(true);
  return { root, intent, receipt };
};

const links = (position: AcceptedReadingPosition): HTMLAnchorElement[] =>
  Array.from(position.root.querySelectorAll<HTMLAnchorElement>('[data-toc-link]'));

const active = (position: AcceptedReadingPosition): string[] =>
  links(position)
    .filter((link) => link.getAttribute('aria-current') === 'location')
    .map((link) => link.dataset['headingId'] ?? '');

const attributes = (nav: Element | null): unknown =>
  nav
    ? [nav, ...nav.querySelectorAll('*')].map((element) =>
        Array.from(element.attributes, (attribute) => [attribute.name, attribute.value]).sort(
          ([first = ''], [second = '']) => first.localeCompare(second),
        ),
      )
    : null;

const failSecondWrite = (position: AcceptedReadingPosition): void => {
  const link = links(position)[1];
  if (!link) throw new Error('second link');
  const setAttribute = link.setAttribute.bind(link);
  vi.spyOn(link, 'setAttribute').mockImplementation((name, value) => {
    if (name === 'data-active' && value === 'true') throw new Error('partial apply');
    setAttribute(name, value);
  });
};

describe('accepted reading position の TOC transaction 境界', () => {
  it.each(['navigation', 'traverse'] as const)(
    '%s intentのentryはpush前のsourceを保持し、受理receiptの所有権と区別する',
    async (cause) => {
      const previous = await setup();
      const sourceEntryId = readHistoryEntry()?.id;
      const targetUrl = '/notes/toc-position-sync-target';
      const intent = beginNavigationIntent(cause, targetUrl);
      const contentEpoch = beginContentMutation(previous.root);
      writeHistoryEntry({ mode: 'push', owner: 'router', url: targetUrl });
      adoptContentBinding(targetUrl);
      const currentEntryId = readHistoryEntry()?.id;
      expect(intent.target.entryId).toBe(sourceEntryId);
      expect(currentEntryId).not.toBe(sourceEntryId);
      const receipt = Object.freeze({
        commitId: 2,
        intentId: intent.intentId,
        entryId: currentEntryId ?? null,
        url: targetUrl,
        contentEpoch,
        root: previous.root,
        shellCommitId: readCurrentShellCommitId(),
        stateOnly: false,
        commitTiming: 'synchronous' as const,
      });
      const position = { root: previous.root, intent, receipt };
      expect(syncTocAtReadingPosition(position)).toBe(
        cause === 'navigation' ? 'accepted' : 'superseded',
      );
      expect(syncTocAtReadingPosition({ ...position, receipt: previous.receipt })).toBe(
        'superseded',
      );
      expect(
        syncTocAtReadingPosition({
          ...position,
          receipt: Object.freeze({ ...receipt, entryId: sourceEntryId ?? null }),
        }),
      ).toBe('superseded');
    },
  );

  it('実際の独立trackで現在位置を同期し、座標を変えず三つのcurrent属性を揃える', async () => {
    const position = await setup();
    const y = scrollY;
    expect(syncTocAtReadingPosition(position)).toBe('accepted');
    expect(active(position)).toEqual(['sync-two']);
    for (const link of links(position)) {
      const current = link.dataset['headingId'] === 'sync-two';
      expect(link.getAttribute('data-active')).toBe(current ? 'true' : null);
      expect(link.classList.contains('is-active')).toBe(current);
    }
    expect(scrollY).toBe(y);
  });

  it('有効な空sourceを受理する', async () => {
    const position = await setup(true);
    expect(syncTocAtReadingPosition(position)).toBe('accepted');
    expect(active(position)).toEqual([]);
  });

  it.each(['{', '{}', '[{"id":"bad"}]', ''])(
    '壊れたsource %s は書込前に拒否する',
    async (source) => {
      const position = await setup();
      const script = position.root.querySelector('script');
      if (!script) throw new Error('source');
      script.text = source;
      const nav = position.root.querySelector('[data-layout-toc-nav]');
      const before = nav?.outerHTML;
      expect(syncTocAtReadingPosition(position)).toBe('rejected-before');
      expect(nav?.outerHTML).toBe(before);
    },
  );

  it.each(['heading', 'source'] as const)('重複%s IDは書込前に拒否する', async (kind) => {
    const position = await setup();
    const element = position.root.querySelector(kind === 'source' ? 'script' : 'h2');
    if (!element) throw new Error('duplicate target');
    position.root.append(element.cloneNode(true));
    expect(syncTocAtReadingPosition(position)).toBe('rejected-before');
    expect(active(position)).toEqual(['sync-one']);
  });

  it.each(['static', 'intrinsic-track'] as const)('%s skipでも受理済みXYを保つ', async (kind) => {
    const position = await setup();
    if (kind === 'static')
      position.root
        .querySelector('[data-layout-toc-root]')
        ?.setAttribute('data-toc-hydration', 'static');
    else
      position.root
        .querySelector<HTMLElement>('.note-shell')
        ?.style.setProperty('--note-toc-track', 'auto');
    const y = scrollY;
    expect(syncTocAtReadingPosition(position)).toBe('skipped');
    expect(scrollY).toBe(y);
    expect(active(position)).toEqual(['sync-one']);
  });

  it('複数linkの途中write例外を隔離し、書いた属性を一回巻き戻す', async () => {
    const position = await setup();
    const nav = position.root.querySelector('[data-layout-toc-nav]');
    const before = attributes(nav);
    failSecondWrite(position);
    expect(syncTocAtReadingPosition(position)).toBe('rejected-after');
    expect(attributes(nav)).toEqual(before);
  });

  it('verify例外を隔離して巻き戻す', async () => {
    const position = await setup();
    const heading = position.root.querySelector('h2');
    if (!heading) throw new Error('heading');
    const rect = heading.getBoundingClientRect.bind(heading);
    let reads = 0;
    vi.spyOn(heading, 'getBoundingClientRect').mockImplementation(() => {
      if (++reads === 2) throw new Error('verify');
      return rect();
    });
    expect(syncTocAtReadingPosition(position)).toBe('rejected-after');
    expect(active(position)).toEqual(['sync-one']);
  });

  it.each(['adjacent-rect', 'activation-offset', 'range', 'xy'] as const)(
    '%s がwrite後に変化したら同じactive候補でも拒否する',
    async (change) => {
      const position = await setup();
      const nav = position.root.querySelector<HTMLElement>('[data-layout-toc-nav]');
      const adjacent = position.root.querySelector<HTMLElement>('#sync-three');
      const article = position.root.querySelector('article');
      if (!nav || !adjacent || !article) throw new Error('geometry fixture');
      const write = nav.setAttribute.bind(nav);
      vi.spyOn(nav, 'setAttribute').mockImplementation((name, value) => {
        write(name, value);
        if (name !== 'data-density-tier') return;
        if (change === 'adjacent-rect') adjacent.style.top = '2500px';
        if (change === 'activation-offset') adjacent.style.scrollMarginTop = '10px';
        if (change === 'range') article.style.height = '5500px';
        if (change === 'xy') window.scrollTo({ top: 1350, behavior: 'instant' });
      });
      expect(syncTocAtReadingPosition(position)).toBe('rejected-after');
      expect(active(position)).toEqual(['sync-one']);
    },
  );

  it('activeTracking=falseはviewportの途中候補へ移動しない', async () => {
    const position = await setup();
    position.root
      .querySelector('layout-toc-controller')
      ?.setAttribute('capabilities-json', '{"activeTracking":false}');
    expect(syncTocAtReadingPosition(position)).toBe('accepted');
    expect(active(position)).toEqual(['sync-one']);
  });

  it('rollback例外があっても後続属性のrollbackを続け、Readingへ伝播しない', async () => {
    const position = await setup();
    failSecondWrite(position);
    const first = links(position)[0];
    if (!first) throw new Error('first link');
    const write = first.setAttribute.bind(first);
    vi.spyOn(first, 'setAttribute').mockImplementation((name, value) => {
      if (name === 'aria-current') throw new Error('rollback');
      write(name, value);
    });
    expect(syncTocAtReadingPosition(position)).toBe('rejected-after');
    expect(first.dataset['active']).toBe('true');
    expect(first.classList.contains('is-active')).toBe(true);
    expect(links(position)[1]?.hasAttribute('aria-current')).toBe(false);
  });

  it('rollbackでXYが変わっても成功にせず、Readingの位置照合へ返す', async () => {
    const position = await setup();
    failSecondWrite(position);
    const first = links(position)[0];
    if (!first) throw new Error('first link');
    const write = first.setAttribute.bind(first);
    vi.spyOn(first, 'setAttribute').mockImplementation((name, value) => {
      write(name, value);
      if (name === 'aria-current') window.scrollTo({ top: 1600, behavior: 'instant' });
    });
    expect(syncTocAtReadingPosition(position)).toBe('rejected-after');
    expect(scrollY).toBe(1600);
    expect(active(position)).toEqual(['sync-one']);
    expect(Object.isFrozen(position.receipt)).toBe(true);
  });

  it('後続ownerへ交代した後はその属性を巻き戻さない', async () => {
    const position = await setup();
    const nav = position.root.querySelector<HTMLElement>('[data-layout-toc-nav]');
    const first = links(position)[0];
    if (!nav || !first) throw new Error('nav');
    const write = nav.setAttribute.bind(nav);
    vi.spyOn(nav, 'setAttribute').mockImplementation((name, value) => {
      write(name, value);
      if (name === 'data-density-tier') {
        beginNavigationIntent('navigation', readAddress());
        first.setAttribute('data-active', 'later-owner');
      }
    });
    expect(syncTocAtReadingPosition(position)).toBe('superseded');
    expect(first.dataset['active']).toBe('later-owner');
  });

  it.each(['toc-owner', 'source-identity', 'nav-child'] as const)(
    '途中writeで%sが交代したら後続ownerの変更を保存する',
    async (change) => {
      const position = await setup();
      const second = links(position)[1];
      const nav = position.root.querySelector('[data-layout-toc-nav]');
      const toc = position.root.querySelector('[data-layout-toc-root]');
      const source = position.root.querySelector('script');
      if (!second || !nav || !toc || !source) throw new Error('owner fixture');
      const replacement = document.createElement('span');
      replacement.textContent = '後続処理の要素';
      const write = second.setAttribute.bind(second);
      vi.spyOn(second, 'setAttribute').mockImplementation((name, value) => {
        write(name, value);
        if (name !== 'data-active') return;
        if (change === 'toc-owner') toc.setAttribute('data-hydration-owner-id', 'later-owner');
        if (change === 'source-identity') source.setAttribute('data-toc-owner-id', 'later-owner');
        if (change === 'nav-child') nav.append(replacement);
      });
      expect(syncTocAtReadingPosition(position)).toBe('superseded');
      if (change === 'toc-owner')
        expect(toc.getAttribute('data-hydration-owner-id')).toBe('later-owner');
      if (change === 'source-identity')
        expect(source.getAttribute('data-toc-owner-id')).toBe('later-owner');
      if (change === 'nav-child') expect(nav.contains(replacement)).toBe(true);
    },
  );

  it('rollbackは別処理が追加したclass tokenと未書込属性に触れない', async () => {
    const position = await setup();
    const [first, second, third] = links(position);
    if (!first || !second || !third) throw new Error('links');
    const write = second.setAttribute.bind(second);
    vi.spyOn(second, 'setAttribute').mockImplementation((name, value) => {
      if (name === 'data-active') {
        first.classList.add('later-decoration');
        third.setAttribute('data-active', 'later-value');
        throw new Error('partial apply');
      }
      write(name, value);
    });
    expect(syncTocAtReadingPosition(position)).toBe('rejected-after');
    expect(first.classList.contains('is-active')).toBe(true);
    expect(first.classList.contains('later-decoration')).toBe(true);
    expect(third.dataset['active']).toBe('later-value');
  });
});

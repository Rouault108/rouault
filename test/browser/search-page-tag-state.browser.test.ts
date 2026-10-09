import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';

import type { ExploreSearchResponse } from '../../shared/search/search-types.js';

import {
  appendSiteUrlContextMeta,
  createSearchPageTestContext,
  deferredTagRuntime,
  expectElement,
  renderSearchPageFixture,
  renderTagOrderFixture,
  staticResponse,
  tagInput,
  tagSequence,
} from './helpers/search-page-test-fixture.js';

const { cleanupSearchPageTest, enhanceWithRuntime } = createSearchPageTestContext();

describe('search-page tag state', () => {
  beforeEach(() => {
    document.head.replaceChildren();
    appendSiteUrlContextMeta();
  });

  afterEach(() => {
    cleanupSearchPageTest();
  });

  it('production tag list は select / deselect / tagMode の即時同期と応答後にも sequence・node・focus・scroll を保つこと', async () => {
    const response: ExploreSearchResponse = {
      ...staticResponse,
      allTagCounts: { music: 4, architecture: 3, security: 1 },
      tagCounts: { music: 4, architecture: 3, security: 1 },
    };
    const root = await renderTagOrderFixture(response);
    const runtime = deferredTagRuntime();
    const controller = enhanceWithRuntime(root, undefined, runtime.core);
    await expect
      .poll(
        () =>
          root.querySelector<HTMLElement>('[data-search-page-root]')?.dataset[
            'searchPageCapability'
          ],
      )
      .toBe('ready');
    const expected = ['music', 'architecture', 'security'];
    expect(tagSequence(root)).toEqual(expected);
    const architecture = tagInput(root, 'architecture');
    const security = tagInput(root, 'security');
    const list = expectElement(
      root.querySelector<HTMLElement>('[data-search-filter-list]'),
      'list',
    );
    list.style.cssText = 'height: 60px; overflow-y: auto';
    for (const row of root.querySelectorAll<HTMLElement>('[data-filter-option]'))
      row.style.minHeight = '60px';
    await userEvent.click(expectElement(architecture.closest('label'), 'native label'));
    expect(architecture.checked).toBe(true);
    expect(document.activeElement).toBe(architecture);
    expect(tagSequence(root)).toEqual(expected);
    list.scrollTop = 40;
    await runtime.finish(root, {
      ...response,
      tagCounts: { music: 0, architecture: 2, security: 1 },
    });
    expect(tagSequence(root)).toEqual(expected);
    expect(tagInput(root, 'architecture')).toBe(architecture);
    expect(document.activeElement).toBe(architecture);
    expect(list.scrollTop).toBe(40);
    expect(
      root.querySelector('[data-filter-tag="architecture"]')?.getAttribute('data-selected'),
    ).toBe('true');
    await userEvent.keyboard(' ');
    expect(architecture.checked).toBe(false);
    expect(document.activeElement).toBe(architecture);
    expect(tagSequence(root)).toEqual(expected);
    await runtime.finish(root, response);
    expect(document.activeElement).toBe(architecture);
    await userEvent.tab();
    expect(document.activeElement).toBe(security);
    await userEvent.tab({ shift: true });
    expect(document.activeElement).toBe(architecture);
    await userEvent.click(
      expectElement(
        root.querySelector('[data-search-choice-menu="tag-mode"] summary'),
        'mode trigger',
      ),
    );
    await userEvent.click(
      expectElement(
        root.querySelector('[data-search-choice-menu="tag-mode"] [data-value="and"]'),
        'and',
      ),
    );
    expect(tagSequence(root)).toEqual(expected);
    await runtime.finish(root, response);
    expect(tagSequence(root)).toEqual(expected);
    expect(new URL(location.href).searchParams.get('tagMode')).toBe('and');
    controller?.dispose();
  });

  it('SSR と runtime は同じ identity・固定順を保ちOR候補件数はQを使うこと', async () => {
    const response: ExploreSearchResponse = {
      ...staticResponse,
      allTagCounts: {
        music: 4,
        architecture: 3,
        security: 1,
        é: 1,
        'e\u0301': 1,
        建築: 1,
        音楽: 1,
        Ａ: 1,
        A: 1,
      },
      tagCounts: { architecture: 2, music: 0 },
    };
    const root = await renderTagOrderFixture(response, ['security', 'absent']);
    const expected = [
      'music',
      'architecture',
      'A',
      'Ａ',
      'e\u0301',
      'é',
      'security',
      '音楽',
      '建築',
      'absent',
    ];
    expect(tagSequence(root)).toEqual(expected);
    const runtime = deferredTagRuntime();
    const controller = enhanceWithRuntime(root, undefined, runtime.core);
    expect(tagSequence(root)).toEqual(expected);
    expect(root.querySelector('[data-filter-tag="music"] .filter-option-count')?.textContent).toBe(
      '4件',
    );
    expect(tagInput(root, 'music').disabled).toBe(false);
    expect(tagInput(root, 'security').disabled).toBe(false);
    expect(tagInput(root, 'absent').disabled).toBe(false);
    await userEvent.click(
      expectElement(tagInput(root, 'security').closest('label'), 'selected zero label'),
    );
    expect(tagInput(root, 'security').checked).toBe(false);
    expect(tagInput(root, 'security').disabled).toBe(false);
    await runtime.finish(root, response);
    expect(tagSequence(root)).toEqual(expected);
    await userEvent.click(
      expectElement(
        root.querySelector('[data-search-selected-tag-remove="absent"]'),
        'absent chip',
      ),
    );
    expect(tagSequence(root)).toEqual(expected.filter((tag) => tag !== 'absent'));
    await runtime.finish(root, response);
    expect(tagSequence(root)).toEqual(expected.filter((tag) => tag !== 'absent'));
    controller?.dispose();
  });

  it('OR/AND 切替で候補件数の集合だけを切り替え、選択済み0件は解除可能に保つこと', async () => {
    const response: ExploreSearchResponse = {
      ...staticResponse,
      allTagCounts: { architecture: 9, music: 4, selectedZero: 0 },
      tagCounts: { architecture: 2, music: 0, selectedZero: 0 },
    };
    const root = await renderTagOrderFixture(response, ['selectedZero']);
    const runtime = deferredTagRuntime();
    const controller = enhanceWithRuntime(root, undefined, runtime.core);
    const sequence = tagSequence(root);
    const status = (tag: string) =>
      root.querySelector(`[data-filter-tag="${tag}"] .filter-option-count`)?.textContent;
    const state = (tag: string) =>
      root.querySelector<HTMLElement>(`[data-filter-tag="${tag}"]`)?.dataset['state'];

    expect(status('architecture')).toBe('9件');
    expect(status('music')).toBe('4件');
    expect(status('selectedZero')).toBe('0件・選択中');
    expect(tagInput(root, 'selectedZero').disabled).toBe(false);
    expect(state('selectedZero')).toBe('selected');
    expect(root.querySelector('[data-search-tag-mode-description]')?.textContent).toContain(
      '増加件数ではありません',
    );

    await userEvent.click(
      expectElement(
        root.querySelector('[data-search-choice-menu="tag-mode"] summary'),
        'mode trigger',
      ),
    );
    await userEvent.click(
      expectElement(
        root.querySelector('[data-search-choice-menu="tag-mode"] [data-value="and"]'),
        'and',
      ),
    );
    expect(status('architecture')).toBe('件数を計算中');
    expect(status('music')).toBe('件数を計算中');
    expect(tagInput(root, 'music').disabled).toBe(false);
    expect(state('music')).toBe('pending');
    expect(status('selectedZero')).toBe('選択中・件数を計算中');
    expect(tagInput(root, 'selectedZero').disabled).toBe(false);
    expect(root.querySelector('[data-search-filter-list]')?.getAttribute('aria-busy')).toBe('true');
    await runtime.finish(root, response);
    expect(status('architecture')).toBe('2件');
    expect(status('music')).toBe('0件・選択不可');
    expect(tagInput(root, 'music').disabled).toBe(true);
    expect(state('music')).toBe('disabled');
    expect(status('selectedZero')).toBe('0件・選択中');
    expect(tagInput(root, 'selectedZero').disabled).toBe(false);
    expect(tagSequence(root)).toEqual(sequence);
    expect(root.querySelector('[data-search-tag-mode-description]')?.textContent).toContain(
      '追加した後の結果件数',
    );

    history.back();
    await expect
      .poll(() => root.querySelector<HTMLInputElement>('[data-search-tag-mode-value]')?.value)
      .toBe('or');
    expect(status('music')).toBe('件数を計算中');
    await runtime.finish(root, response);
    expect(status('music')).toBe('4件');
    expect(root.querySelector('[data-search-tag-mode-description]')?.textContent).toContain(
      '増加件数ではありません',
    );
    history.forward();
    await expect
      .poll(() => root.querySelector<HTMLInputElement>('[data-search-tag-mode-value]')?.value)
      .toBe('and');
    expect(status('music')).toBe('件数を計算中');
    await runtime.finish(root, response);
    expect(status('music')).toBe('0件・選択不可');

    await userEvent.click(
      expectElement(
        root.querySelector('[data-search-selected-tag-remove="selectedZero"]'),
        'selected zero remove',
      ),
    );
    expect(tagInput(root, 'selectedZero').checked).toBe(false);
    expect(tagInput(root, 'selectedZero').disabled).toBe(false);
    expect(status('selectedZero')).toBe('件数を計算中');
    await runtime.finish(root, response);
    expect(status('selectedZero')).toBe('0件・選択不可');
    controller?.dispose();
  });

  it('必要な row 再構成だけ残存する可視 enabled checkbox の focus を保持し外部 focus を奪わないこと', async () => {
    const response: ExploreSearchResponse = {
      ...staticResponse,
      allTagCounts: { music: 4, architecture: 3, security: 1 },
      tagCounts: { music: 4, architecture: 3, security: 1 },
    };
    const root = await renderTagOrderFixture(response);
    const runtime = deferredTagRuntime();
    const controller = enhanceWithRuntime(root, undefined, runtime.core);
    const architecture = tagInput(root, 'architecture');
    await userEvent.click(expectElement(architecture.closest('label'), 'label'));
    await runtime.finish(root, {
      ...response,
      allTagCounts: { security: 8, architecture: 3, music: 1, added: 1 },
    });
    expect(tagSequence(root)).toEqual(['security', 'architecture', 'added', 'music']);
    expect(tagInput(root, 'architecture')).toBe(architecture);
    expect(document.activeElement).toBe(architecture);
    await userEvent.keyboard(' ');
    await runtime.finish(root, {
      ...response,
      tagCounts: { music: 1, architecture: 0, security: 1 },
      allTagCounts: { music: 4, architecture: 0, security: 1 },
    });
    expect(architecture.disabled).toBe(true);
    expect(document.activeElement).not.toBe(architecture);
    const query = expectElement(
      root.querySelector<HTMLInputElement>('[data-search-query-input]'),
      'query',
    );
    await userEvent.click(
      expectElement(tagInput(root, 'security').closest('label'), 'security label'),
    );
    query.focus();
    await runtime.finish(root, {
      ...response,
      allTagCounts: { music: 9, architecture: 3, security: 1 },
    });
    expect(document.activeElement).toBe(query);
    controller?.dispose();
  });

  it('local filter の substring・hidden subset・visible count と応答時の行同期を維持すること', async () => {
    const response: ExploreSearchResponse = {
      ...staticResponse,
      allTagCounts: { music: 4, architecture: 3, security: 1 },
      tagCounts: { music: 4, architecture: 3, security: 1 },
    };
    const root = await renderTagOrderFixture(response);
    const runtime = deferredTagRuntime();
    const controller = enhanceWithRuntime(root, undefined, runtime.core);
    await userEvent.click(
      expectElement(tagInput(root, 'architecture').closest('label'), 'architecture label'),
    );
    const filter = expectElement(
      root.querySelector<HTMLInputElement>('[data-search-filter-input]'),
      'local filter',
    );
    await userEvent.fill(filter, 'MUS');
    expect(tagSequence(root)).toEqual(['music', 'architecture', 'security']);
    expect(
      [...root.querySelectorAll<HTMLElement>('[data-filter-option]')]
        .filter((row) => !row.hidden)
        .map((row) => row.dataset['filterTag']),
    ).toEqual(['music']);
    expect(root.querySelector('[data-filter-visible-count]')?.textContent).toBe('1 / 3タグ');
    tagInput(root, 'music').focus();
    await runtime.finish(root, {
      ...response,
      allTagCounts: { architecture: 8, music: 4, security: 1, musical: 1 },
      tagCounts: { music: 2, architecture: 1, musical: 1 },
    });
    expect(tagSequence(root)).toEqual(['architecture', 'music', 'musical', 'security']);
    expect(document.activeElement).toBe(tagInput(root, 'music'));
    expect(root.querySelector('[data-filter-visible-count]')?.textContent).toBe('2 / 4タグ');
    expect(root.querySelector('[data-filter-tag="music"] .filter-option-count')?.textContent).toBe(
      '4件',
    );
    controller?.dispose();
  });

  it('順次選択・解除・chip解除・実 history 復帰で URL/chip は preferred/保持順に従うこと', async () => {
    const response: ExploreSearchResponse = {
      ...staticResponse,
      allTagCounts: { music: 4, architecture: 3, security: 1 },
      tagCounts: { music: 4, architecture: 3, security: 1 },
    };
    const root = await renderTagOrderFixture(response);
    const runtime = deferredTagRuntime();
    const controller = enhanceWithRuntime(root, undefined, runtime.core);
    const selected = () =>
      [...root.querySelectorAll<HTMLElement>('[data-selected-tag]')].map(
        (chip) => chip.dataset['selectedTag'],
      );
    const assertSelected = (tags: string[], chipTags: string[] = tags, responseApplied = true) => {
      const url = new URL(location.href);
      expect(url.pathname).toBe(tags.length === 1 ? `/tags/${tags[0] ?? ''}/` : '/search/');
      if (tags.length > 1) expect(url.searchParams.getAll('tag')).toEqual(tags);
      expect(selected()).toEqual(chipTags);
      if (responseApplied) expect(tagSequence(root)).toEqual(['music', 'architecture', 'security']);
    };
    for (const [tag, urlTags, immediateChips] of [
      ['security', ['security'], ['security']],
      ['architecture', ['architecture', 'security'], ['architecture', 'security']],
      ['music', ['architecture', 'music', 'security'], ['music', 'architecture', 'security']],
    ] as const) {
      await userEvent.click(expectElement(tagInput(root, tag).closest('label'), tag));
      assertSelected([...urlTags], [...immediateChips]);
      await runtime.finish(root, response);
      assertSelected([...urlTags]);
    }
    await userEvent.click(
      expectElement(tagInput(root, 'architecture').closest('label'), 'deselect'),
    );
    assertSelected(['music', 'security']);
    await runtime.finish(root, response);
    await userEvent.click(
      expectElement(root.querySelector('[data-search-selected-tag-remove="music"]'), 'chip remove'),
    );
    assertSelected(['security']);
    await runtime.finish(root, response);
    history.back();
    await expect.poll(() => selected()).toEqual(['music', 'security']);
    assertSelected(['music', 'security'], ['music', 'security'], false);
    await runtime.finish(root, response);
    assertSelected(['music', 'security']);
    history.forward();
    await expect.poll(() => selected()).toEqual(['security']);
    assertSelected(['security'], ['security'], false);
    await runtime.finish(root, response);
    assertSelected(['security']);
    controller?.dispose();
  });

  it('同一 node 列の同期は先頭タグ操作でも checkbox を再接続せず focus を保つこと', async () => {
    const response: ExploreSearchResponse = {
      ...staticResponse,
      allTagCounts: { music: 4, architecture: 3 },
      tagCounts: { music: 4, architecture: 3 },
    };
    const root = await renderTagOrderFixture(response, ['music']);
    const runtime = deferredTagRuntime();
    const controller = enhanceWithRuntime(root, undefined, runtime.core);
    const list = expectElement(root.querySelector('[data-search-filter-list]'), 'list');
    let rowReconnects = 0;
    const observer = new MutationObserver((records) => {
      rowReconnects += records.length;
    });
    observer.observe(list, { childList: true });
    const music = tagInput(root, 'music');
    music.focus();
    await userEvent.keyboard(' ');
    expect(tagSequence(root)).toEqual(['music', 'architecture']);
    expect(document.activeElement).toBe(music);
    await runtime.finish(root, response);
    expect(document.activeElement).toBe(music);
    expect(rowReconnects + observer.takeRecords().length).toBe(0);
    observer.disconnect();
    controller?.dispose();
  });

  it('必要な再構成で local filter に隠れる行や削除された行へ focus を強制しないこと', async () => {
    const response: ExploreSearchResponse = {
      ...staticResponse,
      allTagCounts: { music: 4, architecture: 3 },
      tagCounts: { music: 4, architecture: 3 },
    };
    const root = await renderTagOrderFixture(response, ['absent']);
    const runtime = deferredTagRuntime();
    const controller = enhanceWithRuntime(root, undefined, runtime.core);
    const absent = tagInput(root, 'absent');
    await userEvent.click(expectElement(absent.closest('label'), 'absent label'));
    expect(root.contains(absent)).toBe(false);
    expect(document.activeElement).not.toBe(absent);
    await runtime.finish(root, response);
    await userEvent.click(
      expectElement(tagInput(root, 'architecture').closest('label'), 'architecture label'),
    );
    const music = tagInput(root, 'music');
    music.focus();
    const filter = expectElement(
      root.querySelector<HTMLInputElement>('[data-search-filter-input]'),
      'filter',
    );
    // 応答待ち中に変わった local 条件を、focus 保持より先に反映する。
    filter.value = 'architecture';
    await runtime.finish(root, {
      ...response,
      allTagCounts: { architecture: 8, music: 4, added: 1 },
    });
    expect(root.querySelector<HTMLElement>('[data-filter-tag="music"]')?.hidden).toBe(true);
    expect(document.activeElement).not.toBe(music);
    controller?.dispose();
  });

  it('選択済みタグの解除 button を static icon 契約で生成すること', () => {
    const root = renderSearchPageFixture();
    const architecture = expectElement(
      root.querySelector<HTMLInputElement>('[data-search-tag-checkbox][value="architecture"]'),
      'architecture',
    );
    enhanceWithRuntime(root);
    architecture.checked = true;
    architecture.dispatchEvent(new Event('change', { bubbles: true }));

    const remove = expectElement(
      root.querySelector<HTMLButtonElement>(
        'button.selected-tag__remove[data-search-selected-tag-remove][type="button"]',
      ),
      'selected tag remove',
    );

    expect(remove.getAttribute('aria-label')).to.equal('architectureを解除');
    expect(remove.querySelector('.selected-tag__remove-icon.static-icon > svg')).not.to.equal(null);
    expect(remove.hasAttribute('data-selected-tag-remove')).to.equal(false);
    expect(root.querySelector('[data-filter-option]')?.getAttribute('data-selected')).to.equal(
      'true',
    );
    expect(root.querySelector('.filter-option--selected')).to.equal(null);
  });

  it('単一タグ state と通常 search state の pushState / popstate で hero を同期すること', () => {
    const root = renderSearchPageFixture();
    enhanceWithRuntime(root);
    const music = expectElement(
      root.querySelector<HTMLInputElement>('[data-search-tag-checkbox][value="music"]'),
      'music',
    );

    music.checked = true;
    music.dispatchEvent(new Event('change', { bubbles: true }));
    expect(location.pathname).to.equal('/tags/music/');
    expect(root.querySelector('.eyebrow')?.textContent).to.equal('Tag / Explore');
    expect(root.querySelector('h1')?.textContent).to.equal('#music');
    expect(root.querySelector('.description')?.textContent).to.equal(
      'このタグに属するノートを起点に、検索語や追加タグで探索を広げられます。',
    );

    history.pushState(history.state, '', '/search/?tag=music');
    window.dispatchEvent(new PopStateEvent('popstate'));
    expect(
      root.querySelector<HTMLInputElement>('[data-search-tag-checkbox][value="music"]')?.checked,
    ).to.equal(true);
    expect(root.querySelector('.eyebrow')?.textContent).to.equal('Search / Filter');
    expect(root.querySelector('h1')?.textContent).to.equal('検索');
    expect(root.querySelector('.description')?.textContent).to.equal(
      'タグとキーワードを組み合わせ、複数タグはOR / ANDを切り替えて探索します。',
    );

    history.pushState(history.state, '', '/tags/music/');
    window.dispatchEvent(new PopStateEvent('popstate'));
    expect(root.querySelector('.eyebrow')?.textContent).to.equal('Tag / Explore');
    expect(root.querySelector('h1')?.textContent).to.equal('#music');

    history.pushState(history.state, '', '/search/?q=router');
    window.dispatchEvent(new PopStateEvent('popstate'));
    expect(root.querySelector('.eyebrow')?.textContent).to.equal('Search / Filter');
    expect(root.querySelector('h1')?.textContent).to.equal('検索');
    expect(root.querySelector('.description')?.textContent).to.equal(
      'タグとキーワードを組み合わせ、複数タグはOR / ANDを切り替えて探索します。',
    );
  });
});

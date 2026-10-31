import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { fixture, requireFixtureValue } from './harness/browser-fixture.js';
import {
  adoptContentBinding,
  beginContentMutation,
  beginFeatureNavigation,
  beginNavigationIntent,
  captureFeatureSource,
  clearInitialFragmentSelectionPolicy,
  initializeContentContext,
  readContentContext,
  readInitialFragmentSelectionPolicy,
  recordInitialFragmentInput,
  registerInitialFragmentSelectionPolicy,
  releaseContentContext,
  subscribeContentContext,
  writeFeatureHistoryEntry,
  type FeatureCause,
  type InitialFragmentSelectionBinding,
} from '../../src/navigation/content-navigation-context.js';
import {
  observeHistoryEntries,
  readAddress,
  readHistoryEntry,
  writeHistoryEntry,
} from '../../src/navigation/history-entry.js';
import {
  commitShellGeneration,
  resetShellLifecycleForTest,
} from '../../src/components/app/shell/app-shell-lifecycle.js';
import {
  ReadingPositionController,
  type NativeReadingPositionObservation,
} from '../../src/components/app/controllers/reading-position-controller.js';
import { setContentReadiness } from '../../src/client/hydration/content-readiness.js';

const originalState: unknown = history.state;
const originalUrl = readAddress();
const initialUrl = '/notes/initial-policy?tab=invalid#heading';
const normalizedUrl = '/notes/initial-policy#heading';
let baselineState: unknown;
let root: HTMLElement | null = null;
let stop: (() => void) | null = null;
let stopHistory: (() => void) | null = null;

beforeAll(() => {
  writeHistoryEntry({ mode: 'replace', owner: 'router', url: originalUrl, state: {} });
  baselineState = history.state;
});
afterAll(() => history.replaceState(originalState, '', originalUrl));
beforeEach(async () => {
  history.replaceState(baselineState, '', initialUrl);
  root = await fixture('<main id="initial-policy-root"><h2 id="heading">本文</h2></main>');
  resetShellLifecycleForTest();
  initializeContentContext(root);
  beginNavigationIntent('initial', initialUrl);
});
afterEach(() => {
  stop?.();
  stopHistory?.();
  stop = null;
  stopHistory = null;
  releaseContentContext(root);
  root = null;
  vi.restoreAllMocks();
  resetShellLifecycleForTest();
  history.replaceState(baselineState, '', originalUrl);
});

const binding = (): InitialFragmentSelectionBinding => {
  const current = requireFixtureValue(readContentContext());
  return {
    root: requireFixtureValue(root),
    contentEpoch: current.contentEpoch,
    shellCommitId: 0,
    intentId: requireFixtureValue(current.intent).intentId,
    entryId: requireFixtureValue(readHistoryEntry()).id,
    url: readAddress(),
  };
};
const install = (): void => {
  expect(registerInitialFragmentSelectionPolicy(binding(), false)?.eligible).toBe(true);
};
const currentPolicy = () => readInitialFragmentSelectionPolicy(requireFixtureValue(root), 0);
const write = (cause: FeatureCause, url = normalizedUrl, mode: 'replace' | 'push' = 'replace') => {
  const source = captureFeatureSource(requireFixtureValue(root));
  const token = requireFixtureValue(beginFeatureNavigation(source, cause));
  return writeFeatureHistoryEntry(source, token, { mode, url });
};

describe('初回fragmentの入力policyとfeature binding採用', () => {
  it('job登録前の入力witnessを保持し、job外の入力も同じbindingへ記録する', () => {
    recordInitialFragmentInput(0);
    expect(currentPolicy()).toBeNull();
    expect(readContentContext()?.initialFragmentSelectionPolicy).toMatchObject({
      eligible: false,
      inputRevision: 1,
      suppressed: true,
    });
    install();
    expect(currentPolicy()).toMatchObject({ eligible: true, inputRevision: 1, suppressed: true });
    recordInitialFragmentInput(0);
    expect(currentPolicy()).toMatchObject({ eligible: true, inputRevision: 2, suppressed: true });
  });

  it.each(['initialization', 'normalization'] as const)(
    '%sの成功した同entry replaceではobserverより前に入力policyを新URLへ引き継ぐ',
    (cause) => {
      install();
      recordInitialFragmentInput(0);
      const initialIntent = readContentContext()?.intent;
      const seen: string[] = [];
      stop = subscribeContentContext((reason) => {
        if (reason !== 'feature') return;
        expect(readContentContext()?.displayedBinding.url).toBe(normalizedUrl);
        expect(currentPolicy()).toMatchObject({
          url: normalizedUrl,
          eligible: true,
          inputRevision: 1,
          suppressed: true,
        });
        seen.push('feature');
      });
      stopHistory = observeHistoryEntries(
        () => {
          /* 成功後のobserverで採用順序を確認する。 */
        },
        () => {
          expect(currentPolicy()?.url).toBe(normalizedUrl);
          seen.push('history');
        },
      );
      const result = write(cause);
      expect(result?.expectedUrl).toBe(normalizedUrl);
      expect(readContentContext()?.intent).toBe(initialIntent);
      expect(seen).toEqual(['feature', 'history']);
      expect(currentPolicy()?.entryId).toBe(readHistoryEntry()?.id);
    },
  );

  it('書込み失敗では旧bindingと入力policyを保ち、observerへ成功を通知しない', () => {
    install();
    recordInitialFragmentInput(0);
    const prior = currentPolicy();
    const listener = vi.fn();
    stop = subscribeContentContext(listener);
    vi.spyOn(history, 'replaceState').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError');
    });
    expect(() => write('normalization')).toThrow('blocked');
    expect(readAddress()).toBe(initialUrl);
    expect(currentPolicy()).toBe(prior);
    expect(listener).not.toHaveBeenCalled();
  });

  it('書込み前observer中の追加入力を、成功時の最新policyへ保持する', () => {
    install();
    recordInitialFragmentInput(0);
    stopHistory = observeHistoryEntries(
      () => recordInitialFragmentInput(0),
      () => {
        /* 成功後の最新policyを呼出し元で確認する。 */
      },
    );
    expect(write('normalization')).not.toBeNull();
    expect(currentPolicy()).toMatchObject({
      url: normalizedUrl,
      inputRevision: 2,
      suppressed: true,
    });
  });

  it('History API前observerの新intentで旧書込みを取り消し、新policyを変更しない', () => {
    install();
    recordInitialFragmentInput(0);
    let reentered = false;
    stopHistory = observeHistoryEntries(
      () => {
        if (reentered) return;
        reentered = true;
        beginNavigationIntent('initial', readAddress());
        install();
      },
      () => {
        /* 書込み前の再入を検証し、成功後の通知は使わない。 */
      },
    );
    expect(write('normalization')).toBeNull();
    expect(readAddress()).toBe(initialUrl);
    expect(currentPolicy()).toMatchObject({ suppressed: false, inputRevision: 0 });
  });

  it('History API成功中の新owner再入では旧onDurableが新binding/policyを上書きしない', () => {
    install();
    recordInitialFragmentInput(0);
    const nativeReplace = history.replaceState.bind(history);
    let newIntentId: number | null = null;
    vi.spyOn(history, 'replaceState').mockImplementation(
      (data: unknown, unused: string, url?: string | URL | null) => {
        nativeReplace(data, unused, url);
        beginNavigationIntent('initial', readAddress());
        adoptContentBinding(readAddress());
        install();
        newIntentId = readContentContext()?.intent?.intentId ?? null;
      },
    );
    expect(write('normalization')).toBeNull();
    expect(currentPolicy()).toMatchObject({
      url: normalizedUrl,
      intentId: newIntentId,
      suppressed: false,
      inputRevision: 0,
    });
    expect(readContentContext()?.displayedBinding.url).toBe(normalizedUrl);
  });

  it('採用後observerが新intentを作っても、成功済み新bindingを旧policyへ戻さない', () => {
    install();
    recordInitialFragmentInput(0);
    stop = subscribeContentContext((reason) => {
      if (reason !== 'feature') return;
      beginNavigationIntent('initial', readAddress());
      install();
    });
    expect(write('normalization')).toBeNull();
    expect(readAddress()).toBe(normalizedUrl);
    expect(currentPolicy()).toMatchObject({ url: normalizedUrl, suppressed: false });
  });

  it('History API成功中のshell変更では入力policyを新URLへ引き継がない', () => {
    install();
    recordInitialFragmentInput(0);
    const nativeReplace = history.replaceState.bind(history);
    vi.spyOn(history, 'replaceState').mockImplementation(
      (data: unknown, unused: string, url?: string | URL | null) => {
        nativeReplace(data, unused, url);
        commitShellGeneration(1);
      },
    );
    expect(write('normalization')).toBeNull();
    expect(readContentContext()?.initialFragmentSelectionPolicy?.url).toBe(initialUrl);
    expect(readInitialFragmentSelectionPolicy(requireFixtureValue(root), 1)).toBeNull();
  });

  it.each([
    ['url-sync', normalizedUrl, 'replace'],
    ['normalization', '/notes/initial-policy#different', 'replace'],
    ['normalization', normalizedUrl, 'push'],
  ] as const)('%s/%s/%sは入力policyの引継ぎを許可しない', (cause, url, mode) => {
    install();
    recordInitialFragmentInput(0);
    expect(write(cause, url, mode)).not.toBeNull();
    expect(readAddress()).toBe(url);
    expect(currentPolicy()).toBeNull();
  });

  it('明示的な同URL/hashの新intentで旧入力抑止を解除する', () => {
    install();
    recordInitialFragmentInput(0);
    const source = captureFeatureSource(requireFixtureValue(root));
    expect(beginFeatureNavigation(source, 'user-navigation')).not.toBeNull();
    expect(currentPolicy()).toBeNull();
    expect(readContentContext()?.initialFragmentSelectionPolicy).toBeNull();
  });

  it('準備待ちの実Reading jobは正規化後cancelledとなり、旧exact URLの証明を受理しない', async () => {
    const content = requireFixtureValue(root);
    content.id = 'main-content';
    const contentEpoch = requireFixtureValue(readContentContext()).contentEpoch;
    setContentReadiness({
      contentEpoch,
      root: content,
      shellCommitId: 0,
      status: 'pending',
      started: false,
    });
    const observations: NativeReadingPositionObservation[] = [];
    const accepted = vi.fn();
    const errors: unknown[] = [];
    const reader = new ReadingPositionController(
      (error) => errors.push(error),
      accepted,
      (observation) => observations.push(observation),
    );
    try {
      reader.start(content);
      expect(content.dataset['readingPositionStatus']).toBe('pending');
      const initialIntent = readContentContext()?.intent;
      const classified = requireFixtureValue(
        observations.find((observation) => observation.phase === 'classified'),
      );
      expect(classified.isCurrent()).toBe(true);
      expect(write('normalization')).not.toBeNull();
      expect(readContentContext()?.intent).toBe(initialIntent);
      expect(readAddress()).toBe(normalizedUrl);
      expect(classified.isCurrent()).toBe(false);
      await expect.poll(() => content.dataset['readingPositionStatus']).toBe('cancelled');
      setContentReadiness({
        contentEpoch,
        root: content,
        shellCommitId: 0,
        status: 'settled',
        started: true,
      });
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      expect(content.dataset['readingPositionStatus']).toBe('cancelled');
      expect(observations.some((observation) => observation.phase === 'arrived')).toBe(false);
      expect(accepted).not.toHaveBeenCalled();
      expect(errors).toEqual([]);
    } finally {
      reader.dispose();
    }
  });

  it('準備待ちの実Reading jobはURL書込みのない本人intentでもcancelledとなる', async () => {
    const content = requireFixtureValue(root);
    content.id = 'main-content';
    const contentEpoch = requireFixtureValue(readContentContext()).contentEpoch;
    setContentReadiness({
      contentEpoch,
      root: content,
      shellCommitId: 0,
      status: 'pending',
      started: false,
    });
    const observations: NativeReadingPositionObservation[] = [];
    const accepted = vi.fn();
    const errors: unknown[] = [];
    const reader = new ReadingPositionController(
      (error) => errors.push(error),
      accepted,
      (observation) => observations.push(observation),
    );
    try {
      reader.start(content);
      expect(content.dataset['readingPositionStatus']).toBe('pending');
      const initialIntent = requireFixtureValue(readContentContext()?.intent);
      const classified = requireFixtureValue(
        observations.find((observation) => observation.phase === 'classified'),
      );
      expect(classified.isCurrent()).toBe(true);
      const replace = vi.spyOn(history, 'replaceState');
      const push = vi.spyOn(history, 'pushState');
      const token = beginFeatureNavigation(captureFeatureSource(content), 'user-navigation');
      expect(token).not.toBeNull();
      expect(token?.intentId).not.toBe(initialIntent.intentId);
      expect(readAddress()).toBe(initialUrl);
      expect(replace).not.toHaveBeenCalled();
      expect(push).not.toHaveBeenCalled();
      expect(classified.isCurrent()).toBe(false);
      await expect.poll(() => content.dataset['readingPositionStatus']).toBe('cancelled');
      setContentReadiness({
        contentEpoch,
        root: content,
        shellCommitId: 0,
        status: 'settled',
        started: true,
      });
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      expect(content.dataset['readingPositionStatus']).toBe('cancelled');
      expect(observations.some((observation) => observation.phase === 'arrived')).toBe(false);
      expect(accepted).not.toHaveBeenCalled();
      expect(errors).toEqual([]);
    } finally {
      reader.dispose();
    }
  });

  it('新epoch・pagehide用clear・shell失効を越えてpolicyを読まない', () => {
    install();
    recordInitialFragmentInput(0);
    clearInitialFragmentSelectionPolicy();
    expect(currentPolicy()).toBeNull();
    install();
    commitShellGeneration(1);
    expect(readInitialFragmentSelectionPolicy(requireFixtureValue(root), 1)).toBeNull();
    commitShellGeneration(0);
    beginContentMutation(requireFixtureValue(root));
    expect(readContentContext()?.initialFragmentSelectionPolicy).toBeNull();
  });
});

import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { fixture } from './harness/browser-fixture.js';
import {
  ReadingPositionController,
  type NativeReadingPositionObservation,
} from '../../src/components/app/controllers/reading-position-controller.js';
import {
  adoptContentBinding,
  beginNavigationIntent,
  initializeContentContext,
  releaseContentContext,
} from '../../src/navigation/content-navigation-context.js';
import { adoptHistoryEntry, readAddress } from '../../src/navigation/history-entry.js';

let root: HTMLElement;
let reader: ReadingPositionController | null = null;
const frame = (): Promise<void> => new Promise((resolve) => requestAnimationFrame(() => resolve()));

beforeEach(async () => {
  root = await fixture('<main id="main-content" style="height:5000px">本文</main>');
  adoptHistoryEntry();
  initializeContentContext(root);
  adoptContentBinding(readAddress());
  const navigation = performance.getEntriesByType('navigation')[0];
  if (!(navigation instanceof PerformanceNavigationTiming)) throw new Error('navigation timing');
  const nativeNavigation = new Proxy(navigation, {
    get: (target, key) => (key === 'type' ? 'reload' : Reflect.get(target, key, target)),
  });
  const readEntries = performance.getEntriesByType.bind(performance);
  vi.spyOn(performance, 'getEntriesByType').mockImplementation((name) =>
    name === 'navigation' ? [nativeNavigation] : readEntries(name),
  );
  vi.spyOn(document, 'readyState', 'get').mockReturnValue('loading');
});

afterEach(() => {
  reader?.dispose();
  reader = null;
  releaseContentContext(root);
  vi.restoreAllMocks();
});

it('reloadを同期分類し、実採用後だけreceiptを捏造せずnative観測を通知する', async () => {
  const observations: NativeReadingPositionObservation[] = [];
  const accepted = vi.fn();
  reader = new ReadingPositionController(vi.fn(), accepted, (value) => observations.push(value));
  reader.start(root);
  expect(observations.map((value) => [value.phase, value.policy])).toEqual([
    ['classified', 'native-viewport'],
  ]);
  expect(observations[0]?.isCurrent()).toBe(true);
  expect(history.scrollRestoration).toBe('auto');
  window.dispatchEvent(new Event('load'));
  await frame();
  expect(observations.map((value) => value.phase)).toEqual(['classified', 'accepted']);
  expect(observations[0]?.isCurrent()).toBe(false);
  expect(observations[1]?.isCurrent()).toBe(true);
  expect(observations[1]).not.toHaveProperty('receipt');
  expect(accepted).not.toHaveBeenCalled();
  expect(history.scrollRestoration).toBe('manual');
});

it.each([false, true])(
  'pagehideは旧load frameと受理証明を失効し、pageshowの新sequenceを守る（採用済=%s）',
  async (adopted) => {
    const observations: NativeReadingPositionObservation[] = [];
    reader = new ReadingPositionController(vi.fn(), vi.fn(), (value) => observations.push(value));
    reader.start(root);
    window.dispatchEvent(new Event('load'));
    if (adopted) await frame();
    const previous = observations.at(-1);
    expect(previous?.isCurrent()).toBe(true);
    window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true }));
    expect(previous?.isCurrent()).toBe(false);
    window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }));
    const resumed = observations.at(-1);
    expect(resumed?.phase).toBe('accepted');
    expect(resumed?.isCurrent()).toBe(true);
    const count = observations.length;
    await frame();
    expect(observations).toHaveLength(count);
    expect(resumed?.isCurrent()).toBe(true);
    beginNavigationIntent('navigation', readAddress());
    expect(resumed?.isCurrent()).toBe(false);
  },
);

it('native観測例外を位置採用から隔離し、新intentで旧load観測を復活させない', async () => {
  const error = new Error('native observer');
  const report = vi.fn();
  let observation: NativeReadingPositionObservation | null = null;
  reader = new ReadingPositionController(report, vi.fn(), (value) => {
    observation = value;
    throw error;
  });
  reader.start(root);
  expect(report).toHaveBeenCalledWith(error);
  window.dispatchEvent(new Event('load'));
  await frame();
  expect(root.dataset['readingPositionStatus']).toBe('settled');
  expect(history.scrollRestoration).toBe('manual');
  const previous = observation;
  beginNavigationIntent('navigation', readAddress());
  window.dispatchEvent(new Event('load'));
  await frame();
  expect(observation).toBe(previous);
});

it('native観測の巻戻しで実位置が変わった場合は追加scrollせず実座標を保存する', async () => {
  reader = new ReadingPositionController(vi.fn(), vi.fn(), (value) => {
    if (value.phase === 'accepted') root.style.height = '100px';
  });
  reader.start(root);
  window.scrollTo({ top: 1000, behavior: 'instant' });
  const scroll = vi.spyOn(window, 'scrollTo');
  window.dispatchEvent(new Event('load'));
  await frame();
  expect(scrollY).toBe(0);
  expect(reader).toMatchObject({ sample: { x: scrollX, y: scrollY } });
  expect(scroll).not.toHaveBeenCalled();
  expect(root.dataset['readingPositionStatus']).toBe('settled');
});

import { readContentReadiness } from '../../../client/hydration/content-readiness.js';
import { readHeadingScrollOffset } from '../../../navigation/heading-scroll-offset.js';
import {
  InitialFragmentGeometryWindow,
  sameInitialFragmentPoint,
  type InitialFragmentGeometry,
} from '../../../navigation/initial-fragment-motion.js';
import {
  resolveInitialFragmentTarget,
  isInitialFragmentTargetRenderable,
} from '../../../navigation/initial-fragment-target.js';

export type InitialFragmentOutcome = 'arrived' | 'cancelled' | 'unavailable';
interface Point {
  readonly x: number;
  readonly y: number;
}
export interface InitialFragmentBinding {
  readonly root: HTMLElement;
  readonly contentEpoch: number;
  readonly shellCommitId: number;
  readonly intentId: number;
  readonly entryId: string | null;
  readonly url: string;
}
export interface InitialFragmentArrival {
  readonly acceptedAt: number;
  readonly binding: InitialFragmentBinding;
  readonly targetKind: 'element' | 'document-top' | 'missing-fragment-top';
  readonly element: Element | null;
  readonly geometryRevision: number;
  readonly requestGeneration: number;
  readonly actual: Point;
  readonly target: Point;
  readonly range: Point;
  readonly readiness: 'settled' | 'unavailable';
  readonly tocResult: string;
}
interface Sample {
  readonly geometry: InitialFragmentGeometry;
  readonly actual: Point;
  readonly target: Point;
  readonly range: Point;
  readonly targetKind: InitialFragmentArrival['targetKind'];
  readonly element: Element | null;
  readonly readiness: 'settled' | 'unavailable';
}
interface Options {
  readonly binding: InitialFragmentBinding;
  readonly targetUrl?: string;
  readonly startedAt: number;
  readonly signal: AbortSignal;
  readonly current: () => boolean;
  readonly onCandidate: (isCurrent: () => boolean) => unknown;
  readonly onFinish: (outcome: InitialFragmentOutcome, arrival?: InitialFragmentArrival) => void;
  readonly onError: (error: unknown) => void;
}

// 初回だけのwriter。request世代は重複抑止であり、UA animationの所有権ではない。
export const runInitialFragmentPosition = (options: Options): Promise<void> =>
  new Promise((resolve) => {
    const { binding } = options;
    const deadline = options.startedAt + 5000;
    const geometry = new InitialFragmentGeometryWindow();
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    let reduced = media.matches;
    let motionRevision = 0;
    let frame = 0;
    let ended = false;
    let seenElement = false;
    let wasRenderable = false;
    let generation = 0;
    let issued: { point: Point; reduced: boolean; motionRevision: number } | null = null;
    let arrivals: Point[] = [];
    let lastAttempt: {
      revision: number;
      generation: number;
      controller: Element | null;
      source: Element | null;
      version: string | null;
    } | null = null;
    let tocResult = 'skipped';
    const report = (error: unknown): void => {
      try {
        options.onError(error);
      } catch {
        /* 診断は終端結果を変更しない。 */
      }
    };
    const visible = (): boolean => document.visibilityState === 'visible';
    const finish = (outcome: InitialFragmentOutcome, arrival?: InitialFragmentArrival): void => {
      if (ended) return;
      ended = true;
      const failures: unknown[] = [];
      for (const cleanup of [
        () => {
          cancelAnimationFrame(frame);
        },
        () => {
          clearTimeout(timer);
        },
        () => {
          options.signal.removeEventListener('abort', abort);
        },
        () => {
          document.removeEventListener('visibilitychange', visibility);
        },
        () => {
          media.removeEventListener('change', motion);
        },
      ]) {
        try {
          cleanup();
        } catch (error) {
          failures.push(error);
        }
      }
      try {
        options.onFinish(outcome, arrival);
      } catch (error) {
        failures.push(error);
      }
      resolve();
      for (const error of failures) report(error);
    };
    const current = (): boolean => {
      try {
        return options.current();
      } catch (error) {
        finish('unavailable');
        report(error);
        return false;
      }
    };
    const valid = (): boolean => {
      if (ended) return false;
      if (!current() || options.signal.aborted) {
        finish('cancelled');
        return false;
      }
      if (performance.now() >= deadline) {
        finish('unavailable');
        return false;
      }
      return true;
    };
    const reset = (): void => {
      geometry.resetWindow();
      arrivals = [];
    };
    const abort = (): void => {
      finish('cancelled');
    };
    const visibility = (): void => {
      reset();
    };
    const motion = (): void => {
      reduced = media.matches;
      motionRevision += 1;
      reset();
    };
    const timer = window.setTimeout(
      () => {
        finish(current() ? 'unavailable' : 'cancelled');
      },
      Math.max(0, deadline - performance.now()),
    );
    try {
      options.signal.addEventListener('abort', abort, { once: true });
      document.addEventListener('visibilitychange', visibility);
      media.addEventListener('change', motion);
    } catch (error) {
      finish('unavailable');
      report(error);
    }

    const read = (): Sample | null => {
      const readiness = readContentReadiness(binding.contentEpoch);
      if (
        readiness &&
        (readiness.root !== binding.root ||
          readiness.shellCommitId !== binding.shellCommitId ||
          readiness.status === 'invalidated')
      ) {
        finish('cancelled');
        return null;
      }
      const target = resolveInitialFragmentTarget(
        document,
        binding.root,
        options.targetUrl ?? binding.url,
      );
      let element: Element | null = null;
      let kind: Sample['targetKind'];
      let x = 0,
        y = 0;
      let rectValues = [0, 0, 0, 0];
      let offsetValues = [0, 0];
      if (target.kind === 'element') {
        seenElement = true;
        element = target.element;
        if (!isInitialFragmentTargetRenderable(element)) {
          if (wasRenderable) finish('unavailable');
          return null;
        }
        wasRenderable = true;
        if (element.getAttribute('data-router-hash-target') !== 'true') {
          element.setAttribute('data-router-hash-target', 'true');
          if (!valid()) return null;
        }
        const rect = element.getBoundingClientRect();
        const offset = readHeadingScrollOffset(element);
        rectValues = [rect.left + scrollX, rect.top + scrollY, rect.width, rect.height];
        offsetValues = [offset.scrollPaddingTop, offset.scrollMarginTop];
        y = Math.max(0, rect.top + scrollY - offset.offset);
        kind = 'element';
      } else if (target.kind === 'document-top') {
        if (seenElement) {
          finish('unavailable');
          return null;
        }
        kind = 'document-top';
      } else if (target.kind === 'missing') {
        if (seenElement) {
          finish('unavailable');
          return null;
        }
        if (document.readyState === 'loading' || !readiness || readiness.status === 'pending')
          return null;
        kind = 'missing-fragment-top';
      } else {
        finish('unavailable');
        return null;
      }
      const root = document.scrollingElement ?? document.documentElement;
      const range = {
        x: Math.max(0, root.scrollWidth - root.clientWidth),
        y: Math.max(0, root.scrollHeight - root.clientHeight),
      };
      x = Math.min(x, range.x);
      y = Math.min(y, range.y);
      const pending =
        !readiness ||
        readiness.status === 'pending' ||
        document.fonts.status === 'loading' ||
        Array.from(binding.root.querySelectorAll('img')).some(
          (image) =>
            !image.complete &&
            image.getBoundingClientRect().top + scrollY <= y &&
            (!image.hasAttribute('width') || !image.hasAttribute('height')),
        );
      if (pending || (readiness.status !== 'settled' && readiness.status !== 'unavailable'))
        return null;
      const values = [...rectValues, ...offsetValues, range.x, range.y, x, y];
      if (![...values, scrollX, scrollY].every(Number.isFinite)) {
        finish('unavailable');
        return null;
      }
      return {
        geometry: { identity: element ?? kind, values, motionRevision },
        actual: { x: scrollX, y: scrollY },
        target: { x, y },
        range,
        targetKind: kind,
        element,
        readiness: readiness.status,
      };
    };
    const covers = (sample: Sample): boolean =>
      !issued || sameInitialFragmentPoint(issued.point, sample.target);
    const arrived = (sample: Sample): boolean =>
      sameInitialFragmentPoint(sample.actual, sample.target) && covers(sample);
    const sampleFrame = (): void => {
      if (!valid()) return;
      if (!visible()) {
        reset();
        frame = requestAnimationFrame(sampleFrame);
        return;
      }
      try {
        const sample = read();
        if (!valid()) return;
        if (!sample) {
          reset();
          frame = requestAnimationFrame(sampleFrame);
          return;
        }
        const stable = geometry.observe(sample.geometry);
        if (arrived(sample)) arrivals = [...arrivals, sample.actual].slice(-3);
        else arrivals = [];
        const pointStable =
          arrivals.length === 3 &&
          ['x', 'y'].every((axis) => {
            const values = arrivals.map((point) => (axis === 'x' ? point.x : point.y));
            return Math.max(...values) - Math.min(...values) <= 2;
          });
        if (stable.stable) {
          const policyChange =
            reduced &&
            issued !== null &&
            (!issued.reduced || issued.motionRevision !== motionRevision);
          const needsRequest = issued
            ? !covers(sample) ||
              (policyChange && !sameInitialFragmentPoint(sample.actual, sample.target))
            : !pointStable;
          if (needsRequest) {
            if (!valid()) return;
            if (!visible()) {
              reset();
              frame = requestAnimationFrame(sampleFrame);
              return;
            }
            issued = { point: sample.target, reduced, motionRevision };
            generation += 1;
            arrivals = [];
            window.scrollTo({
              left: sample.target.x,
              top: sample.target.y,
              behavior: reduced ? 'instant' : 'smooth',
            });
            if (!valid()) return;
          } else if (pointStable) {
            const controller = binding.root.querySelector('layout-toc-controller');
            const source = controller
              ? document.getElementById(controller.getAttribute('source-id') ?? '')
              : null;
            const version = source?.textContent ?? null;
            if (
              lastAttempt?.revision !== stable.revision ||
              lastAttempt.generation !== generation ||
              lastAttempt.controller !== controller ||
              lastAttempt.source !== source ||
              lastAttempt.version !== version
            ) {
              lastAttempt = { revision: stable.revision, generation, controller, source, version };
              let candidateOpen = true;
              try {
                const result = options.onCandidate(
                  () =>
                    candidateOpen &&
                    !ended &&
                    current() &&
                    performance.now() < deadline &&
                    visible(),
                );
                tocResult = typeof result === 'string' ? result : 'skipped';
              } catch (error) {
                tocResult = 'degraded';
                report(error);
              } finally {
                candidateOpen = false;
              }
            }
            if (!valid()) return;
            if (!visible()) {
              reset();
              frame = requestAnimationFrame(sampleFrame);
              return;
            }
            const fresh = read();
            if (!valid()) return;
            if (
              fresh &&
              geometry.matches(fresh.geometry) &&
              arrived(fresh) &&
              arrivals.every((point) => sameInitialFragmentPoint(point, fresh.actual))
            ) {
              const acceptedAt = performance.now();
              if (acceptedAt >= deadline || !current()) {
                valid();
                return;
              }
              const arrival: InitialFragmentArrival = Object.freeze({
                acceptedAt,
                binding: Object.freeze({ ...binding }),
                targetKind: fresh.targetKind,
                element: fresh.element,
                geometryRevision: stable.revision,
                requestGeneration: generation,
                actual: Object.freeze({ ...fresh.actual }),
                target: Object.freeze({ ...fresh.target }),
                range: Object.freeze({ ...fresh.range }),
                readiness: fresh.readiness,
                tocResult,
              });
              finish('arrived', arrival);
              return;
            }
            reset();
          }
        }
        frame = requestAnimationFrame(sampleFrame);
      } catch (error) {
        finish('unavailable');
        report(error);
      }
    };
    if (valid()) frame = requestAnimationFrame(sampleFrame);
  });

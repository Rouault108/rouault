import { expect } from '@open-wc/testing';
import {
  AnchoredOverlayController,
  type AnchoredOverlayCommitSnapshot,
} from '../../src/components/ui/overlay/internal/anchored-overlay-controller.js';

interface RectInit {
  left: number;
  top: number;
  width: number;
  height: number;
}

const setFixedRect = (element: HTMLElement, { left, top, width, height }: RectInit): void => {
  Object.defineProperty(element, 'getBoundingClientRect', {
    configurable: true,
    value: (): DOMRect => new DOMRect(left, top, width, height),
  });
};

const setFloatingRectFromStyle = (
  element: HTMLElement,
  { width, height }: Pick<RectInit, 'width' | 'height'>,
): void => {
  Object.defineProperty(element, 'getBoundingClientRect', {
    configurable: true,
    value: (): DOMRect => {
      const left = Number.parseFloat(element.style.left || '0');
      const top = Number.parseFloat(element.style.top || '0');
      return new DOMRect(
        Number.isFinite(left) ? left : 0,
        Number.isFinite(top) ? top : 0,
        width,
        height,
      );
    },
  });
};

describe('anchored-overlay-controller browser contract', () => {
  // browser: immutable commit snapshot を含む内部 geometry 契約を検証する
  it('commit 時の referenceRect / measuredRect を immutable snapshot として保持すること', async () => {
    const reference = document.createElement('button');
    const floating = document.createElement('div');
    document.body.append(reference, floating);

    let open = true;
    const commits: AnchoredOverlayCommitSnapshot[] = [];

    setFixedRect(reference, { left: 40, top: 24, width: 96, height: 32 });
    setFloatingRectFromStyle(floating, { width: 160, height: 48 });

    const controller = new AnchoredOverlayController({
      ownerDocument: document,
      getReference: () => reference,
      getFloating: () => floating,
      getOpen: () => open,
      getPlacement: () => 'bottom-start',
      getOffset: () => 4,
      onCommit: (snapshot) => {
        commits.push(snapshot);
      },
    });

    try {
      expect(await controller.recomputePosition()).to.equal(true);
      expect(commits).to.have.length(1);

      const snapshot = commits[0];
      const lastSnapshot = controller.getLastCommitSnapshot();

      expect(lastSnapshot).to.equal(snapshot);
      expect(snapshot?.reference).to.equal(reference);
      expect(snapshot?.floating).to.equal(floating);
      expect(snapshot?.referenceRect.left).to.equal(40);
      expect(snapshot?.referenceRect.top).to.equal(24);
      expect(snapshot?.referenceRect.width).to.equal(96);
      expect(snapshot?.referenceRect.height).to.equal(32);
      expect(snapshot?.floatingWidth).to.equal(160);
      expect(snapshot?.floatingHeight).to.equal(48);
      expect(snapshot?.measuredRect.left).to.equal(snapshot?.x);
      expect(snapshot?.measuredRect.top).to.equal(snapshot?.y);
      expect(snapshot?.measuredRect.width).to.equal(160);
      expect(snapshot?.measuredRect.height).to.equal(48);
      expect(snapshot?.viewportCorrected).to.equal(false);
      expect(Number.isFinite(snapshot?.x)).to.equal(true);
      expect(Number.isFinite(snapshot?.y)).to.equal(true);
    } finally {
      open = false;
      controller.destroy();
      reference.remove();
      floating.remove();
    }
  });

  it('再 commit しても以前の snapshot を live rect として書き換えないこと', async () => {
    const reference = document.createElement('button');
    const floating = document.createElement('div');
    document.body.append(reference, floating);

    let open = true;
    const commits: AnchoredOverlayCommitSnapshot[] = [];

    setFixedRect(reference, { left: 32, top: 20, width: 80, height: 28 });
    setFloatingRectFromStyle(floating, { width: 140, height: 44 });

    const controller = new AnchoredOverlayController({
      ownerDocument: document,
      getReference: () => reference,
      getFloating: () => floating,
      getOpen: () => open,
      getPlacement: () => 'bottom-start',
      getOffset: () => 4,
      onCommit: (snapshot) => {
        commits.push(snapshot);
      },
    });

    try {
      expect(await controller.recomputePosition()).to.equal(true);
      const firstSnapshot = commits[0];
      expect(firstSnapshot).to.not.equal(undefined);

      setFixedRect(reference, { left: 180, top: 96, width: 120, height: 40 });

      expect(await controller.recomputePosition()).to.equal(true);
      expect(commits).to.have.length(2);

      const latestSnapshot = controller.getLastCommitSnapshot();
      expect(latestSnapshot).to.equal(commits[1]);
      expect(latestSnapshot).to.not.equal(firstSnapshot);

      expect(firstSnapshot?.referenceRect.left).to.equal(32);
      expect(firstSnapshot?.referenceRect.top).to.equal(20);
      expect(firstSnapshot?.referenceRect.width).to.equal(80);
      expect(firstSnapshot?.referenceRect.height).to.equal(28);

      expect(latestSnapshot?.referenceRect.left).to.equal(180);
      expect(latestSnapshot?.referenceRect.top).to.equal(96);
      expect(latestSnapshot?.referenceRect.width).to.equal(120);
      expect(latestSnapshot?.referenceRect.height).to.equal(40);
      expect(firstSnapshot?.measuredRect.width).to.equal(140);
      expect(firstSnapshot?.measuredRect.height).to.equal(44);
    } finally {
      open = false;
      controller.destroy();
      reference.remove();
      floating.remove();
    }
  });
});

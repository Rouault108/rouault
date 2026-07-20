import process from 'node:process';
import { inflateSync } from 'node:zlib';

import { expect, test } from '@playwright/test';

import { e2eNoteFixtures } from './support/note-fixtures.js';
import {
  canonicalizeCodeSelectionRecords,
  CODE_LINE_STATES,
  CODE_SELECTION_FIXTURES,
  compareCodeSelectionBaseline,
  createCodeSelectionRecord,
  resolveCodeSelectionProtocolConfiguration,
  writeCodeSelectionBaseline,
  type CodeSelectionRecord,
  type SelectionLineState,
} from './support/code-line-state-selection-protocol.js';

type NativeStateWrapperTag = 'mark' | 'ins' | 'del';

const NATIVE_STATE_WRAPPER_BY_STATE = {
  highlight: 'mark',
  add: 'ins',
  remove: 'del',
} as const satisfies Record<Exclude<SelectionLineState, 'normal'>, NativeStateWrapperTag>;

const GEOMETRY_TOLERANCE_PX = 1;
const GEOMETRY_ZOOM_FACTORS = [1, 1.25, 2] as const;

type GeometryTheme = 'light' | 'dark';

interface CodeLineStateGeometryMeasurement {
  readonly direction: 'ltr' | 'rtl';
  readonly writingMode: string;
  readonly scrollLeft: number;
  readonly scrollportInlineStart: number;
  readonly scrollportInlineEnd: number;
  readonly markerRailInlineStart: number;
  readonly markerRailInlineEnd: number;
  readonly codeTextInlineStart: number;
  readonly codeTextInlineEnd: number;
  readonly codeTextAnchorInlineStart: number;
  readonly codeTextAnchorInlineEnd: number;
  readonly lineNumberInlineStart: number | null;
  readonly lineNumberInlineEnd: number | null;
  readonly copyControlInlineStart: number | null;
  readonly copyControlInlineEnd: number | null;
  readonly codeTextBlockStart: number;
  readonly codeTextBlockEnd: number;
  readonly copyControlBlockStart: number | null;
  readonly copyControlBlockEnd: number | null;
  readonly markerPosition: string;
  readonly lineVisible: boolean;
  readonly markerRailSize: number;
  readonly markerGap: number;
  readonly markerInlineOffset: number;
  readonly lineInlinePadding: number;
  readonly lineNumberRailSize: number | null;
  readonly lineNumberGap: number | null;
}

interface LineMeasurement extends CodeLineStateGeometryMeasurement {
  readonly selectedText: string;
  readonly markerBackgroundColor: string;
  readonly markerBackgroundImage: string;
  readonly markerColor: string;
  readonly markerContent: string;
  readonly lineNumberContent: string;
}

interface StatelessLineDensityMeasurement {
  readonly markerContent: string;
  readonly markerPosition: string;
  readonly lineInlinePadding: number;
  readonly textOffsetFromLineStart: number;
}

interface MarkerPixelProbe {
  readonly markerRailInlineStart: number;
  readonly markerRailInlineEnd: number;
  readonly markerPixelCount: number;
  readonly markerShapePixelCount: number;
  readonly containsCodeTextPixels: boolean;
}

interface DecodedPng {
  readonly width: number;
  readonly height: number;
  readonly rgba: Uint8Array;
}

interface MarkerPixelSnapshot {
  readonly preInlineStart: number;
  readonly preBlockStart: number;
  readonly decoded: DecodedPng;
}

const MARKER_PROBE_COLOR = { red: 1, green: 254, blue: 1 } as const;
const CODE_TEXT_PROBE_COLOR = { red: 254, green: 1, blue: 254 } as const;
const PIXEL_COLOR_TOLERANCE = 4;
const MARKER_SHAPE_COLOR_DISTANCE = 12;

const decodePng = (png: Buffer): DecodedPng => {
  const signature = png.subarray(0, 8);
  const expectedSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  if (!signature.equals(expectedSignature)) throw new Error('Unsupported screenshot format.');

  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  let interlaceMethod = 0;
  const idatChunks: Buffer[] = [];

  for (let offset = 8; offset < png.length; ) {
    const length = png.readUInt32BE(offset);
    const type = png.toString('ascii', offset + 4, offset + 8);
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    const data = png.subarray(dataStart, dataEnd);

    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8] ?? 0;
      colorType = data[9] ?? 0;
      interlaceMethod = data[12] ?? 0;
    } else if (type === 'IDAT') {
      idatChunks.push(data);
    } else if (type === 'IEND') {
      break;
    }

    offset = dataEnd + 4;
  }

  if (
    width <= 0 ||
    height <= 0 ||
    bitDepth !== 8 ||
    ![2, 6].includes(colorType) ||
    interlaceMethod !== 0
  ) {
    throw new Error(
      `Unsupported PNG geometry: ${width}x${height}, depth=${bitDepth}, type=${colorType}, interlace=${interlaceMethod}.`,
    );
  }

  const bytesPerPixel = colorType === 6 ? 4 : 3;
  const scanlineLength = width * bytesPerPixel;
  const inflated = inflateSync(Buffer.concat(idatChunks));
  const rgba = new Uint8Array(width * height * 4);
  let sourceOffset = 0;
  let previous = new Uint8Array(scanlineLength);

  const paeth = (left: number, above: number, upperLeft: number): number => {
    const prediction = left + above - upperLeft;
    const leftDistance = Math.abs(prediction - left);
    const aboveDistance = Math.abs(prediction - above);
    const upperLeftDistance = Math.abs(prediction - upperLeft);
    if (leftDistance <= aboveDistance && leftDistance <= upperLeftDistance) return left;
    return aboveDistance <= upperLeftDistance ? above : upperLeft;
  };

  for (let y = 0; y < height; y += 1) {
    const filter = inflated[sourceOffset] ?? -1;
    sourceOffset += 1;
    const raw = inflated.subarray(sourceOffset, sourceOffset + scanlineLength);
    sourceOffset += scanlineLength;
    const row = new Uint8Array(scanlineLength);

    for (let x = 0; x < scanlineLength; x += 1) {
      const left = x >= bytesPerPixel ? (row[x - bytesPerPixel] ?? 0) : 0;
      const above = previous[x] ?? 0;
      const upperLeft = x >= bytesPerPixel ? (previous[x - bytesPerPixel] ?? 0) : 0;
      const value = raw[x] ?? 0;

      switch (filter) {
        case 0:
          row[x] = value;
          break;
        case 1:
          row[x] = (value + left) & 0xff;
          break;
        case 2:
          row[x] = (value + above) & 0xff;
          break;
        case 3:
          row[x] = (value + Math.floor((left + above) / 2)) & 0xff;
          break;
        case 4:
          row[x] = (value + paeth(left, above, upperLeft)) & 0xff;
          break;
        default:
          throw new Error(`Unsupported PNG filter: ${filter}.`);
      }
    }

    for (let x = 0; x < width; x += 1) {
      const sourceIndex = x * bytesPerPixel;
      const targetIndex = (y * width + x) * 4;
      rgba[targetIndex] = row[sourceIndex] ?? 0;
      rgba[targetIndex + 1] = row[sourceIndex + 1] ?? 0;
      rgba[targetIndex + 2] = row[sourceIndex + 2] ?? 0;
      rgba[targetIndex + 3] = colorType === 6 ? (row[sourceIndex + 3] ?? 0) : 255;
    }

    previous = row;
  }

  return { width, height, rgba };
};

const matchesProbeColor = (
  rgba: Uint8Array,
  index: number,
  color: Readonly<{ red: number; green: number; blue: number }>,
): boolean =>
  Math.abs((rgba[index] ?? 0) - color.red) <= PIXEL_COLOR_TOLERANCE &&
  Math.abs((rgba[index + 1] ?? 0) - color.green) <= PIXEL_COLOR_TOLERANCE &&
  Math.abs((rgba[index + 2] ?? 0) - color.blue) <= PIXEL_COLOR_TOLERANCE &&
  (rgba[index + 3] ?? 0) >= 250;

const readPixelColor = (
  rgba: Uint8Array,
  index: number,
): Readonly<{ red: number; green: number; blue: number }> => ({
  red: rgba[index] ?? 0,
  green: rgba[index + 1] ?? 0,
  blue: rgba[index + 2] ?? 0,
});

const colorDistance = (
  first: Readonly<{ red: number; green: number; blue: number }>,
  second: Readonly<{ red: number; green: number; blue: number }>,
): number =>
  Math.hypot(first.red - second.red, first.green - second.green, first.blue - second.blue);

const installMarkerPixelProbeStyle = async (
  page: import('@playwright/test').Page,
): Promise<void> => {
  const content = `
      :root[data-code-marker-geometry-probe='true']
        pre[data-code-block][data-code-has-line-state='true']
        .line::before {
        box-shadow:
          inset 0 0 0 1px
          rgb(${MARKER_PROBE_COLOR.red}, ${MARKER_PROBE_COLOR.green}, ${MARKER_PROBE_COLOR.blue}) !important;
      }

      :root[data-code-marker-geometry-probe='true'] pre[data-code-block] .line,
      :root[data-code-marker-geometry-probe='true'] pre[data-code-block] .line * {
        color: rgb(${CODE_TEXT_PROBE_COLOR.red}, ${CODE_TEXT_PROBE_COLOR.green}, ${CODE_TEXT_PROBE_COLOR.blue}) !important;
      }
    `;
  await page.evaluate((probeStyle) => {
    const style = document.createElement('style');
    style.dataset['codeMarkerGeometryProbe'] = 'true';
    style.textContent = probeStyle;
    document.head.append(style);
    document.documentElement.dataset['codeMarkerGeometryProbe'] = 'true';
  }, content);
};

const captureMarkerPixelSnapshot = async (
  pre: import('@playwright/test').Locator,
): Promise<MarkerPixelSnapshot> => {
  // locator screenshotによるviewport scrollと座標取得を競合させない。
  await pre.scrollIntoViewIfNeeded();
  const preBox = await pre.boundingBox();
  if (!preBox) throw new Error('Marker pixel probe requires visible code block geometry.');
  const screenshot = await pre.screenshot({ animations: 'disabled', scale: 'css' });

  return {
    preInlineStart: preBox.x,
    preBlockStart: preBox.y,
    decoded: decodePng(screenshot),
  };
};

const measureMarkerPixels = async (
  snapshot: MarkerPixelSnapshot,
  line: import('@playwright/test').Locator,
  direction: 'ltr' | 'rtl',
  markerInlineOffset: number,
): Promise<MarkerPixelProbe> => {
  const lineBox = await line.boundingBox();
  if (!lineBox) throw new Error('Marker pixel probe requires visible line geometry.');

  const { decoded } = snapshot;
  const row = Math.min(
    decoded.height - 1,
    Math.max(0, Math.round(lineBox.y - snapshot.preBlockStart + lineBox.height / 2)),
  );
  const markerColumns: number[] = [];
  let markerShapePixelCount = 0;
  let containsCodeTextPixels = false;

  for (let x = 0; x < decoded.width; x += 1) {
    const index = (row * decoded.width + x) * 4;
    if (matchesProbeColor(decoded.rgba, index, MARKER_PROBE_COLOR)) markerColumns.push(x);
  }

  if (markerColumns.length === 0) throw new Error('Marker pixel probe found no marker backing.');

  const physicalStart = Math.min(...markerColumns);
  const physicalEnd = Math.max(...markerColumns) + 1;
  const backingSampleInset = Math.max(2, Math.floor(markerInlineOffset / 2));
  const shapeSampleInset = Math.max(2, Math.floor(markerInlineOffset));
  const firstProbeRow = Math.max(0, row - 2);
  const lastProbeRow = Math.min(decoded.height - 1, row + 2);
  for (let probeRow = firstProbeRow; probeRow <= lastProbeRow; probeRow += 1) {
    const backingSampleIndex =
      (probeRow * decoded.width + Math.min(physicalEnd - 2, physicalStart + backingSampleInset)) *
      4;
    const backingColor = readPixelColor(decoded.rgba, backingSampleIndex);
    for (let x = physicalStart + 1; x < physicalEnd - 1; x += 1) {
      const index = (probeRow * decoded.width + x) * 4;
      if (matchesProbeColor(decoded.rgba, index, CODE_TEXT_PROBE_COLOR)) {
        containsCodeTextPixels = true;
      }
      if (
        x >= physicalStart + shapeSampleInset &&
        x < physicalEnd - shapeSampleInset &&
        colorDistance(readPixelColor(decoded.rgba, index), backingColor) >
          MARKER_SHAPE_COLOR_DISTANCE
      ) {
        markerShapePixelCount += 1;
      }
    }
  }

  return direction === 'ltr'
    ? {
        markerRailInlineStart: snapshot.preInlineStart + physicalStart,
        markerRailInlineEnd: snapshot.preInlineStart + physicalEnd,
        markerPixelCount: markerColumns.length,
        markerShapePixelCount,
        containsCodeTextPixels,
      }
    : {
        markerRailInlineStart: -(snapshot.preInlineStart + physicalEnd),
        markerRailInlineEnd: -(snapshot.preInlineStart + physicalStart),
        markerPixelCount: markerColumns.length,
        markerShapePixelCount,
        containsCodeTextPixels,
      };
};

const measureLine = async (
  line: import('@playwright/test').Locator,
  nativeWrapperTag: NativeStateWrapperTag | null = null,
): Promise<LineMeasurement> =>
  line.evaluate((lineElement, wrapperTag) => {
    const line = lineElement as HTMLElement;
    const pre = line.closest('pre[data-code-block]');
    if (!(pre instanceof HTMLElement)) throw new Error('Selection line has no code block owner.');

    const parseLength = (value: string): number => {
      const parsed = Number.parseFloat(value);
      return Number.isFinite(parsed) ? parsed : 0;
    };

    const isRenderedTextNode = (node: Text): boolean => {
      const owner = node.parentElement;
      if (!owner || node.data.length === 0) return false;
      const style = getComputedStyle(owner);
      return (
        style.display !== 'none' && style.visibility !== 'hidden' && owner.ariaHidden !== 'true'
      );
    };

    const textRectangles = (target: HTMLElement): DOMRect[] => {
      const rectangles: DOMRect[] = [];
      const walker = target.ownerDocument.createTreeWalker(target, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        if (!(node instanceof Text) || !isRenderedTextNode(node)) continue;
        const range = target.ownerDocument.createRange();
        range.selectNodeContents(node);
        for (const rectangle of range.getClientRects()) {
          if (rectangle.width > 0 && rectangle.height > 0) rectangles.push(rectangle);
        }
      }
      return rectangles;
    };

    const resolveCopyControl = (): HTMLElement | null => {
      const groupPanel = pre.closest<HTMLElement>('[data-code-group-panel]');
      const group = pre.closest<HTMLElement>('section[data-code-group]');
      if (group && groupPanel) {
        const copySourceId = groupPanel.getAttribute('data-code-copy-source-id');
        const controls = [...group.querySelectorAll<HTMLElement>('button[data-copy-button]')];
        const matchingControl = controls.find(
          (control) => copySourceId && control.getAttribute('data-copy-target-id') === copySourceId,
        );
        if (matchingControl) return matchingControl;
        const visibleControls = controls.filter((control) => {
          const rectangle = control.getBoundingClientRect();
          const style = getComputedStyle(control);
          return rectangle.width > 0 && rectangle.height > 0 && style.visibility !== 'hidden';
        });
        return visibleControls.length === 1 ? (visibleControls[0] ?? null) : null;
      }

      return (
        pre
          .closest<HTMLElement>('[data-code-block-root]')
          ?.querySelector<HTMLElement>('button[data-copy-button]') ?? null
      );
    };

    const readSelectedText = (target: HTMLElement): string => {
      const selection = target.ownerDocument.defaultView?.getSelection();
      if (!selection) throw new Error('Selection API is unavailable.');
      const range = target.ownerDocument.createRange();
      range.selectNodeContents(target);
      selection.removeAllRanges();
      selection.addRange(range);
      const selectedText = selection.toString();
      selection.removeAllRanges();
      return selectedText;
    };

    let selectionTarget = line;
    let wrapperFixture: HTMLElement | null = null;
    if (wrapperTag) {
      const clone = line.cloneNode(true) as HTMLElement;
      const wrapper = line.ownerDocument.createElement(wrapperTag);
      while (clone.firstChild) wrapper.append(clone.firstChild);
      clone.append(wrapper);

      wrapperFixture = line.ownerDocument.createElement('div');
      wrapperFixture.style.position = 'fixed';
      wrapperFixture.style.insetInlineStart = '-100000px';
      wrapperFixture.style.insetBlockStart = '0';
      wrapperFixture.style.whiteSpace = 'pre';
      wrapperFixture.style.opacity = '0';
      wrapperFixture.style.pointerEvents = 'none';
      wrapperFixture.append(clone);
      line.ownerDocument.body.append(wrapperFixture);
      selectionTarget = clone;
    }

    let selectedText = '';
    try {
      selectedText = readSelectedText(selectionTarget);
    } finally {
      wrapperFixture?.remove();
    }

    const marker = getComputedStyle(line, '::before');
    const lineNumber = getComputedStyle(line, '::after');
    const lineStyle = getComputedStyle(line);
    const preStyle = getComputedStyle(pre);
    const preRect = pre.getBoundingClientRect();
    const lineRect = line.getBoundingClientRect();
    const direction = preStyle.direction === 'rtl' ? 'rtl' : 'ltr';
    const inlineScale = pre.offsetWidth > 0 ? preRect.width / pre.offsetWidth : 1;
    const physicalScrollportLeft =
      preRect.left + (pre.clientLeft + parseLength(preStyle.paddingLeft)) * inlineScale;
    const physicalScrollportRight =
      preRect.left +
      (pre.clientLeft + pre.clientWidth - parseLength(preStyle.paddingRight)) * inlineScale;
    const toInlineInterval = (rectangle: Pick<DOMRect, 'left' | 'right'>) =>
      direction === 'ltr'
        ? { start: rectangle.left, end: rectangle.right }
        : { start: -rectangle.right, end: -rectangle.left };
    const scrollportInterval = toInlineInterval({
      left: physicalScrollportLeft,
      right: physicalScrollportRight,
    });
    const lineInterval = toInlineInterval(lineRect);
    const rectangles = textRectangles(line);
    const anchorRectangle = rectangles[0];
    const visibleRectangle = rectangles.find(
      (rectangle) =>
        rectangle.right > physicalScrollportLeft && rectangle.left < physicalScrollportRight,
    );
    if (!anchorRectangle || !visibleRectangle) {
      throw new Error('Selection line has no measurable visible text range.');
    }
    const anchorTextInterval = toInlineInterval(anchorRectangle);
    const visibleTextInterval = toInlineInterval(visibleRectangle);

    const resolveCustomLength = (propertyName: string): number => {
      const probe = line.ownerDocument.createElement('span');
      probe.style.position = 'absolute';
      probe.style.visibility = 'hidden';
      probe.style.pointerEvents = 'none';
      probe.style.inlineSize = `var(${propertyName})`;
      probe.style.blockSize = '0';
      pre.append(probe);
      try {
        return parseLength(getComputedStyle(probe).inlineSize) * inlineScale;
      } finally {
        probe.remove();
      }
    };
    const markerRailSize = parseLength(marker.inlineSize) * inlineScale;
    const markerGap = parseLength(marker.marginInlineEnd) * inlineScale;
    const markerInlineOffset = resolveCustomLength('--ui-code-state-marker-inline-offset');
    const lineInlinePadding = parseLength(lineStyle.paddingInlineStart) * inlineScale;
    const markerMarginInlineStart = parseLength(marker.marginInlineStart) * inlineScale;
    const markerInsetInlineStart = parseLength(marker.insetInlineStart) * inlineScale;
    const naturalMarkerInlineStart =
      lineInterval.start + lineInlinePadding + markerMarginInlineStart;
    const markerRailInlineStart = Math.max(
      naturalMarkerInlineStart,
      scrollportInterval.start + markerInsetInlineStart,
    );
    const markerRailInlineEnd = markerRailInlineStart + markerRailSize;

    const hasLineNumber = !['none', 'normal', ''].includes(lineNumber.content);
    const lineNumberRailSize = hasLineNumber ? parseLength(lineNumber.width) * inlineScale : null;
    const lineNumberInset = hasLineNumber
      ? parseLength(lineNumber.insetInlineStart) * inlineScale
      : null;
    const lineNumberInlineStart =
      lineNumberRailSize !== null && lineNumberInset !== null
        ? lineInterval.start + lineNumberInset
        : null;
    const lineNumberInlineEnd =
      lineNumberInlineStart !== null && lineNumberRailSize !== null
        ? lineNumberInlineStart + lineNumberRailSize
        : null;
    const lineNumberGap =
      lineNumberRailSize === null
        ? null
        : lineInlinePadding - lineNumberRailSize - markerRailSize - markerGap;

    const copyControl = resolveCopyControl();
    const copyControlRect = copyControl?.getBoundingClientRect() ?? null;
    const copyControlInterval = copyControlRect ? toInlineInterval(copyControlRect) : null;
    const lineVisible =
      lineRect.width > 0 &&
      lineRect.height > 0 &&
      lineStyle.display !== 'none' &&
      lineStyle.visibility !== 'hidden';

    return {
      selectedText,
      markerBackgroundColor: marker.backgroundColor,
      markerBackgroundImage: marker.backgroundImage,
      markerColor: marker.color,
      markerContent: marker.content,
      markerPosition: marker.position,
      direction,
      writingMode: preStyle.writingMode,
      scrollLeft: pre.scrollLeft,
      scrollportInlineStart: scrollportInterval.start,
      scrollportInlineEnd: scrollportInterval.end,
      markerRailInlineStart,
      markerRailInlineEnd,
      codeTextInlineStart: visibleTextInterval.start,
      codeTextInlineEnd: visibleTextInterval.end,
      codeTextAnchorInlineStart: anchorTextInterval.start,
      codeTextAnchorInlineEnd: anchorTextInterval.end,
      lineNumberInlineStart,
      lineNumberInlineEnd,
      copyControlInlineStart: copyControlInterval?.start ?? null,
      copyControlInlineEnd: copyControlInterval?.end ?? null,
      codeTextBlockStart: visibleRectangle.top,
      codeTextBlockEnd: visibleRectangle.bottom,
      copyControlBlockStart: copyControlRect?.top ?? null,
      copyControlBlockEnd: copyControlRect?.bottom ?? null,
      lineVisible,
      markerRailSize,
      markerGap,
      markerInlineOffset,
      lineInlinePadding,
      lineNumberRailSize,
      lineNumberGap,
      lineNumberContent: lineNumber.content,
    };
  }, nativeWrapperTag);

const measureStatelessLineDensity = async (
  line: import('@playwright/test').Locator,
): Promise<StatelessLineDensityMeasurement> =>
  line.evaluate((lineElement) => {
    const line = lineElement as HTMLElement;
    const style = getComputedStyle(line);
    const marker = getComputedStyle(line, '::before');
    const direction = style.direction === 'rtl' ? 'rtl' : 'ltr';
    const lineRect = line.getBoundingClientRect();
    const walker = line.ownerDocument.createTreeWalker(line, NodeFilter.SHOW_TEXT);
    let textRectangle: DOMRect | null = null;
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if (!(node instanceof Text) || node.data.length === 0) continue;
      const owner = node.parentElement;
      if (!owner) continue;
      const ownerStyle = getComputedStyle(owner);
      if (ownerStyle.display === 'none' || ownerStyle.visibility === 'hidden') continue;
      const range = line.ownerDocument.createRange();
      range.selectNodeContents(node);
      const rectangle = range.getBoundingClientRect();
      if (rectangle.width > 0 && rectangle.height > 0) {
        textRectangle = rectangle;
        break;
      }
    }
    if (!textRectangle) throw new Error('Stateless line has no measurable text range.');
    const lineInlineStart = direction === 'ltr' ? lineRect.left : -lineRect.right;
    const textInlineStart = direction === 'ltr' ? textRectangle.left : -textRectangle.right;
    return {
      markerContent: marker.content,
      markerPosition: marker.position,
      lineInlinePadding: Number.parseFloat(style.paddingInlineStart) || 0,
      textOffsetFromLineStart: textInlineStart - lineInlineStart,
    };
  });

const waitForGeometrySettle = async (page: import('@playwright/test').Page): Promise<void> => {
  await page.evaluate(() => {
    const root = document.documentElement;
    // JavaScript無効contextでも、styleとlayoutの同期readで直前のzoom／scroll変更を確定する。
    getComputedStyle(root).zoom;
    root.getBoundingClientRect();
  });
};

const setGeometryEnvironment = async (
  page: import('@playwright/test').Page,
  theme: GeometryTheme,
  zoom: number,
): Promise<void> => {
  await page.evaluate(
    ({ requestedTheme, requestedZoom }) => {
      document.documentElement.dataset['theme'] = requestedTheme;
      document.documentElement.style.zoom = String(requestedZoom);
    },
    { requestedTheme: theme, requestedZoom: zoom },
  );
  await waitForGeometrySettle(page);
};

const scrollToInlineStart = async (pre: import('@playwright/test').Locator): Promise<void> => {
  await pre.evaluate((element) => {
    element.scrollLeft = 0;
  });
};

const scrollToInlineEnd = async (pre: import('@playwright/test').Locator): Promise<void> => {
  await pre.evaluate((element) => {
    const candidates = [element.scrollWidth, -element.scrollWidth];
    let selected = { left: element.scrollLeft, distance: Math.abs(element.scrollLeft) };
    for (const candidate of candidates) {
      element.scrollLeft = candidate;
      const distance = Math.abs(element.scrollLeft);
      if (distance > selected.distance) selected = { left: element.scrollLeft, distance };
    }
    element.scrollLeft = selected.left;
  });
};

const scrollToInlineDistance = async (
  pre: import('@playwright/test').Locator,
  requestedDistance: number,
): Promise<void> => {
  await pre.evaluate((element, distance) => {
    const clampedDistance = Math.min(
      Math.max(0, distance),
      Math.max(0, element.scrollWidth - element.clientWidth),
    );
    const candidates = [clampedDistance, -clampedDistance];
    let selected = { left: element.scrollLeft, distance: Math.abs(element.scrollLeft) };
    for (const candidate of candidates) {
      element.scrollLeft = candidate;
      const actualDistance = Math.abs(element.scrollLeft);
      if (actualDistance > selected.distance) {
        selected = { left: element.scrollLeft, distance: actualDistance };
      }
    }
    element.scrollLeft = selected.left;
  }, requestedDistance);
};

const expectIntervalsNotToIntersect = (
  firstInlineStart: number,
  firstInlineEnd: number,
  secondInlineStart: number,
  secondInlineEnd: number,
  label: string,
): void => {
  const overlap =
    Math.min(firstInlineEnd, secondInlineEnd) - Math.max(firstInlineStart, secondInlineStart);
  expect(overlap, label).toBeLessThanOrEqual(GEOMETRY_TOLERANCE_PX);
};

const expectGeometryIntervals = (
  measurement: CodeLineStateGeometryMeasurement,
  markerPixels: MarkerPixelProbe,
  label: string,
): void => {
  expect(measurement.writingMode, `${label} writing mode`).toBe('horizontal-tb');
  expect(measurement.markerPosition, `${label} sticky marker declaration`).toBe('sticky');
  expect(measurement.lineVisible, `${label} line visibility`).toBe(true);
  expect(measurement.markerRailSize, `${label} marker rail size`).toBeGreaterThan(0);
  expect(measurement.markerGap, `${label} marker gap`).toBeGreaterThan(0);
  expect(measurement.markerInlineOffset, `${label} marker inline offset`).toBeGreaterThan(0);
  expect(markerPixels.markerPixelCount, `${label} marker backing pixels`).toBeGreaterThan(0);
  expect(
    markerPixels.markerRailInlineEnd - markerPixels.markerRailInlineStart,
    `${label} marker backing width`,
  ).toBeCloseTo(measurement.markerRailSize, 0);
  expect(markerPixels.containsCodeTextPixels, `${label} code text visible through backing`).toBe(
    false,
  );
  expect(
    markerPixels.markerRailInlineStart,
    `${label} marker inside scrollport inline-start`,
  ).toBeGreaterThanOrEqual(measurement.scrollportInlineStart - GEOMETRY_TOLERANCE_PX);
  expect(
    markerPixels.markerRailInlineEnd,
    `${label} marker inside scrollport inline-end`,
  ).toBeLessThanOrEqual(measurement.scrollportInlineEnd + GEOMETRY_TOLERANCE_PX);

  if (measurement.lineNumberInlineStart !== null && measurement.lineNumberInlineEnd !== null) {
    expect(measurement.lineNumberRailSize, `${label} line-number rail size`).toBeGreaterThan(0);
    expect(measurement.lineNumberGap, `${label} line-number gap`).toBeGreaterThan(0);
    expectIntervalsNotToIntersect(
      markerPixels.markerRailInlineStart,
      markerPixels.markerRailInlineEnd,
      measurement.lineNumberInlineStart,
      measurement.lineNumberInlineEnd,
      `${label} marker rail/line-number rail overlap`,
    );
    expectIntervalsNotToIntersect(
      measurement.lineNumberInlineStart,
      measurement.lineNumberInlineEnd,
      measurement.codeTextInlineStart,
      measurement.codeTextInlineEnd,
      `${label} line-number rail/code text overlap`,
    );
  } else {
    expect(measurement.lineNumberRailSize, `${label} absent line-number rail`).toBeNull();
    expect(measurement.lineNumberGap, `${label} absent line-number gap`).toBeNull();
  }

  if (measurement.copyControlInlineStart !== null && measurement.copyControlInlineEnd !== null) {
    expectIntervalsNotToIntersect(
      markerPixels.markerRailInlineStart,
      markerPixels.markerRailInlineEnd,
      measurement.copyControlInlineStart,
      measurement.copyControlInlineEnd,
      `${label} marker rail/copy control overlap`,
    );
    if (
      measurement.copyControlBlockStart !== null &&
      measurement.copyControlBlockEnd !== null &&
      Math.min(measurement.codeTextBlockEnd, measurement.copyControlBlockEnd) -
        Math.max(measurement.codeTextBlockStart, measurement.copyControlBlockStart) >
        GEOMETRY_TOLERANCE_PX
    ) {
      expectIntervalsNotToIntersect(
        measurement.codeTextInlineStart,
        measurement.codeTextInlineEnd,
        measurement.copyControlInlineStart,
        measurement.copyControlInlineEnd,
        `${label} unplanned code text/copy control overlap`,
      );
    }
  }
};

const expectProductionMarkerShape = (
  markerPixels: MarkerPixelProbe,
  state: SelectionLineState,
  label: string,
): void => {
  if (state === 'normal') {
    expect(markerPixels.markerShapePixelCount, `${label} normal marker shape pixels`).toBe(0);
    return;
  }

  expect(
    markerPixels.markerShapePixelCount,
    `${label} production ${state} marker shape pixels`,
  ).toBeGreaterThan(0);
};

const expectStickyGeometry = (
  before: CodeLineStateGeometryMeasurement,
  sticky: CodeLineStateGeometryMeasurement,
  after: CodeLineStateGeometryMeasurement,
  beforePixels: MarkerPixelProbe,
  stickyPixels: MarkerPixelProbe,
  afterPixels: MarkerPixelProbe,
  state: SelectionLineState,
  label: string,
): void => {
  const evidence = JSON.stringify({
    tolerance: GEOMETRY_TOLERANCE_PX,
    before: {
      scrollLeft: before.scrollLeft,
      scrollport: [before.scrollportInlineStart, before.scrollportInlineEnd],
      markerRail: [beforePixels.markerRailInlineStart, beforePixels.markerRailInlineEnd],
      lineNumber:
        before.lineNumberInlineStart === null || before.lineNumberInlineEnd === null
          ? null
          : [before.lineNumberInlineStart, before.lineNumberInlineEnd],
    },
    sticky: {
      scrollLeft: sticky.scrollLeft,
      markerRail: [stickyPixels.markerRailInlineStart, stickyPixels.markerRailInlineEnd],
    },
    after: {
      scrollLeft: after.scrollLeft,
      markerRail: [afterPixels.markerRailInlineStart, afterPixels.markerRailInlineEnd],
    },
  });

  expectGeometryIntervals(before, beforePixels, `${label}/before-scroll ${evidence}`);
  expectGeometryIntervals(sticky, stickyPixels, `${label}/sticky-scroll ${evidence}`);
  expectGeometryIntervals(after, afterPixels, `${label}/end-scroll ${evidence}`);
  expectProductionMarkerShape(beforePixels, state, `${label}/before-scroll`);
  expectProductionMarkerShape(stickyPixels, state, `${label}/sticky-scroll`);
  expectProductionMarkerShape(afterPixels, state, `${label}/end-scroll`);

  expect(Math.abs(sticky.scrollLeft), `${label} sticky threshold scroll`).toBeGreaterThan(
    GEOMETRY_TOLERANCE_PX,
  );
  expect(Math.abs(after.scrollLeft), `${label} horizontal scroll`).toBeGreaterThan(
    Math.abs(sticky.scrollLeft) + GEOMETRY_TOLERANCE_PX,
  );

  expect(
    Math.abs(stickyPixels.markerRailInlineStart - sticky.scrollportInlineStart),
    `${label} sticky marker at scrollport inline-start ${evidence}`,
  ).toBeLessThanOrEqual(GEOMETRY_TOLERANCE_PX);
  expect(
    Math.abs(afterPixels.markerRailInlineStart - after.scrollportInlineStart),
    `${label} end marker at scrollport inline-start ${evidence}`,
  ).toBeLessThanOrEqual(GEOMETRY_TOLERANCE_PX);
  expect(
    Math.abs(afterPixels.markerRailInlineStart - stickyPixels.markerRailInlineStart),
    `${label} sticky marker viewport stability ${evidence}`,
  ).toBeLessThanOrEqual(GEOMETRY_TOLERANCE_PX);
  expect(
    Math.abs(afterPixels.markerRailInlineEnd - stickyPixels.markerRailInlineEnd),
    `${label} sticky marker viewport end stability ${evidence}`,
  ).toBeLessThanOrEqual(GEOMETRY_TOLERANCE_PX);

  if (before.lineNumberRailSize !== null && before.lineNumberGap !== null) {
    expect(
      Math.abs(
        beforePixels.markerRailInlineStart -
          before.scrollportInlineStart -
          (before.lineNumberRailSize + before.lineNumberGap),
      ),
      `${label} natural marker position after line-number rail ${evidence}`,
    ).toBeLessThanOrEqual(GEOMETRY_TOLERANCE_PX);
  } else {
    expect(
      Math.abs(beforePixels.markerRailInlineStart - before.scrollportInlineStart),
      `${label} marker starts at scrollport without line numbers ${evidence}`,
    ).toBeLessThanOrEqual(GEOMETRY_TOLERANCE_PX);
  }

  expect(
    Math.abs(after.codeTextAnchorInlineStart - before.codeTextAnchorInlineStart),
    `${label} code text scroll movement`,
  ).toBeGreaterThan(GEOMETRY_TOLERANCE_PX);
};

test('line state selection protocol remains stable across code surfaces', async ({
  browser,
}, testInfo) => {
  test.slow();
  const configuration = resolveCodeSelectionProtocolConfiguration(
    process.env,
    testInfo.project.name,
  );
  if (configuration.runKind === 'baseline' && testInfo.project.retries !== 0) {
    throw new Error('Code selection baseline runs require --retries=0.');
  }

  const records: CodeSelectionRecord[] = [];
  const markerColors = new Set<string>();
  const markerImages = new Map<SelectionLineState, string>();

  for (const fixture of CODE_SELECTION_FIXTURES) {
    const context = await browser.newContext({ javaScriptEnabled: fixture.requiresJavaScript });
    try {
      const page = await context.newPage();
      await page.goto(e2eNoteFixtures.code.directPath, { waitUntil: 'networkidle' });

      const pre = page.locator(`pre[data-code-block][data-code-filename="${fixture.filename}"]`);
      await expect(pre, `${fixture.surface} code block`).toHaveCount(1);
      await expect(pre, `${fixture.surface} code block visibility`).toBeVisible();
      await expect(pre).toHaveAttribute('data-code-has-line-state', 'true');

      if (fixture.surface === 'group-enhanced') {
        const panel = pre.locator('xpath=ancestor::section[@data-code-group-panel][1]');
        await expect(panel).toHaveAttribute('data-code-group-panel-active', 'true');
        await expect(panel.locator('xpath=parent::section[@data-code-group]')).toHaveAttribute(
          'data-code-group-enhanced',
          'true',
        );
      }
      if (fixture.surface === 'group-no-js') {
        const panel = pre.locator('xpath=ancestor::section[@data-code-group-panel][1]');
        await expect(panel.locator('xpath=parent::section[@data-code-group]')).not.toHaveAttribute(
          'data-code-group-enhanced',
          'true',
        );
      }

      const noStateBlock = page.locator(
        'pre[data-code-block][data-code-filename="contrast-typescript.tsx"]',
      );
      await expect(noStateBlock).not.toHaveAttribute('data-code-has-line-state', 'true');
      const statelessLine = noStateBlock.locator('.line').filter({ hasText: /\S/u }).first();
      const statelessDensity = await measureStatelessLineDensity(statelessLine);
      expect(statelessDensity.markerContent, `${fixture.surface} stateless marker`).toBe('none');
      expect(
        statelessDensity.markerPosition,
        `${fixture.surface} stateless marker position`,
      ).not.toBe('sticky');
      expect(
        statelessDensity.lineInlinePadding,
        `${fixture.surface} stateless line padding`,
      ).toBeLessThanOrEqual(GEOMETRY_TOLERANCE_PX);
      expect(
        Math.abs(statelessDensity.textOffsetFromLineStart),
        `${fixture.surface} stateless density`,
      ).toBeLessThanOrEqual(GEOMETRY_TOLERANCE_PX);

      const scrollGeometry = await pre.evaluate((element) => ({
        clientWidth: element.clientWidth,
        scrollWidth: element.scrollWidth,
      }));
      expect(scrollGeometry.scrollWidth, `${fixture.surface} horizontal overflow`).toBeGreaterThan(
        scrollGeometry.clientWidth,
      );

      const linePaddings = new Set<number>();
      for (const state of CODE_LINE_STATES) {
        const line = pre.locator(`[data-code-line-state="${state}"]`);
        await expect(line, `${fixture.surface}/${state} line`).toHaveCount(1);
        await expect(line, `${fixture.surface}/${state} visibility`).toBeVisible();
        const measurement = await measureLine(line);
        expect(measurement.markerPosition, `${fixture.surface}/${state} sticky marker`).toBe(
          'sticky',
        );
        expect(measurement.markerContent, `${fixture.surface}/${state} pseudo text`).toBe('""');
        expect(measurement.markerRailSize, `${fixture.surface}/${state} rail size`).toBeGreaterThan(
          0,
        );
        expect(measurement.markerGap, `${fixture.surface}/${state} rail gap`).toBeGreaterThan(0);
        expect(
          measurement.selectedText.length,
          `${fixture.surface}/${state} selection`,
        ).toBeGreaterThan(0);

        linePaddings.add(measurement.lineInlinePadding);
        markerColors.add(measurement.markerColor);
        if (state === 'normal') {
          expect(measurement.markerBackgroundImage, `${fixture.surface}/normal marker`).toBe(
            'none',
          );
        } else {
          expect(measurement.markerBackgroundImage, `${fixture.surface}/${state} shape`).not.toBe(
            'none',
          );
          markerImages.set(state, measurement.markerBackgroundImage);
        }
        if (fixture.surface === 'standalone') {
          expect(measurement.lineNumberContent, `standalone/${state} line number`).not.toBe('none');
        }

        const key = `${fixture.surface}/${state}/${fixture.filename}`;
        const record = createCodeSelectionRecord(key, measurement.selectedText);
        expect(record.containsStateLabel, `${key} state label selection`).toBe(false);

        if (state !== 'normal') {
          const wrappedMeasurement = await measureLine(line, NATIVE_STATE_WRAPPER_BY_STATE[state]);
          const wrappedRecord = createCodeSelectionRecord(key, wrappedMeasurement.selectedText);
          expect(wrappedMeasurement.selectedText, `${key} native wrapper selected text`).toBe(
            measurement.selectedText,
          );
          expect(wrappedRecord, `${key} native wrapper selection record`).toEqual(record);
        }

        records.push(record);
      }
      expect(linePaddings.size, `${fixture.surface} aligned code starts`).toBe(1);

      if (fixture.surface === 'standalone') {
        await setGeometryEnvironment(page, 'light', 1);
        await scrollToInlineStart(pre);
        await waitForGeometrySettle(page);

        if (testInfo.project.name === 'chromium-integration') {
          await page.emulateMedia({ forcedColors: 'active' });
          const forcedColorShapes = new Set<string>();
          const forcedColorForegrounds = new Set<string>();
          for (const state of ['highlight', 'add', 'remove'] as const) {
            const forcedColorStyle = await pre
              .locator(`[data-code-line-state="${state}"]`)
              .evaluate((line) => ({
                markerBackgroundImage: getComputedStyle(line, '::before').backgroundImage,
                markerColor: getComputedStyle(line, '::before').color,
              }));
            expect(
              forcedColorStyle.markerBackgroundImage,
              `forced-colors/${state} marker`,
            ).not.toBe('none');
            forcedColorShapes.add(forcedColorStyle.markerBackgroundImage);
            forcedColorForegrounds.add(forcedColorStyle.markerColor);
          }
          expect(forcedColorShapes.size, 'forced-colors shape distinction').toBe(3);
          expect(forcedColorForegrounds.size, 'forced-colors system foreground').toBe(1);
          await testInfo.attach('code-line-state-forced-colors', {
            body: await pre.screenshot(),
            contentType: 'image/png',
          });
          await page.emulateMedia({ forcedColors: 'none' });
        }

        await page.emulateMedia({ media: 'print' });
        for (const state of ['highlight', 'add', 'remove'] as const) {
          const printStyle = await pre
            .locator(`[data-code-line-state="${state}"]`)
            .evaluate((line) => ({
              lineBackground: getComputedStyle(line).backgroundColor,
              markerBackgroundImage: getComputedStyle(line, '::before').backgroundImage,
              markerColor: getComputedStyle(line, '::before').color,
            }));
          expect(printStyle.lineBackground, `print/${state} line background`).toBe(
            'rgba(0, 0, 0, 0)',
          );
          expect(printStyle.markerBackgroundImage, `print/${state} marker`).not.toBe('none');
          expect(printStyle.markerColor, `print/${state} marker color`).not.toBe('transparent');
        }
        if (testInfo.project.name === 'chromium-integration') {
          await testInfo.attach('code-line-state-print', {
            body: await pre.screenshot(),
            contentType: 'image/png',
          });
        }
        await page.emulateMedia({ media: 'screen' });
      }
    } finally {
      await context.close();
    }
  }

  const canonicalRecords = canonicalizeCodeSelectionRecords(records);
  expect(markerColors.size, 'neutral marker foreground').toBe(1);
  expect(new Set(markerImages.values()).size, 'dot/plus/minus shape distinction').toBe(3);

  if (configuration.runKind === 'baseline') {
    if (!configuration.artifactPath) throw new Error('Baseline artifact path is unavailable.');
    await writeCodeSelectionBaseline(
      configuration.artifactPath,
      configuration.project,
      canonicalRecords,
    );
  } else if (configuration.runKind === 'compare') {
    if (!configuration.artifactPath) throw new Error('Compare artifact path is unavailable.');
    await compareCodeSelectionBaseline(
      configuration.artifactPath,
      configuration.project,
      canonicalRecords,
    );
  }
});

test.describe('line state marker visual geometry', () => {
  for (const fixture of CODE_SELECTION_FIXTURES) {
    test(`${fixture.surface} keeps the sticky marker visually isolated across scroll and zoom`, async ({
      browser,
    }, testInfo) => {
      test.setTimeout(180_000);
      const configuration = resolveCodeSelectionProtocolConfiguration(
        process.env,
        testInfo.project.name,
      );
      test.skip(
        configuration.runKind !== 'standard',
        'Baseline and compare runs only collect selection protocol records.',
      );

      const context = await browser.newContext({ javaScriptEnabled: fixture.requiresJavaScript });
      try {
        const page = await context.newPage();
        await page.goto(e2eNoteFixtures.code.directPath, { waitUntil: 'load' });
        await installMarkerPixelProbeStyle(page);

        const pre = page.locator(`pre[data-code-block][data-code-filename="${fixture.filename}"]`);
        await expect(pre, `${fixture.surface} code block`).toHaveCount(1);
        await expect(pre, `${fixture.surface} code block visibility`).toBeVisible();
        await expect(pre).toHaveAttribute('data-code-has-line-state', 'true');

        const groupPanel = pre.locator('xpath=ancestor::section[@data-code-group-panel][1]');
        const group = groupPanel.locator('xpath=parent::section[@data-code-group]');
        if (fixture.surface === 'group-enhanced') {
          await expect(groupPanel).toHaveAttribute('data-code-group-panel-active', 'true');
          await expect(group).toHaveAttribute('data-code-group-enhanced', 'true');
        }
        if (fixture.surface === 'group-no-js') {
          await expect(group).not.toHaveAttribute('data-code-group-enhanced', 'true');
        }

        const noStateBlock = page.locator(
          'pre[data-code-block][data-code-filename="contrast-typescript.tsx"]',
        );
        await expect(noStateBlock).not.toHaveAttribute('data-code-has-line-state', 'true');
        const statelessLine = noStateBlock.locator('.line').filter({ hasText: /\S/u }).first();
        const statelessDensity = await measureStatelessLineDensity(statelessLine);
        expect(statelessDensity.markerContent, `${fixture.surface} stateless marker`).toBe('none');
        expect(
          statelessDensity.markerPosition,
          `${fixture.surface} stateless marker position`,
        ).not.toBe('sticky');
        expect(
          statelessDensity.lineInlinePadding,
          `${fixture.surface} stateless line padding`,
        ).toBeLessThanOrEqual(GEOMETRY_TOLERANCE_PX);
        expect(
          Math.abs(statelessDensity.textOffsetFromLineStart),
          `${fixture.surface} stateless density`,
        ).toBeLessThanOrEqual(GEOMETRY_TOLERANCE_PX);

        const scrollGeometry = await pre.evaluate((element) => ({
          clientWidth: element.clientWidth,
          scrollWidth: element.scrollWidth,
        }));
        expect(
          scrollGeometry.scrollWidth,
          `${fixture.surface} horizontal overflow`,
        ).toBeGreaterThan(scrollGeometry.clientWidth);

        const geometryThemes: readonly GeometryTheme[] =
          testInfo.project.name === 'chromium-integration' ? ['light', 'dark'] : ['light'];

        for (const theme of geometryThemes) {
          for (const zoom of GEOMETRY_ZOOM_FACTORS) {
            await setGeometryEnvironment(page, theme, zoom);
            await scrollToInlineStart(pre);
            await waitForGeometrySettle(page);

            const beforeMeasurements = new Map<SelectionLineState, LineMeasurement>();
            const beforePixels = new Map<SelectionLineState, MarkerPixelProbe>();
            const beforePixelSnapshot = await captureMarkerPixelSnapshot(pre);
            for (const state of CODE_LINE_STATES) {
              const line = pre.locator(`[data-code-line-state="${state}"]`);
              await expect(
                line,
                `${fixture.surface}/${theme}/${zoom.toString()}x/${state} visibility`,
              ).toBeVisible();
              const measurement = await measureLine(line);
              beforeMeasurements.set(state, measurement);
              beforePixels.set(
                state,
                await measureMarkerPixels(
                  beforePixelSnapshot,
                  line,
                  measurement.direction,
                  measurement.markerInlineOffset,
                ),
              );
            }

            const alignedTextStarts = [...beforeMeasurements.values()].map(
              (measurement) => measurement.codeTextAnchorInlineStart,
            );
            expect(
              Math.max(...alignedTextStarts) - Math.min(...alignedTextStarts),
              `${fixture.surface}/${theme}/${zoom.toString()}x normal/state code starts`,
            ).toBeLessThanOrEqual(GEOMETRY_TOLERANCE_PX);

            const referenceMeasurement = beforeMeasurements.get('normal');
            if (!referenceMeasurement) throw new Error('Missing normal line geometry.');
            const stickyThreshold =
              (referenceMeasurement.lineNumberRailSize ?? 0) +
              (referenceMeasurement.lineNumberGap ?? 0) +
              referenceMeasurement.markerRailSize;
            const maximumScrollDistance = scrollGeometry.scrollWidth - scrollGeometry.clientWidth;
            const stickyDistance = Math.min(
              Math.max(stickyThreshold + referenceMeasurement.markerGap, 1),
              Math.max(1, maximumScrollDistance / 2),
            );

            await scrollToInlineDistance(pre, stickyDistance);
            await waitForGeometrySettle(page);
            const stickyMeasurements = new Map<SelectionLineState, LineMeasurement>();
            const stickyPixels = new Map<SelectionLineState, MarkerPixelProbe>();
            const stickyPixelSnapshot = await captureMarkerPixelSnapshot(pre);
            for (const state of CODE_LINE_STATES) {
              const line = pre.locator(`[data-code-line-state="${state}"]`);
              const measurement = await measureLine(line);
              stickyMeasurements.set(state, measurement);
              stickyPixels.set(
                state,
                await measureMarkerPixels(
                  stickyPixelSnapshot,
                  line,
                  measurement.direction,
                  measurement.markerInlineOffset,
                ),
              );
            }

            await scrollToInlineEnd(pre);
            await waitForGeometrySettle(page);
            const scrolled = await pre.evaluate((element) => ({
              scrollLeft: element.scrollLeft,
              maxScrollDistance: element.scrollWidth - element.clientWidth,
            }));
            expect(
              Math.abs(scrolled.scrollLeft),
              `${fixture.surface}/${theme}/${zoom.toString()}x native horizontal scroll`,
            ).toBeGreaterThan(0);
            expect(
              scrolled.maxScrollDistance - Math.abs(scrolled.scrollLeft),
              `${fixture.surface}/${theme}/${zoom.toString()}x scroll end gutter`,
            ).toBeLessThanOrEqual(16);

            const afterPixelSnapshot = await captureMarkerPixelSnapshot(pre);
            for (const state of CODE_LINE_STATES) {
              const line = pre.locator(`[data-code-line-state="${state}"]`);
              const beforeMeasurement = beforeMeasurements.get(state);
              const stickyMeasurement = stickyMeasurements.get(state);
              const beforePixelProbe = beforePixels.get(state);
              const stickyPixelProbe = stickyPixels.get(state);
              if (
                !beforeMeasurement ||
                !stickyMeasurement ||
                !beforePixelProbe ||
                !stickyPixelProbe
              ) {
                throw new Error(`Missing staged geometry for state: ${state}.`);
              }
              const afterMeasurement = await measureLine(line);
              const afterPixelProbe = await measureMarkerPixels(
                afterPixelSnapshot,
                line,
                afterMeasurement.direction,
                afterMeasurement.markerInlineOffset,
              );
              expect(
                beforeMeasurement.copyControlInlineStart,
                `${fixture.surface}/${theme}/${zoom.toString()}x copy control`,
              ).not.toBeNull();
              expectStickyGeometry(
                beforeMeasurement,
                stickyMeasurement,
                afterMeasurement,
                beforePixelProbe,
                stickyPixelProbe,
                afterPixelProbe,
                state,
                `${fixture.surface}/${theme}/${zoom.toString()}x/${state}`,
              );
            }

            if (
              fixture.surface === 'standalone' &&
              theme === 'light' &&
              zoom !== 1 &&
              testInfo.project.name === 'chromium-integration'
            ) {
              await testInfo.attach(`code-line-state-zoom-${Math.round(zoom * 100)}`, {
                body: await pre.screenshot(),
                contentType: 'image/png',
              });
            }
          }
        }
      } finally {
        await context.close();
      }
    });
  }
});

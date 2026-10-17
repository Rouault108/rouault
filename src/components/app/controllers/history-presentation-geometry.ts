import {
  validateReadingPosition,
  type ReadingPosition,
} from '../navigation/reading-position-store.js';

const SOURCE_URL = '/notes/testing/reader-basic';
const TARGET_URL = '/notes/testing/toc-readable-long-heading';
const PROSE_ID = 'note-content-testing-toc-readable-long-heading';
const TOC_ID = 'toc-source-testing-toc-readable-long-heading';
const TOC_OWNER = 'toc-owner-testing-toc-readable-long-heading';
const TOLERANCE = 2;

export interface HistoryGeometryCheckpoint {
  readonly position: ReadingPosition;
  readonly shellLayoutKey: string;
  readonly anchorId: string;
  readonly anchorY: number;
  readonly text: string;
  readonly fontFingerprint: string;
  readonly viewport: string;
  readonly geometry: readonly number[];
  readonly headingIds: readonly string[];
}

export const isHistoryPresentationVerificationPair = (previousUrl: string, url: string): boolean =>
  [SOURCE_URL, `${SOURCE_URL}/`].includes(previousUrl) &&
  [TARGET_URL, `${TARGET_URL}/`].includes(url);

const visible = (element: HTMLElement): boolean => {
  const style = getComputedStyle(element);
  const rect = element.getBoundingClientRect();
  return (
    element.closest('[hidden], [inert]') === null &&
    element.getClientRects().length > 0 &&
    rect.width > 0 &&
    rect.height > 0 &&
    style.display !== 'none' &&
    style.visibility === 'visible' &&
    style.contentVisibility !== 'hidden' &&
    style.opacity === '1'
  );
};

const plainProse = (root: HTMLElement): HTMLElement | null => {
  const prose = root.querySelector<HTMLElement>(`.prose#${PROSE_ID}`);
  if (!prose || root.querySelectorAll('.prose').length !== 1 || !visible(prose)) return null;
  if (
    root.querySelector(
      'table, img, picture, pre, code, details, iframe, video, audio, canvas, object, embed, style, link, button, input, select, textarea, [data-copy-button], [data-copy-control]',
    )
  )
    return null;
  for (const element of [root, ...root.querySelectorAll('*')]) {
    const trigger = root.ownerDocument.querySelector(
      `[data-layout-header] [data-toc-trigger="true"][data-toc-runtime-id="${TOC_ID}"]`,
    );
    const activatedReservedToc =
      !element.hasAttribute('data-toc-trigger-reserved') &&
      element.matches(':defined') &&
      trigger?.getAttribute('data-toc-hydration-state') === 'hydrated' &&
      trigger.getAttribute('data-toc-trigger-interactive') === 'true';
    const reservedToc =
      element.localName === 'layout-toc-controller' &&
      (element.getAttribute('data-toc-trigger-reserved') === 'true' || activatedReservedToc) &&
      element.getAttribute('source-id') === TOC_ID &&
      element.getAttribute('toc-runtime-id') === TOC_ID &&
      element.getAttribute('toc-owner-id') === TOC_OWNER &&
      element.getAttribute('capabilities-json') ===
        '{"activeTracking":true,"dynamicScopes":false,"mobilePanel":true}' &&
      element.getAttribute('data-hydration-deferred') === 'toc-trigger' &&
      element.getAttribute('content-root-id') === PROSE_ID &&
      !element.hasAttribute('data-hydration-key') &&
      element.getAttribute('data-hydration-trigger') === 'initial' &&
      element.getAttribute('data-hydration-capability') === 'interactive';
    if (element.localName.includes('-') && !reservedToc) return null;
    if (
      element.localName === 'script' &&
      (element.getAttribute('type') !== 'application/json' ||
        element.getAttribute('data-hydration-marker') !== 'toc-source')
    )
      return null;
    const scope = element.getAttribute('data-hydration-scope');
    if (scope !== null && !['note-shell', 'note-content', 'note-toc'].includes(scope)) return null;
    const hasDirective = [
      'data-hydration-key',
      'data-hydration-trigger',
      'data-hydration-capability',
    ].some((attribute) => element.hasAttribute(attribute));
    if (!hasDirective || reservedToc) continue;
    if (
      element !== prose ||
      element.getAttribute('data-hydration-key') !== 'note-static-surface-enhancer' ||
      element.getAttribute('data-hydration-trigger') !== 'post-commit' ||
      element.getAttribute('data-hydration-capability') !== 'progressive'
    )
      return null;
  }
  // このfixtureの段落・見出し・静的permalinkだけを認め、未知の本文surfaceへ広げない。
  const tags = new Set(['p', 'h2', 'span', 'a', 'svg', 'g', 'path']);
  for (const element of prose.querySelectorAll('*')) {
    if (!tags.has(element.localName)) return null;
    if (
      element instanceof HTMLElement &&
      ['p', 'h2', 'span'].includes(element.localName) &&
      !visible(element)
    )
      return null;
    if (element.localName === 'a' && !element.matches('h2 > a[data-heading-permalink="true"]'))
      return null;
  }
  if (Array.from(prose.children).some((child) => !['p', 'h2'].includes(child.localName)))
    return null;
  return prose;
};

const fonts = (root: HTMLElement): string | null => {
  const owner = root.ownerDocument;
  if (owner.fonts.status !== 'loaded') return null;
  const fingerprint: string[][] = [];
  for (const element of [root, ...root.querySelectorAll<HTMLElement>('*')]) {
    if (!(element instanceof HTMLElement) || element.localName === 'script' || !visible(element))
      continue;
    const text = Array.from(element.childNodes)
      .filter((node) => node.nodeType === Node.TEXT_NODE)
      .map((node) => node.textContent ?? '')
      .join('')
      .trim();
    if (!text) continue;
    const style = getComputedStyle(element);
    const font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    if (!owner.fonts.check(font, text)) return null;
    if (element.closest('[data-layout-toc-root]')) {
      // 実target全12項目の400/500切替で本文・全見出し・range不変を別途実測した。
      // 初期active項目は比較から外すが、将来使う両weightの未loadは許可しない。
      if (
        !['400', '500'].every((weight) =>
          owner.fonts.check(
            `${style.fontStyle} ${weight} ${style.fontSize} ${style.fontFamily}`,
            text,
          ),
        )
      )
        return null;
      continue;
    }
    if (!element.closest('[data-article-header], .prose')) return null;
    fingerprint.push([
      text,
      font,
      style.getPropertyValue('font-stretch'),
      style.fontVariant,
      style.fontFeatureSettings,
      style.fontVariationSettings,
      style.fontKerning,
      style.fontOpticalSizing,
      style.lineHeight,
      style.letterSpacing,
      style.wordSpacing,
      style.textTransform,
    ]);
  }
  return fingerprint.length > 0 ? JSON.stringify(fingerprint) : null;
};

// 検証したdesktopの独立trackと高さ予約が崩れた場合、TOCのfont差分を除外しない。
const independentTocTrack = (root: HTMLElement): boolean => {
  const shell = root.querySelector<HTMLElement>('.note-shell');
  const toc = shell?.querySelector<HTMLElement>('[data-layout-toc-root]');
  if (!shell || toc?.parentElement !== shell || window.innerWidth < 1024) return false;
  const shellStyle = getComputedStyle(shell);
  const tocStyle = getComputedStyle(toc);
  const tracks = shellStyle.gridTemplateColumns.split(' ');
  const blockSize = parseFloat(tocStyle.blockSize);
  return (
    shellStyle.display === 'grid' &&
    tracks.length === 2 &&
    tracks.every((track) => track.endsWith('px') && parseFloat(track) > 0) &&
    Math.abs(parseFloat(tracks[1] ?? '') - 240) < 0.1 &&
    tocStyle.position === 'sticky' &&
    tocStyle.gridColumnStart === '2' &&
    tocStyle.alignSelf === 'start' &&
    tocStyle.minInlineSize === '0px' &&
    tocStyle.overflowX === 'hidden' &&
    tocStyle.overflowY === 'hidden' &&
    Number.isFinite(blockSize) &&
    blockSize > 0 &&
    Math.abs(blockSize - parseFloat(tocStyle.maxBlockSize)) < 0.1
  );
};

const rectangle = (element: Element): number[] => {
  const rect = element.getBoundingClientRect();
  return [rect.left + window.scrollX, rect.top + window.scrollY, rect.width, rect.height];
};

export const captureHistoryGeometry = (
  root: HTMLElement,
  position: ReadingPosition,
  shellLayoutKey: string,
): HistoryGeometryCheckpoint | null => {
  try {
    if (
      !root.matches('main#main-content') ||
      !root.isConnected ||
      !visible(root) ||
      !shellLayoutKey ||
      ![TARGET_URL, `${TARGET_URL}/`].includes(position.url) ||
      `${location.pathname}${location.search}${location.hash}` !== position.url ||
      !validateReadingPosition(position, position.url)
    )
      return null;
    for (let ancestor = root.parentElement; ancestor; ancestor = ancestor.parentElement) {
      const style = getComputedStyle(ancestor);
      if (style.opacity !== '1' || style.contentVisibility === 'hidden') return null;
    }
    const prose = plainProse(root);
    if (!prose || !independentTocTrack(root)) return null;
    const headings = Array.from(prose.querySelectorAll<HTMLHeadingElement>('h2[id]'));
    const headingIds = headings.map((heading) => heading.id);
    if (headings.length !== 12 || new Set(headingIds).size !== 12 || headingIds.some((id) => !id))
      return null;
    const scrolling = root.ownerDocument.scrollingElement;
    if (!scrolling) return null;
    const rangeX = Math.max(0, scrolling.scrollWidth - scrolling.clientWidth);
    const rangeY = Math.max(0, scrolling.scrollHeight - scrolling.clientHeight);
    // 一時的な高さ不足へのclampを、保存位置の適用成功として扱わない。
    if (position.x > rangeX || position.y > rangeY) return null;
    const fontFingerprint = fonts(root);
    if (!fontFingerprint) return null;
    const anchor = headings.reduce((nearest, heading) =>
      Math.abs(heading.getBoundingClientRect().top + window.scrollY - position.y) <
      Math.abs(nearest.getBoundingClientRect().top + window.scrollY - position.y)
        ? heading
        : nearest,
    );
    const anchorY = anchor.getBoundingClientRect().top + window.scrollY;
    if (Math.abs(anchorY - position.y) > window.innerHeight) return null;
    const viewport = JSON.stringify([
      window.innerWidth,
      window.innerHeight,
      window.devicePixelRatio,
      scrolling.clientWidth,
      scrolling.clientHeight,
      ...(window.visualViewport
        ? [window.visualViewport.width, window.visualViewport.height, window.visualViewport.scale]
        : [window.innerWidth, window.innerHeight, 1]),
    ]);
    const geometry = [
      rangeX,
      rangeY,
      ...rectangle(root),
      ...rectangle(prose),
      ...headings.flatMap(rectangle),
    ];
    if (geometry.some((value) => !Number.isFinite(value))) return null;
    return {
      position: { ...position },
      shellLayoutKey,
      anchorId: anchor.id,
      anchorY,
      text: prose.textContent,
      fontFingerprint,
      viewport,
      geometry,
      headingIds,
    };
  } catch {
    // font APIや測定に失敗した経路は、既存の復元へ演出なしで返す。
    return null;
  }
};

export const matchesHistoryGeometry = (
  root: HTMLElement,
  checkpoint: HistoryGeometryCheckpoint,
  shellLayoutKey: string,
): boolean => {
  const current = captureHistoryGeometry(root, checkpoint.position, shellLayoutKey);
  return (
    current !== null &&
    current.shellLayoutKey === checkpoint.shellLayoutKey &&
    current.anchorId === checkpoint.anchorId &&
    Math.abs(current.anchorY - checkpoint.anchorY) <= TOLERANCE &&
    current.viewport === checkpoint.viewport &&
    current.text === checkpoint.text &&
    current.fontFingerprint === checkpoint.fontFingerprint &&
    current.headingIds.join('\n') === checkpoint.headingIds.join('\n') &&
    current.geometry.length === checkpoint.geometry.length &&
    current.geometry.every(
      (value, index) => Math.abs(value - (checkpoint.geometry[index] ?? Infinity)) <= TOLERANCE,
    )
  );
};

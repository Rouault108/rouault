import { readContentContext } from '../../../navigation/content-navigation-context.js';
import {
  validateReadingPosition,
  type ReadingPosition,
} from '../navigation/reading-position-store.js';

const TOLERANCE = 2;

export interface HistoryGeometrySource {
  readonly entryId: string;
  readonly contentEpoch: number;
}

export interface HistoryGeometryCheckpoint {
  readonly position: ReadingPosition;
  readonly shellLayoutKey: string;
  readonly anchorId: string;
  readonly anchorPath: readonly number[];
  readonly anchorY: number;
  readonly text: string;
  readonly structure: string;
  readonly fontFingerprint: string;
  readonly viewport: string;
  readonly geometry: readonly number[];
  readonly headingIds: readonly string[];
}

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

// triggerの位置ではなくroot全体を調べ、広域mutationを持つ未知enhancerは許可しない。
const staticSurface = (root: HTMLElement): boolean => {
  if (
    root.querySelector(
      'table, pre, code, details, iframe, video, audio, canvas, object, embed, style, link, picture, [data-copy-button], [data-copy-control]',
    )
  )
    return false;
  for (const element of [root, ...root.querySelectorAll('*')]) {
    const toc = element.localName === 'layout-toc-controller';
    if (element.localName.includes('-') && !toc) return false;
    if (toc) {
      const sourceId = element.getAttribute('source-id');
      const contentId = element.getAttribute('content-root-id');
      const source = sourceId ? root.ownerDocument.getElementById(sourceId) : null;
      const content = contentId ? root.ownerDocument.getElementById(contentId) : null;
      const trigger = Array.from(
        root.ownerDocument.querySelectorAll('[data-layout-header] [data-toc-trigger="true"]'),
      ).find((item) => item.getAttribute('data-toc-runtime-id') === sourceId);
      const reserved = element.getAttribute('data-toc-trigger-reserved') === 'true';
      const activated =
        element.matches(':defined') &&
        trigger?.getAttribute('data-toc-hydration-state') === 'hydrated' &&
        trigger.getAttribute('data-toc-trigger-interactive') === 'true';
      let capabilities: unknown;
      try {
        capabilities = JSON.parse(element.getAttribute('capabilities-json') ?? 'null');
      } catch {
        return false;
      }
      if (
        !sourceId ||
        !contentId ||
        !source ||
        !root.contains(source) ||
        !source.matches('script[type="application/json"][data-hydration-marker="toc-source"]') ||
        !content ||
        !root.contains(content) ||
        element.getAttribute('toc-runtime-id') !== sourceId ||
        !element.getAttribute('toc-owner-id') ||
        (!reserved && !activated) ||
        !capabilities ||
        typeof capabilities !== 'object' ||
        !('dynamicScopes' in capabilities) ||
        capabilities.dynamicScopes !== false ||
        !('activeTracking' in capabilities) ||
        typeof capabilities.activeTracking !== 'boolean' ||
        !('mobilePanel' in capabilities) ||
        typeof capabilities.mobilePanel !== 'boolean' ||
        element.getAttribute('data-hydration-deferred') !== 'toc-trigger' ||
        element.getAttribute('data-hydration-trigger') !== 'initial' ||
        element.getAttribute('data-hydration-capability') !== 'interactive' ||
        element.hasAttribute('data-hydration-key')
      )
        return false;
    }
    if (
      element.localName === 'script' &&
      (element.getAttribute('type') !== 'application/json' ||
        element.getAttribute('data-hydration-marker') !== 'toc-source')
    )
      return false;
    const scope = element.getAttribute('data-hydration-scope');
    if (scope !== null && !['note-shell', 'note-content', 'note-toc'].includes(scope)) return false;
    const hasDirective = [
      'data-hydration-key',
      'data-hydration-trigger',
      'data-hydration-capability',
    ].some((attribute) => element.hasAttribute(attribute));
    if (!hasDirective || toc) continue;
    // このenhancerはtableなしの場合、copy listenerの登録だけで本文を組み替えない。
    if (
      !element.matches('.prose[data-note-static-surface="true"]') ||
      element.getAttribute('data-hydration-key') !== 'note-static-surface-enhancer' ||
      element.getAttribute('data-hydration-trigger') !== 'post-commit' ||
      element.getAttribute('data-hydration-capability') !== 'progressive'
    )
      return false;
  }
  // 読込完了し寸法属性と実used boxを持つ画像だけ。後発enhancerは上のroot検査で拒否する。
  return Array.from(root.querySelectorAll('img')).every(
    (image) =>
      image.complete &&
      image.naturalWidth > 0 &&
      image.naturalHeight > 0 &&
      image.width > 0 &&
      image.height > 0 &&
      Number(image.getAttribute('width')) > 0 &&
      Number(image.getAttribute('height')) > 0 &&
      visible(image),
  );
};

// 旧本文が表示中に使う字体を準備する。位置job/commitからはawaitせず、DOMは変更しない。
export const prepareHistoryFonts = async (
  root: HTMLElement,
  signal: AbortSignal,
): Promise<boolean> => {
  const owner = root.ownerDocument;
  let timer: number | undefined;
  let abort = (): void => {
    /* 待機開始前には解放対象がない。 */
  };
  try {
    if (
      signal.aborted ||
      root.querySelectorAll('*').length > 2000 ||
      root.textContent.length > 128_000 ||
      !staticSurface(root)
    )
      return false;
    const samples = new Map<string, Set<string>>();
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
      const texts = samples.get(font) ?? new Set<string>();
      texts.add(text);
      samples.set(font, texts);
    }
    const loads = Array.from(samples, ([font, texts]) => {
      const text = Array.from(texts).join('');
      return owner.fonts.check(font, text) ? Promise.resolve([]) : owner.fonts.load(font, text);
    });
    const prepared = Promise.all(loads)
      .then(() => owner.fonts.ready)
      .then(() => true);
    const stopped = new Promise<false>((resolve) => {
      abort = () => {
        resolve(false);
      };
      signal.addEventListener('abort', abort, { once: true });
      timer = window.setTimeout(abort, 1000);
    });
    return await Promise.race([prepared, stopped]);
  } catch {
    return false;
  } finally {
    if (timer !== undefined) clearTimeout(timer);
    signal.removeEventListener('abort', abort);
  }
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
      // 独立track内のactive表示だけを比較から外し、使用し得る両weightを確認する。
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

const resolveTocTrackPixels = (root: HTMLElement, token: string): number | null => {
  const fixed = /^(\d+(?:\.\d+)?)px$/u.exec(token.trim());
  if (fixed) {
    const pixels = Number(fixed[1]);
    return Number.isFinite(pixels) && pixels > 0 ? pixels : null;
  }
  // 現行tokenのviewport可変幅を解決し、intrinsic幅や未知の式へ独立性の証明を広げない。
  const clamp =
    /^clamp\(\s*(\d+(?:\.\d+)?)rem\s*,\s*(\d+(?:\.\d+)?)vw\s*,\s*(\d+(?:\.\d+)?)rem\s*\)$/u.exec(
      token.trim(),
    );
  if (!clamp) return null;
  const font = /^(\d+(?:\.\d+)?)px$/u.exec(
    getComputedStyle(root.ownerDocument.documentElement).fontSize.trim(),
  );
  const minimum = Number(clamp[1]);
  const preferred = Number(clamp[2]);
  const maximum = Number(clamp[3]);
  const fontSize = font ? Number(font[1]) : NaN;
  const viewportWidth = root.ownerDocument.defaultView?.innerWidth ?? NaN;
  if (
    ![minimum, preferred, maximum, fontSize, viewportWidth].every(
      (value) => Number.isFinite(value) && value > 0,
    ) ||
    minimum > maximum
  )
    return null;
  const pixels = Math.max(
    minimum * fontSize,
    Math.min((preferred * viewportWidth) / 100, maximum * fontSize),
  );
  return Number.isFinite(pixels) && pixels > 0 ? pixels : null;
};

// 宣言済みの独立trackと高さ予約が崩れた場合、TOCのfont差分を除外しない。
const independentTocTrack = (root: HTMLElement): boolean => {
  const shell = root.querySelector<HTMLElement>('.note-shell');
  const toc = shell?.querySelector<HTMLElement>('[data-layout-toc-root]');
  if (!shell || toc?.parentElement !== shell) return false;
  const shellStyle = getComputedStyle(shell);
  const tocStyle = getComputedStyle(toc);
  const tracks = shellStyle.gridTemplateColumns.split(' ');
  if (window.innerWidth < 640) {
    // mobile panelはbody配下の別ownerなので、非占有の本文側TOCだけで閉状態を推測しない。
    const panelsClosed = Array.from(
      root.ownerDocument.querySelectorAll('[data-layout-toc-mobile-panel]'),
    ).every(
      (panel) =>
        panel.matches('[hidden][inert][aria-hidden="true"]') &&
        panel.getBoundingClientRect().width === 0 &&
        panel.getBoundingClientRect().height === 0,
    );
    return (
      panelsClosed &&
      shellStyle.display === 'grid' &&
      tracks.length === 1 &&
      tracks.every((track) => /^\d+(?:\.\d+)?px$/u.test(track) && parseFloat(track) > 0) &&
      tocStyle.position === 'static' &&
      toc.getBoundingClientRect().height === 0 &&
      Array.from(toc.querySelectorAll('*')).every(
        (element) =>
          element.getBoundingClientRect().height === 0 &&
          element.getBoundingClientRect().width === 0,
      )
    );
  }
  if (window.innerWidth < 1024) return false;
  const declaredTrack = resolveTocTrackPixels(
    root,
    shellStyle.getPropertyValue('--note-toc-track'),
  );
  const blockSize = parseFloat(tocStyle.blockSize);
  return (
    shellStyle.display === 'grid' &&
    tracks.length === 2 &&
    tracks.every((track) => track.endsWith('px') && parseFloat(track) > 0) &&
    declaredTrack !== null &&
    Math.abs(parseFloat(tracks[1] ?? '') - declaredTrack) < 0.1 &&
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
const pathTo = (root: HTMLElement, element: HTMLElement): number[] => {
  const path: number[] = [];
  let current: Element = element;
  while (current !== root) {
    const parent = current.parentElement;
    if (!parent) return [];
    path.unshift(Array.from(parent.children).indexOf(current));
    current = parent;
  }
  return path;
};
export const readHistoryGeometryAnchor = (
  root: HTMLElement,
  checkpoint: HistoryGeometryCheckpoint,
): HTMLElement | null => {
  let element: Element = root;
  for (const index of checkpoint.anchorPath) {
    const child = element.children.item(index);
    if (!child) return null;
    element = child;
  }
  return element instanceof HTMLElement && element.id === checkpoint.anchorId ? element : null;
};

export const captureHistoryGeometry = (
  root: HTMLElement,
  position: ReadingPosition,
  shellLayoutKey: string,
  source?: HistoryGeometrySource,
): HistoryGeometryCheckpoint | null => {
  try {
    const context = source ? readContentContext() : null;
    const displayedSource =
      source &&
      context?.root === root &&
      context.contentEpoch === source.contentEpoch &&
      !context.mutation &&
      !context.recoveryRequired &&
      context.displayedBinding.entryId === source.entryId &&
      context.displayedBinding.url === position.url;
    // 証跡作成の仕事量を制限し、巨大surfaceは座標復元だけへ返す。
    if (root.querySelectorAll('*').length > 2000 || root.textContent.length > 128_000) return null;
    if (
      !root.matches('main#main-content') ||
      !root.isConnected ||
      !visible(root) ||
      !shellLayoutKey ||
      (source
        ? !displayedSource
        : `${location.pathname}${location.search}${location.hash}` !== position.url) ||
      !validateReadingPosition(position, position.url)
    )
      return null;
    for (let ancestor = root.parentElement; ancestor; ancestor = ancestor.parentElement) {
      const style = getComputedStyle(ancestor);
      if (style.opacity !== '1' || style.contentVisibility === 'hidden') return null;
    }
    if (!staticSurface(root)) return null;
    const toc = root.querySelector('[data-layout-toc-root]');
    if (toc && !independentTocTrack(root)) return null;
    // 検証済み独立TOCの既存color transitionは本文幾何を変えない。未知animationへ広げない。
    const tocColorOnly = (animation: Animation): boolean => {
      const target = animation.effect instanceof KeyframeEffect ? animation.effect.target : null;
      return (
        typeof CSSTransition !== 'undefined' &&
        animation instanceof CSSTransition &&
        animation.transitionProperty === 'color' &&
        target instanceof HTMLElement &&
        target.matches('.layout-toc__link') &&
        toc?.contains(target) === true
      );
    };
    const unverifiedAnimation = (animation: Animation): boolean =>
      (animation.pending || !['finished', 'idle'].includes(animation.playState)) &&
      !tocColorOnly(animation);
    // 後続の幾何変更を分類できないanimationは、たまたま座標が一致しても許可しない。
    const moving = (element: Element): boolean => element.getAnimations().some(unverifiedAnimation);
    if (
      root.querySelector('animate, animateMotion, animateTransform, set') ||
      root.getAnimations({ subtree: true }).some(unverifiedAnimation)
    )
      return null;
    for (let ancestor = root.parentElement; ancestor; ancestor = ancestor.parentElement)
      if (moving(ancestor)) return null;
    const scrolling = root.ownerDocument.scrollingElement;
    if (!scrolling) return null;
    const rangeX = Math.max(0, scrolling.scrollWidth - scrolling.clientWidth);
    const rangeY = Math.max(0, scrolling.scrollHeight - scrolling.clientHeight);
    if (position.x > rangeX || position.y > rangeY) return null;
    const fontFingerprint = fonts(root);
    if (!fontFingerprint) return null;
    const elements = [root, ...root.querySelectorAll<HTMLElement>('*')].filter(
      (element) =>
        element instanceof HTMLElement &&
        element.localName !== 'script' &&
        element.closest('[data-layout-toc-root]') === null &&
        visible(element),
    );
    const headings = elements.filter((element) => /^h[1-6]$/u.test(element.localName));
    const anchors =
      headings.length > 0
        ? headings
        : elements.filter((element) =>
            ['p', 'li', 'dt', 'dd', 'section', 'article', 'header', 'main'].includes(
              element.localName,
            ),
          );
    const anchor = (anchors.length > 0 ? anchors : [root]).reduce((nearest, element) =>
      Math.abs(element.getBoundingClientRect().top + window.scrollY - position.y) <
      Math.abs(nearest.getBoundingClientRect().top + window.scrollY - position.y)
        ? element
        : nearest,
    );
    const anchorY = anchor.getBoundingClientRect().top + window.scrollY;
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
    const geometry = [rangeX, rangeY, ...elements.flatMap(rectangle)];
    if (geometry.some((value) => !Number.isFinite(value))) return null;
    const structure = JSON.stringify(
      elements.map((element) => [
        element.localName,
        element.id,
        element.className,
        element.getAttribute('href'),
        element.getAttribute('src'),
        element instanceof HTMLImageElement
          ? [element.currentSrc, element.naturalWidth, element.naturalHeight]
          : null,
      ]),
    );
    return {
      position: { ...position },
      shellLayoutKey,
      anchorId: anchor.id,
      anchorPath: pathTo(root, anchor),
      anchorY,
      text: root.textContent,
      structure,
      fontFingerprint,
      viewport,
      geometry,
      headingIds: headings.map((element) => element.id).filter(Boolean),
    };
  } catch {
    // 測定失敗は表示の不適格であり、保存座標と通常復元を失敗にしない。
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
    current.anchorPath.join(':') === checkpoint.anchorPath.join(':') &&
    Math.abs(current.anchorY - checkpoint.anchorY) <= TOLERANCE &&
    current.viewport === checkpoint.viewport &&
    current.text === checkpoint.text &&
    current.structure === checkpoint.structure &&
    current.fontFingerprint === checkpoint.fontFingerprint &&
    current.headingIds.join('\n') === checkpoint.headingIds.join('\n') &&
    current.geometry.length === checkpoint.geometry.length &&
    current.geometry.every(
      (value, index) => Math.abs(value - (checkpoint.geometry[index] ?? Infinity)) <= TOLERANCE,
    )
  );
};

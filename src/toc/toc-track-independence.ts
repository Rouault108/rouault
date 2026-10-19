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
export const independentTocTrack = (root: HTMLElement): boolean => {
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

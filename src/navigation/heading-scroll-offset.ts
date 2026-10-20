export const readComputedPx = (value: string): number => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
};

export const resolveHeadingScrollOffset = (padding: string, margin: string) => {
  const scrollPaddingTop = readComputedPx(padding);
  const scrollMarginTop = readComputedPx(margin);
  return { scrollPaddingTop, scrollMarginTop, offset: scrollPaddingTop + scrollMarginTop };
};

export const readHeadingScrollOffset = (target: HTMLElement) => {
  const document = target.ownerDocument;
  const view = document.defaultView;
  // hashとTOCの位置ownerは、同じCSS上の停止線を読み、個別のheader補正を重ねない。
  return resolveHeadingScrollOffset(
    view?.getComputedStyle(document.documentElement).scrollPaddingTop ?? '',
    view?.getComputedStyle(target).scrollMarginTop ?? '',
  );
};

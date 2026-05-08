export const MAIN_CONTENT_ID = 'main-content';
export const MAIN_CONTENT_TABINDEX = '-1';
export const createMainContentSelector = (): string => {
  const escape =
    typeof CSS !== 'undefined' && typeof CSS.escape === 'function'
      ? CSS.escape
      : (value: string): string => value.replace(/"/g, '\\"');
  return `main#${escape(MAIN_CONTENT_ID)}`;
};
export const MAIN_CONTENT_SELECTOR = `main#${MAIN_CONTENT_ID}`;

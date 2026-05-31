export const SEARCH_DEBOUNCE_MS = 150;
export const SEARCH_DIALOG_LOADING_INDICATOR_DELAY_MS = 400;
export const BODY_SEARCH_DIALOG_OPEN_ATTRIBUTE = 'data-ui-search-dialog-open';
export const VIRTUALIZATION_THRESHOLD = 100;
export const VIRTUAL_ROW_HEIGHT_PX = 48;
export const VIRTUAL_OVERSCAN = 6;
export const SEARCH_DIALOG_HIGHLIGHT_SELECTOR = ':where(mark[data-highlight])';
export const SEARCH_DIALOG_STATUS_IDLE_MESSAGE = 'キーワードを入力して検索できます。';
export const SEARCH_DIALOG_STATUS_LOADING_MESSAGE = '検索しています...';
export const SEARCH_DIALOG_STATUS_ERROR_FALLBACK_MESSAGE = '検索の読み込みに失敗しました。';
export const SEARCH_DIALOG_STATUS_EMPTY_MESSAGE = '一致する結果はありません。';
export const createSearchDialogResultsStatusMessage = (count: number): string =>
  `${count.toString()} 件の結果が見つかりました`;

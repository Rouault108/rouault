export type SearchBootstrapUnavailableReason =
  | 'route-manifest-unavailable'
  | 'route-manifest-invalid'
  | 'route-manifest-stale'
  | 'search-runtime-unavailable';

export const getSearchBootstrapUnavailableMessage = (
  reason: SearchBootstrapUnavailableReason,
): string => {
  switch (reason) {
    case 'route-manifest-unavailable':
      return '検索に必要なルート情報を読み込めませんでした。通常リンクはそのまま利用できます。';
    case 'route-manifest-invalid':
      return '検索に必要なルート情報が現在のページと一致しません。通常リンクはそのまま利用できます。';
    case 'route-manifest-stale':
      return '検索に必要なルート情報が古くなっています。ページを更新すると回復する場合があります。';
    case 'search-runtime-unavailable':
      return '検索ランタイムを起動できませんでした。通常リンクはそのまま利用できます。';
  }
};

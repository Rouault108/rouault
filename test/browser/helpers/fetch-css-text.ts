const CSS_MEDIA_TYPE = 'text/css';

const getMediaType = (contentType: string | null): string =>
  (contentType ?? '').split(';', 1)[0]?.trim().toLowerCase() ?? '';

export async function fetchCssText(href: string | URL): Promise<string> {
  const url = href instanceof URL ? href.href : href;
  const response = await fetch(url, {
    headers: {
      Accept: CSS_MEDIA_TYPE,
    },
  });

  if (!response.ok) {
    throw new Error(`${url} の読み込みに失敗しました: ${response.status} ${response.statusText}`);
  }

  const contentType = response.headers.get('content-type');
  if (getMediaType(contentType) !== CSS_MEDIA_TYPE) {
    throw new Error(
      `${url} がCSSとして返されませんでした: ${contentType ?? 'unknown content type'}`,
    );
  }

  return await response.text();
}

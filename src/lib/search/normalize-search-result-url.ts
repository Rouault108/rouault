function hasProtocol(value: string): boolean {
  return /^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(value);
}

export function normalizeSearchResultUrl(value: string): string {
  const raw = value.trim();
  if (raw.length === 0) {
    return '';
  }

  try {
    const url = new URL(raw, 'https://example.invalid');

    if (url.pathname !== '/' && url.pathname.endsWith('/')) {
      url.pathname = url.pathname.slice(0, -1);
    }

    const normalized = `${url.pathname}${url.search}${url.hash}`;
    return hasProtocol(raw) ? `${url.origin}${normalized}` : normalized;
  } catch {
    if (raw === '/') {
      return raw;
    }

    return raw.endsWith('/') ? raw.slice(0, -1) : raw;
  }
}

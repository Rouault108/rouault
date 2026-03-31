const NOTE_ROOT_PATH = '/notes';

const normalizeNoteNavigationPathname = (pathname: string): string => {
  if (pathname === `${NOTE_ROOT_PATH}/`) {
    return NOTE_ROOT_PATH;
  }

  if (!pathname.startsWith(`${NOTE_ROOT_PATH}/`)) {
    return pathname;
  }

  const trimmed = pathname.replace(/\/+$/u, '');
  return trimmed.length > 0 ? trimmed : NOTE_ROOT_PATH;
};

export const normalizeNoteNavigationUrl = (input: string): string => {
  const url = new URL(input, 'http://localhost');
  const pathname = normalizeNoteNavigationPathname(url.pathname);
  return `${pathname}${url.search}${url.hash}`;
};

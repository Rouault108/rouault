export const SITE_TITLE = 'Rouault';

const DOCUMENT_TITLE_SEPARATOR = ' - ';
const SITE_TITLE_SUFFIX = `${DOCUMENT_TITLE_SEPARATOR}${SITE_TITLE}`;

export const buildDocumentTitle = (pageTitle: string | null | undefined): string => {
  let baseTitle = pageTitle?.trim() ?? '';

  while (baseTitle.endsWith(SITE_TITLE_SUFFIX)) {
    baseTitle = baseTitle.slice(0, -SITE_TITLE_SUFFIX.length).trim();
  }

  if (baseTitle.length === 0 || baseTitle === SITE_TITLE) {
    return SITE_TITLE;
  }

  return `${baseTitle}${SITE_TITLE_SUFFIX}`;
};

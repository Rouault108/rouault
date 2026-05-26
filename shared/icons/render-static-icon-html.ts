import { resolveStaticIconBody, STATIC_ICON_VIEWBOX, type IconName } from './icon-paths.js';

const escapeAttribute = (value: string): string =>
  value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');

export const renderStaticIconHtml = (name: IconName, className = 'static-icon'): string => {
  const classes = className.split(/\s+/u).filter((item) => item.length > 0);
  const classAttribute = escapeAttribute(
    classes.includes('static-icon') ? classes.join(' ') : [...classes, 'static-icon'].join(' '),
  );
  return `<span class="${classAttribute}" aria-hidden="true"><svg viewBox="${STATIC_ICON_VIEWBOX}" aria-hidden="true" focusable="false" data-icon="${escapeAttribute(
    name,
  )}">${resolveStaticIconBody(name)}</svg></span>`;
};

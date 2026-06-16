import { resolveStaticIconBody, STATIC_ICON_VIEWBOX, type IconName } from './icon-paths.js';

export interface StaticIconHtmlOptions {
  className?: string;
  label?: string;
}

const escapeAttribute = (value: string): string =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');

const resolveClassAttribute = (className: string | undefined): string => {
  const classes = Array.from(
    new Set((className ?? '').split(/\s+/u).filter((item) => item.length > 0)),
  );

  return escapeAttribute(
    classes.includes('static-icon') ? classes.join(' ') : [...classes, 'static-icon'].join(' '),
  );
};

export const renderStaticIconHtml = (
  name: IconName,
  classNameOrOptions: string | StaticIconHtmlOptions = 'static-icon',
): string => {
  const options =
    typeof classNameOrOptions === 'string' ? { className: classNameOrOptions } : classNameOrOptions;
  const label = typeof options.label === 'string' ? options.label.trim() : '';
  const classAttribute = resolveClassAttribute(options.className ?? 'static-icon');
  const wrapperAccessibility =
    label.length > 0 ? ` role="img" aria-label="${escapeAttribute(label)}"` : ' aria-hidden="true"';

  return `<span class="${classAttribute}"${wrapperAccessibility}><svg viewBox="${STATIC_ICON_VIEWBOX}" aria-hidden="true" focusable="false" data-icon="${escapeAttribute(
    name,
  )}">${resolveStaticIconBody(name)}</svg></span>`;
};

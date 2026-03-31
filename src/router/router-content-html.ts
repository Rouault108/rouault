const ROUTER_CONTENT_HTML_BRAND: unique symbol = Symbol('RouterContentHtml');

export type RouterContentHtml = string & {
  readonly [ROUTER_CONTENT_HTML_BRAND]: 'RouterContentHtml';
};

export const createRouterContentHtml = (value: string): RouterContentHtml =>
  value as RouterContentHtml;

export const unwrapRouterContentHtml = (value: RouterContentHtml): string => value;
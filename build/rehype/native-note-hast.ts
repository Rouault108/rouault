import type { HastNode, HastProperties } from './hast-utils.js';

export const nativeElement = (
  tagName: string,
  properties: HastProperties = {},
  children: HastNode[] = [],
): HastNode => ({ type: 'element', tagName, properties, children });

export const nativeText = (value: string): HastNode => ({ type: 'text', value });

export const stringProperty = (node: HastNode, name: string): string => {
  const value = node.properties?.[name];
  return typeof value === 'string' ? value : '';
};

export const booleanProperty = (node: HastNode, name: string): boolean => {
  const value = node.properties?.[name];
  return value === true || value === '' || value === 'true' || value === 1;
};

export const enhancerProperties = (
  key: string,
  trigger: 'initial' | 'visible' | 'interaction',
  capability: 'interactive' | 'sandboxed' = 'interactive',
): HastProperties => ({
  'data-hydration-key': key,
  'data-hydration-capability': capability,
  'data-hydration-trigger': trigger,
});

export const nativeRootProperties = (node: HastNode): HastProperties =>
  Object.fromEntries(
    Object.entries(node.properties ?? {}).filter(([name]) =>
      [
        'id',
        'className',
        'class',
        'lang',
        'dir',
        'title',
        'style',
        'slot',
        'data-toc-scope',
      ].includes(name),
    ),
  );

import { parse, type DefaultTreeAdapterTypes } from 'parse5';
import type { SearchCanonicalPathname } from '../../shared/search/document-url.js';
import type { SearchPassage } from '../../shared/search/search-projection.js';

type Node = DefaultTreeAdapterTypes.Node;
type Element = DefaultTreeAdapterTypes.Element;

const excludedTags = new Set([
  'script',
  'style',
  'template',
  'button',
  'input',
  'select',
  'textarea',
]);
const primitiveTags = new Set(['p', 'ul', 'ol', 'blockquote', 'table', 'pre']);
const blockTags = new Set([
  ...primitiveTags,
  'div',
  'section',
  'article',
  'aside',
  'header',
  'footer',
  'nav',
  'main',
  'details',
  'summary',
  'figure',
  'figcaption',
  'dl',
  'dt',
  'dd',
  'li',
  'tr',
  'td',
  'th',
  'caption',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
]);

function isElement(node: Node): node is Element {
  return 'tagName' in node;
}

function attribute(node: Element, name: string): string | undefined {
  return node.attrs.find((attr) => attr.name === name)?.value;
}

function excluded(node: Element): boolean {
  return (
    excludedTags.has(node.tagName) ||
    attribute(node, 'hidden') !== undefined ||
    attribute(node, 'aria-hidden')?.toLowerCase() === 'true' ||
    attribute(node, 'data-search-exclude') !== undefined
  );
}

function descendants(node: Node, predicate: (element: Element) => boolean): Element[] {
  const found: Element[] = [];
  if (isElement(node) && predicate(node)) found.push(node);
  if ('childNodes' in node) {
    for (const child of node.childNodes) found.push(...descendants(child, predicate));
  }
  return found;
}

function formula(node: Element): string | undefined {
  if (!attribute(node, 'class')?.split(/\s+/u).includes('katex')) return undefined;
  const annotation = descendants(
    node,
    (element) =>
      element.tagName === 'annotation' && attribute(element, 'encoding') === 'application/x-tex',
  )[0];
  if (annotation) return text(annotation);
  // 描画HTMLとMathMLを重複させず、annotation欠落時も一つの表現に限定する。
  const math = descendants(node, (element) => element.tagName === 'math')[0];
  return math ? text(math) : node.childNodes.map((child) => text(child)).join('');
}

function text(node: Node, visitHeading?: (heading: Element) => void): string {
  if (node.nodeName === '#text' && 'value' in node) return node.value;
  if (!isElement(node) || excluded(node)) return '';
  if (visitHeading && /^h[1-6]$/u.test(node.tagName)) {
    visitHeading(node);
    return '';
  }
  if (node.tagName === 'br') return '\n';
  if (node.tagName === 'img') return attribute(node, 'alt') ?? '';
  const math = formula(node);
  if (math !== undefined) return math;
  const value = node.childNodes.map((child) => text(child, visitHeading)).join('');
  return blockTags.has(node.tagName) ? `\n${value}\n` : value;
}

/** 分割時の区切りも保持し、原文の文字を欠落・重複させない。 */
export function splitSearchPassage(value: string): string[] {
  const points = Array.from(value);
  const result: string[] = [];
  let start = 0;
  while (start < points.length) {
    let end = Math.min(start + 800, points.length);
    if (end < points.length) {
      const window = points.slice(start, end);
      let boundary = window.lastIndexOf('\n');
      if (boundary < 0) {
        for (let index = window.length - 1; index >= 0; index--) {
          if (/\s/u.test(window[index] ?? '')) {
            boundary = index;
            break;
          }
        }
      }
      if (boundary >= 0) end = start + boundary + 1;
    }
    result.push(points.slice(start, end).join(''));
    start = end;
  }
  return result;
}

export function projectSearchHtml(
  html: string,
  canonicalPathname: SearchCanonicalPathname,
): {
  body: string;
  passages: SearchPassage[];
} {
  const roots = descendants(
    parse(html),
    (node) => attribute(node, 'data-note-static-surface') !== undefined,
  );
  const root = roots[0];
  if (roots.length !== 1 || !root) {
    throw new Error(
      `Search projection requires one body root: ${canonicalPathname} (${roots.length})`,
    );
  }
  const passages: SearchPassage[] = [];
  const headings: { level: number; text: string; id: string | null }[] = [];
  const visitHeading = (node: Element): void => {
    const level = Number(node.tagName.slice(1));
    while (headings.length && (headings.at(-1)?.level ?? 0) >= level) headings.pop();
    headings.push({ level, text: text(node).trim(), id: attribute(node, 'id') || null });
  };
  const emit = (value: string): void => {
    if (!value.trim()) return;
    for (const chunk of splitSearchPassage(value)) {
      if (!chunk.trim()) continue;
      const order = passages.length;
      passages.push({
        passageId: JSON.stringify([canonicalPathname, order]),
        canonicalPathname,
        headingPath: headings.map((heading) => heading.text),
        anchorId: [...headings].reverse().find((heading) => heading.id !== null)?.id ?? null,
        order,
        text: chunk,
      });
    }
  };
  const visit = (container: Element): void => {
    let residual = '';
    const flush = (): void => {
      emit(residual);
      residual = '';
    };
    for (const node of container.childNodes) {
      if (!isElement(node)) {
        residual += text(node);
        continue;
      }
      if (excluded(node)) continue;
      if (/^h[1-6]$/u.test(node.tagName)) {
        flush();
        visitHeading(node);
      } else if (primitiveTags.has(node.tagName)) {
        flush();
        // 外側blockだけを採用し、内部のp/list/tableを再走査しない。
        emit(node.childNodes.map((child) => text(child, visitHeading)).join(''));
      } else if (
        blockTags.has(node.tagName) ||
        descendants(node, (element) => blockTags.has(element.tagName)).length > 0
      ) {
        flush();
        visit(node);
      } else {
        residual += text(node);
      }
    }
    flush();
  };
  if (!excluded(root)) visit(root);
  return { body: text(root).trim(), passages };
}

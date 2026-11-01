const HTML_NAMESPACE = 'http://www.w3.org/1999/xhtml';

interface FragmentIdentifier {
  readonly rawFragment: string;
  readonly decodedFragment: string;
}

export type InitialFragmentTarget =
  | ({ readonly kind: 'element'; readonly element: Element } & FragmentIdentifier)
  | ({
      readonly kind: 'document-top';
      readonly reason: 'empty-fragment' | 'top';
    } & FragmentIdentifier)
  | ({ readonly kind: 'missing' } & FragmentIdentifier)
  | ({ readonly kind: 'outside-root'; readonly element: Element } & FragmentIdentifier)
  | { readonly kind: 'no-fragment' }
  | {
      readonly kind: 'invalid';
      readonly reason: 'invalid-url' | 'different-document' | 'different-root-document';
    };

const hexValue = (byte: number): number => {
  if (byte >= 48 && byte <= 57) return byte - 48;
  if (byte >= 65 && byte <= 70) return byte - 55;
  if (byte >= 97 && byte <= 102) return byte - 87;
  return -1;
};

export const decodeInitialFragmentIdentifier = (raw: string): string => {
  const bytes = new TextEncoder().encode(raw);
  const decoded: number[] = [];
  for (let index = 0; index < bytes.length; index += 1) {
    const byte = bytes[index];
    if (byte === undefined) continue;
    const first = bytes[index + 1];
    const second = bytes[index + 2];
    const high = first === undefined ? -1 : hexValue(first);
    const low = second === undefined ? -1 : hexValue(second);
    if (byte === 37 && high >= 0 && low >= 0) {
      decoded.push(high * 16 + low);
      index += 2;
    } else decoded.push(byte);
  }
  // HTMLのUTF-8 decode without BOMは先頭BOMも識別子の一部として保持する。
  return new TextDecoder('utf-8', { ignoreBOM: true }).decode(new Uint8Array(decoded));
};

const findPotentialTarget = (document: Document, identifier: string): Element | null => {
  const byId = document.getElementById(identifier);
  if (byId) return byId;
  for (const element of document.getElementsByTagNameNS(HTML_NAMESPACE, 'a')) {
    if (element.getAttribute('name') === identifier) return element;
  }
  return null;
};

export const resolveInitialFragmentTarget = (
  document: Document,
  root: Element,
  url: string,
): InitialFragmentTarget => {
  if (root.ownerDocument !== document)
    return { kind: 'invalid', reason: 'different-root-document' };
  let targetUrl: URL;
  let documentUrl: URL;
  try {
    targetUrl = new URL(url, document.URL);
    documentUrl = new URL(document.URL);
  } catch {
    return { kind: 'invalid', reason: 'invalid-url' };
  }
  const href = targetUrl.href;
  targetUrl.hash = '';
  documentUrl.hash = '';
  if (targetUrl.href !== documentUrl.href) return { kind: 'invalid', reason: 'different-document' };
  const delimiter = href.indexOf('#');
  if (delimiter < 0) return { kind: 'no-fragment' };
  const rawFragment = href.slice(delimiter + 1);
  const decodedFragment = decodeInitialFragmentIdentifier(rawFragment);
  const identifier = { rawFragment, decodedFragment };
  if (rawFragment === '') return { kind: 'document-top', reason: 'empty-fragment', ...identifier };
  const element =
    findPotentialTarget(document, rawFragment) ?? findPotentialTarget(document, decodedFragment);
  if (element)
    return root.contains(element)
      ? { kind: 'element', element, ...identifier }
      : { kind: 'outside-root', element, ...identifier };
  if (/^[tT][oO][pP]$/.test(decodedFragment))
    return { kind: 'document-top', reason: 'top', ...identifier };
  return { kind: 'missing', ...identifier };
};

export const isInitialFragmentTargetRenderable = (element: Element): boolean => {
  const view = element.ownerDocument.defaultView;
  if (!view || !element.isConnected || element.getClientRects().length === 0) return false;
  const rect = element.getBoundingClientRect();
  if (![rect.left, rect.top, rect.width, rect.height].every(Number.isFinite)) return false;
  const style = view.getComputedStyle(element);
  return (
    style.display !== 'none' && style.visibility !== 'hidden' && style.visibility !== 'collapse'
  );
};

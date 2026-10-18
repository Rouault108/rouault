import { readPreparedTableGeometry } from '../../../client/post-hydrate/table-scroll-enhancer.js';

// CSS変更時には全selector・継承・cell roleの監査とこの明示inventoryの更新を要する。
export const HISTORY_TABLE_FONT_PROFILE_VERSION = 'simple-static-table-v1';
export const HISTORY_TABLE_APPROVED_STYLESHEET_SHA256: readonly string[] = Object.freeze([
  'dacec43ef373addeda17563a397b0891d37373e589daa163d555add81bca1e75',
  '5df6b238b0a305eedffd99e8c2eded59021f6d93bc93960f649cce9c2c672adc',
]);
type PreparedTable = NonNullable<ReturnType<typeof readPreparedTableGeometry>>;
export interface HistoryTableFontProfile {
  readonly environment: string;
  readonly current: () => boolean;
}
interface ApprovedSheet {
  readonly sheet: CSSStyleSheet;
  readonly owner: Element;
  readonly attributes: string;
  readonly rules: string;
  readonly digest: string;
  readonly state: string;
}
const documents = new WeakMap<
  Document,
  { sheets: readonly CSSStyleSheet[]; promise: Promise<readonly ApprovedSheet[] | null> }
>();
const rules = (sheet: CSSStyleSheet): string =>
  Array.from(sheet.cssRules, (rule) => rule.cssText).join('\n');
const attributes = (element: Element): string =>
  JSON.stringify(
    Array.from(element.attributes)
      .filter(
        (a) =>
          element !== element.ownerDocument.documentElement || a.name !== 'data-content-transition',
      )
      .map((a) => [a.name, a.value]),
  );
const sheetState = (sheet: CSSStyleSheet): string =>
  JSON.stringify([sheet.disabled, sheet.media.mediaText, sheet.title]);
const prepareSheets = (owner: Document): Promise<readonly ApprovedSheet[] | null> => {
  const previous = documents.get(owner);
  if (
    previous?.sheets.length === owner.styleSheets.length &&
    previous.sheets.every((sheet, index) => owner.styleSheets.item(index) === sheet)
  )
    return previous.promise;
  const prepared = (async (): Promise<readonly ApprovedSheet[] | null> => {
    try {
      if (
        owner.adoptedStyleSheets.length ||
        !owner.styleSheets.length ||
        owner.styleSheets.length !== 1
      )
        return null;
      const result: ApprovedSheet[] = [];
      for (const sheet of owner.styleSheets) {
        const node = sheet.ownerNode;
        if (!(node instanceof Element) || sheet.disabled || sheet.media.mediaText || sheet.title)
          return null;
        const beforeAttributes = attributes(node);
        const bytes = sheet.href
          ? await fetch(sheet.href, { credentials: 'same-origin' }).then(async (response) => {
              if (!response.ok || new URL(response.url).origin !== owner.location.origin)
                throw new Error('unknown stylesheet');
              return response.arrayBuffer();
            })
          : new TextEncoder().encode(node.textContent).buffer;
        const digest = Array.from(
          new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)),
          (byte) => byte.toString(16).padStart(2, '0'),
        ).join('');
        if (!HISTORY_TABLE_APPROVED_STYLESHEET_SHA256.includes(digest)) return null;
        const expected = new CSSStyleSheet();
        expected.replaceSync(new TextDecoder().decode(bytes));
        const expectedRules = rules(expected);
        if (
          !expectedRules ||
          rules(sheet) !== expectedRules ||
          attributes(node) !== beforeAttributes
        )
          return null;
        result.push(
          Object.freeze({
            sheet,
            owner: node,
            attributes: beforeAttributes,
            rules: expectedRules,
            digest,
            state: sheetState(sheet),
          }),
        );
      }
      return Object.freeze(result);
    } catch {
      return null;
    }
  })();
  documents.set(owner, { sheets: Array.from(owner.styleSheets), promise: prepared });
  return prepared;
};
const rootDiagnosticAttributes = new Set([
  'data-reading-position-status',
  'data-reading-position-reason',
  'data-history-presentation-eligibility',
  'aria-busy',
]);
export const historyTableRootAttributes = (root: HTMLElement): string =>
  JSON.stringify(
    Array.from(root.attributes)
      .filter((a) => !rootDiagnosticAttributes.has(a.name))
      .map((a) => [a.name, a.value])
      .sort(([a = ''], [b = '']) => a.localeCompare(b)),
  );
const tokens = [
  '--font-sans',
  '--font-serif',
  '--font-mono',
  '--font-medium',
  '--text-xs',
  '--text-base',
  '--tracking-wide',
  '--space-2',
  '--space-3',
  '--space-4',
];
export const historyTableProfileEnvironment = (
  root: HTMLElement,
  values: (style: CSSStyleDeclaration) => readonly string[],
): string => {
  const ancestors: unknown[] = [];
  for (let element: HTMLElement | null = root; element; element = element.parentElement) {
    const style = getComputedStyle(element);
    ancestors.push([
      element.localName,
      element === root ? historyTableRootAttributes(element) : attributes(element),
      values(style),
      tokens.map((name) => style.getPropertyValue(name)),
      style.zoom,
      style.getPropertyValue('text-size-adjust'),
      style.getPropertyValue('-webkit-text-size-adjust'),
    ]);
  }
  return JSON.stringify([
    ancestors,
    innerWidth,
    innerHeight,
    devicePixelRatio,
    document.documentElement.clientWidth,
    visualViewport?.scale,
    matchMedia('(hover: none) and (pointer: coarse)').matches,
    matchMedia('(forced-colors: active)').matches,
    matchMedia('print').matches,
  ]);
};
export const prepareHistoryTableFontProfile = async (
  root: HTMLElement,
): Promise<HistoryTableFontProfile | null> => {
  const owner = root.ownerDocument;
  if (![null, ''].includes(owner.documentElement.getAttribute('data-content-transition')))
    return null;
  const sheets = await prepareSheets(owner);
  if (!sheets) return null;
  const current = (): boolean => {
    try {
      return (
        [null, ''].includes(owner.documentElement.getAttribute('data-content-transition')) &&
        owner.adoptedStyleSheets.length === 0 &&
        owner.styleSheets.length === sheets.length &&
        sheets.every(
          (item, index) =>
            owner.styleSheets.item(index) === item.sheet &&
            item.owner.isConnected &&
            attributes(item.owner) === item.attributes &&
            sheetState(item.sheet) === item.state &&
            rules(item.sheet) === item.rules,
        )
      );
    } catch {
      return false;
    }
  };
  if (!current()) return null;
  return Object.freeze({ environment: JSON.stringify(sheets.map((item) => item.digest)), current });
};
export const historyTableRole = (
  element: Element,
  tables: readonly PreparedTable[],
): string | null => {
  if (!(element instanceof HTMLTableCellElement)) return null;
  const index = tables.findIndex((item) => item.table === element.closest('table'));
  return index < 0
    ? null
    : `${index.toString()}:${element.localName}:${element.getAttribute('align') ?? ''}`;
};
export const simpleHistoryTableProfile = (tables: readonly PreparedTable[]): boolean =>
  tables.length > 0 &&
  tables.every((item) => {
    if (
      item.root.getAttribute('data-density') &&
      item.root.getAttribute('data-density') !== 'default'
    )
      return false;
    if (!item.root.parentElement?.matches('.prose, .about-prose')) return false;
    for (const element of [item.table, ...item.table.querySelectorAll('*')]) {
      if (
        !(element instanceof HTMLElement) ||
        !['table', 'colgroup', 'col', 'thead', 'tbody', 'tr', 'th', 'td', 'br'].includes(
          element.localName,
        )
      )
        return false;
      if (
        Array.from(element.attributes).some(
          (a) =>
            !(
              ((element.localName === 'td' || element.localName === 'th') &&
                a.name === 'align' &&
                ['left', 'center', 'right'].includes(a.value)) ||
              (element.localName === 'col' &&
                a.name === 'data-table-col-width' &&
                ['auto', 'fit', 'narrow', 'medium', 'wide', 'numeric'].includes(a.value)) ||
              (element.localName === 'br' &&
                a.name === 'data-table-cell-break' &&
                a.value === 'true')
            ),
        )
      )
        return false;
      if (element.localName === 'br' && element.childNodes.length) return false;
      if (
        element instanceof HTMLTableCellElement &&
        Array.from(element.children).some((child) => child.localName !== 'br')
      )
        return false;
    }
    return true;
  });

// 生成IDを落とす前に文書全体の参照を拒否し、正規化による参照切れの隠蔽を防ぐ。
export const unreferencedHistoryTableIds = (
  root: HTMLElement,
  tables: readonly PreparedTable[],
  previousIds: readonly string[] = [],
): boolean => {
  if (root.ownerDocument.querySelector('animate,animateMotion,animateTransform,set,[begin],[end]'))
    return false;
  for (const element of root.ownerDocument.querySelectorAll(
    '[style], [fill], [stroke], [filter], [clip-path], [mask], [marker], [marker-start], [marker-mid], [marker-end], [cursor], [color-profile]',
  )) {
    for (const attribute of element.attributes) {
      if (
        [
          'style',
          'fill',
          'stroke',
          'filter',
          'clip-path',
          'mask',
          'marker',
          'marker-start',
          'marker-mid',
          'marker-end',
          'cursor',
          'color-profile',
        ].includes(attribute.localName) &&
        /[\\#]|url\s*\(/iu.test(attribute.value)
      )
        return false;
    }
  }
  const ids = tables.map((item) => item.generatedRootId).filter((id): id is string => id !== null);
  if (
    tables.some(
      (item) => item.generatedRootId === null && (item.root.id !== '' || item.rail !== null),
    )
  )
    return false;
  for (const id of new Set([...ids, ...previousIds])) {
    if (
      ids.includes(id) &&
      root.ownerDocument.querySelectorAll(`[id="${CSS.escape(id)}"]`).length !== 1
    )
      return false;
    for (const element of root.ownerDocument.querySelectorAll(
      '[href], [*|href], [aria-controls], [aria-labelledby], [aria-describedby], [aria-owns], [aria-activedescendant], [aria-details], [aria-errormessage], [aria-flowto], [contextmenu], [for], [headers], [list], [form], [usemap], [itemref], [popovertarget], [commandfor]',
    )) {
      for (const attribute of element.attributes) {
        if (
          attribute.name === 'aria-controls' &&
          tables.some(
            (item) =>
              item.rail === element && item.generatedRootId === id && attribute.value === id,
          )
        )
          continue;
        if (attribute.value.split(/\s+/u).includes(id)) return false;
        if (attribute.localName === 'href' || attribute.localName === 'usemap') {
          try {
            if (
              decodeURIComponent(
                new URL(attribute.value, root.ownerDocument.baseURI).hash.slice(1),
              ) === id
            )
              return false;
          } catch {
            return false;
          }
        }
      }
    }
  }
  return true;
};

const replaceOnce = (value: string, from: string, to: string): string | null => {
  const offset = value.indexOf(from);
  return offset < 0 || value.includes(from, offset + from.length)
    ? null
    : value.slice(0, offset) + to + value.slice(offset + from.length);
};
// native serializerで全量を結合し、所有が検証済みのenhancer投影だけを取り除く。
export const serializeHistoryTableAuthored = (
  root: HTMLElement,
  tables: readonly PreparedTable[],
  verified = false,
): string | null => {
  if (
    !verified &&
    (!simpleHistoryTableProfile(tables) || !unreferencedHistoryTableIds(root, tables))
  )
    return null;
  let result = root.innerHTML;
  for (const item of tables) {
    if (item.rail) {
      const next = replaceOnce(result, item.rail.outerHTML, '');
      if (next === null) return null;
      result = next;
    }
    const shell = item.root.cloneNode(false);
    if (!(shell instanceof HTMLElement)) return null;
    const before = shell.outerHTML;
    const beforeOpening = before.slice(0, before.indexOf('>') + 1);
    for (const name of ['id', 'data-overflow', 'data-fade-left', 'data-fade-right'])
      shell.removeAttribute(name);
    const empty = shell.outerHTML;
    const opening = empty.slice(0, empty.indexOf('>') + 1);
    const next = replaceOnce(result, beforeOpening, opening);
    if (next === null) return null;
    result = next;
  }
  return result;
};

export const knownHistoryTableAnnouncementRecord = (
  record: MutationRecord,
  root: HTMLElement,
): boolean => {
  const region = record.type === 'characterData' ? record.target.parentElement : record.target;
  const host = root.closest('router-document-host');
  if (
    !(region instanceof HTMLElement) ||
    !host ||
    region.parentElement !== host ||
    region.localName !== 'div' ||
    region.className !== 'sr-only' ||
    region.getAttribute('aria-live') !== 'polite' ||
    region.getAttribute('aria-atomic') !== 'true' ||
    !region.hasAttribute('data-router-document-host-announcement') ||
    host.querySelectorAll('[data-router-document-host-announcement]').length !== 1 ||
    Array.from(region.attributes).some(
      (a) =>
        !['class', 'aria-live', 'aria-atomic', 'data-router-document-host-announcement'].includes(
          a.name,
        ),
    ) ||
    Array.from(region.childNodes).some((node) => node.nodeType !== Node.TEXT_NODE)
  )
    return false;
  if (
    record.type === 'childList' &&
    [...record.addedNodes, ...record.removedNodes].some((node) => node.nodeType !== Node.TEXT_NODE)
  )
    return false;
  if (!['childList', 'characterData'].includes(record.type)) return false;
  const style = getComputedStyle(region);
  return (
    style.position === 'absolute' &&
    style.width === '1px' &&
    style.height === '1px' &&
    style.padding === '0px' &&
    style.margin === '-1px' &&
    style.overflow === 'hidden' &&
    style.clipPath === 'inset(50%)' &&
    style.whiteSpace === 'nowrap' &&
    style.borderWidth === '0px'
  );
};

export const knownHistoryTablePaintRecord = (record: MutationRecord, root: HTMLElement): boolean =>
  record.type === 'attributes' &&
  record.target === root.ownerDocument.documentElement &&
  record.attributeName === 'data-content-transition' &&
  (record.oldValue === null || record.oldValue === '') &&
  [null, ''].includes(root.ownerDocument.documentElement.getAttribute('data-content-transition'));

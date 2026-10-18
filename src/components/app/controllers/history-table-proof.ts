import {
  readContentContext,
  subscribeContentContext,
} from '../../../navigation/content-navigation-context.js';
import { readPreparedTableGeometry } from '../../../client/post-hydrate/table-scroll-enhancer.js';
import type { NavigationCommitReceipt } from '../../../router/router-types.js';
import type { AcceptedIncomingTableArtifact } from './history-table-incoming.js';
import {
  HISTORY_TABLE_FONT_PROFILE_VERSION,
  prepareHistoryTableFontProfile,
  historyTableProfileEnvironment,
  historyTableRole,
  historyTableRootAttributes,
  simpleHistoryTableProfile,
  serializeHistoryTableAuthored,
  unreferencedHistoryTableIds,
  knownHistoryTableAnnouncementRecord,
  knownHistoryTablePaintRecord,
  type HistoryTableFontProfile,
} from './history-table-font-profile.js';

export interface HistoryTableCertificate {
  readonly version: string;
  readonly authoredSerialization: string;
  readonly rootAttributes: string;
  readonly tableIndices: readonly (readonly [number, number])[];
  readonly projection: readonly string[];
  readonly generatedIds: readonly string[];
  readonly roleIndices: readonly (readonly [string, number])[];
  readonly roles: readonly (readonly [string, readonly string[]])[];
  readonly outsideFonts: readonly (readonly [number, string, readonly string[]])[];
  readonly elementIndices: readonly number[];
  readonly structure: string;
  readonly text: string;
  readonly fontFingerprint: string;
  readonly environment: string;
  readonly profileEnvironment: string;
  readonly cssEnvironment: string;
  readonly fonts: string;
}
const certificates = new WeakSet<HistoryTableCertificate>();
const profileLeases = new WeakMap<Document, HistoryTableFontProfile>();

const MAX_ELEMENTS = 8192;
const MAX_ROWS = 1024;
const MAX_CELLS = 8192;
const MAX_TEXT = 128_000;
const MAX_SERIALIZED_BYTES = 524_288;
const MAX_FONT_GROUPS = 16;
const CHUNK_MILLISECONDS = 4;
const PREPARATION_MILLISECONDS = 1000;

// finish済みでもfill効果が残る場合はstatic CSSの字体証跡へ戻ったとはみなさない。
export const historyAnimationInEffect = (animation: Animation): boolean => {
  if (animation.pending || !['finished', 'idle'].includes(animation.playState)) return true;
  if (animation.playState === 'idle' || !animation.effect) return false;
  try {
    return animation.effect.getComputedTiming().progress !== null;
  } catch {
    return true;
  }
};
export const historyTocColorTransition = (animation: Animation, toc: Element | null): boolean => {
  const target = animation.effect instanceof KeyframeEffect ? animation.effect.target : null;
  return (
    typeof CSSTransition !== 'undefined' &&
    animation instanceof CSSTransition &&
    animation.transitionProperty === 'color' &&
    target instanceof HTMLElement &&
    target.matches('.layout-toc__link') &&
    toc?.contains(target) === true
  );
};
const filledHistoryAnimation = (root: HTMLElement): boolean => {
  const toc = root.querySelector('[data-layout-toc-root]');
  const filled = (animation: Animation): boolean =>
    animation.playState === 'finished' &&
    historyAnimationInEffect(animation) &&
    !historyTocColorTransition(animation, toc);
  if (root.getAnimations({ subtree: true }).some(filled)) return true;
  for (let ancestor = root.parentElement; ancestor; ancestor = ancestor.parentElement)
    if (ancestor.getAnimations().some(filled)) return true;
  return false;
};

type PreparedTable = NonNullable<ReturnType<typeof readPreparedTableGeometry>>;
export interface HistoryTableProof {
  readonly tables: readonly PreparedTable[];
  readonly elements: readonly HTMLElement[];
  readonly structure: string;
  readonly text: string;
  readonly fontFingerprint: string;
  readonly environment: string;
  readonly preparedMilliseconds: number;
  readonly maximumChunkMilliseconds: number;
  readonly certificate?: HistoryTableCertificate;
}
interface CachedProof {
  readonly current: () => boolean;
  readonly flush: () => boolean;
  readonly dispose: () => void;
  readonly invalidated?: (reason: string) => void;
  readonly reason?: () => string;
  proof: HistoryTableProof | null;
}
const cache = new WeakMap<HTMLElement, CachedProof>();
export interface HistoryTableProofTiming {
  readonly outcome: 'ready' | 'unavailable' | 'budget-exceeded';
  readonly elapsedMilliseconds: number;
  readonly maximumChunkMilliseconds?: number;
  readonly reason?: string;
}
export interface HistoryTableDiagnosticOwner {
  readonly contentEpoch: number;
  readonly entryId: string | null;
  readonly url: string;
}
export interface HistoryTableProofDiagnostics extends HistoryTableDiagnosticOwner {
  readonly preparation: HistoryTableProofTiming | null;
  readonly capture: HistoryTableProofTiming | null;
  readonly invalidation?: string;
}
const diagnostics = new WeakMap<HTMLElement, HistoryTableProofDiagnostics>();
const diagnosticGenerations = new WeakMap<HTMLElement, object>();
export const readHistoryTableDiagnosticOwner = (
  root: HTMLElement,
): HistoryTableDiagnosticOwner | null => {
  const context = readContentContext();
  return context?.root === root && !context.mutation && !context.recoveryRequired
    ? {
        contentEpoch: context.contentEpoch,
        entryId: context.displayedBinding.entryId,
        url: context.displayedBinding.url,
      }
    : null;
};
const sameOwner = (
  left: HistoryTableDiagnosticOwner | null | undefined,
  right: HistoryTableDiagnosticOwner | null | undefined,
): boolean =>
  left?.contentEpoch !== undefined &&
  right?.contentEpoch !== undefined &&
  left.contentEpoch === right.contentEpoch &&
  left.entryId === right.entryId &&
  left.url === right.url;
export const readHistoryTableProofDiagnostics = (
  root: HTMLElement,
): HistoryTableProofDiagnostics | null => {
  const result = diagnostics.get(root);
  return sameOwner(result, readHistoryTableDiagnosticOwner(root)) ? (result ?? null) : null;
};
export const recordHistoryTableCapture = (
  root: HTMLElement,
  outcome: HistoryTableProofTiming['outcome'],
  elapsedMilliseconds: number,
  expectedOwner: HistoryTableDiagnosticOwner | null,
): void => {
  if (!expectedOwner || !sameOwner(expectedOwner, readHistoryTableDiagnosticOwner(root))) return;
  const previous = diagnostics.get(root);
  diagnostics.set(
    root,
    Object.freeze({
      ...expectedOwner,
      preparation: sameOwner(previous, expectedOwner) ? (previous?.preparation ?? null) : null,
      capture: Object.freeze({ outcome, elapsedMilliseconds }),
      ...(sameOwner(previous, expectedOwner) && previous?.invalidation
        ? { invalidation: previous.invalidation }
        : {}),
    }),
  );
};
const stateIdentities = new WeakMap<object, number>();
let identitySequence = 0;
const identity = (value: object): number => {
  const previous = stateIdentities.get(value);
  if (previous !== undefined) return previous;
  const next = ++identitySequence;
  stateIdentities.set(value, next);
  return next;
};
const liveStates = [
  'hover',
  'active',
  'focus',
  'focus-visible',
  'focus-within',
  'checked',
  'indeterminate',
  'target',
  'valid',
  'invalid',
  'in-range',
  'out-of-range',
  'placeholder-shown',
  'user-valid',
  'user-invalid',
  'autofill',
  '-webkit-autofill',
  'fullscreen',
  'modal',
  'popover-open',
  'open',
];
const staticStates = new Set([
  'root',
  'scope',
  'empty',
  'first-child',
  'last-child',
  'only-child',
  'first-of-type',
  'last-of-type',
  'only-of-type',
  'nth-child',
  'nth-last-child',
  'nth-of-type',
  'nth-last-of-type',
  'not',
  'is',
  'where',
  'has',
  'lang',
  'dir',
  'any-link',
  'link',
  'visited',
  'enabled',
  'disabled',
  'read-only',
  'read-write',
  'required',
  'optional',
  'default',
]);
const documentLiveStates = new WeakMap<Document, readonly string[]>();

export const invalidateHistoryTableProof = (root: HTMLElement, reason = 'external'): void => {
  const state = cache.get(root);
  if (!state) return;
  cache.delete(root);
  state.invalidated?.(reason);
  const previousDiagnostic = diagnostics.get(root);
  if (previousDiagnostic && sameOwner(previousDiagnostic, readHistoryTableDiagnosticOwner(root)))
    diagnostics.set(
      root,
      Object.freeze({ ...previousDiagnostic, invalidation: state.reason?.() ?? reason }),
    );
  try {
    state.dispose();
  } catch {
    /* 証跡解放の失敗を位置writerや受理済みcommitへ波及させない。 */
  }
};

const viewport = (): string =>
  JSON.stringify([
    innerWidth,
    innerHeight,
    devicePixelRatio,
    document.documentElement.clientWidth,
    document.documentElement.clientHeight,
    visualViewport?.width,
    visualViewport?.height,
    visualViewport?.scale,
  ]);

const styleSheets = (owner: Document): string => {
  // CSSOMのinsertRule等はMutationObserverへ届かないため、使用rule自体も比較する。
  let result = '';
  const usedStates = new Set<string>();
  const sheets = [...owner.styleSheets, ...owner.adoptedStyleSheets];
  if (sheets.length > 32) return '';
  let ruleCount = 0;
  for (const sheet of sheets) {
    if (sheet.disabled) return '';
    result += `${sheet.href ?? ''}:${sheet.media.mediaText}:`;
    const validRule = (rule: CSSRule): boolean => {
      if (++ruleCount > 4096) return false;
      if (rule instanceof CSSImportRule) return false;
      // container状態はviewportやDOM mutationだけでは追えないため、今回のcache対象外。
      if (/^\s*@(?:container|scope)\b/iu.test(rule.cssText)) return false;
      if (rule instanceof CSSStyleRule) {
        if (rule.selectorText.includes('\\')) return false;
        // 未知のlive状態をcacheの「変化なし」と推測しない。
        const states = Array.from(
          rule.selectorText.matchAll(/(?<!:):([a-z-]+)\b/giu),
          (match) => match[1]?.toLowerCase() ?? '',
        );
        if (states.some((name) => !staticStates.has(name) && !liveStates.includes(name)))
          return false;
        for (const name of states) if (liveStates.includes(name)) usedStates.add(name);
        if (/::(?:first-line|first-letter|marker)\b/iu.test(rule.selectorText)) return false;
      }
      if (rule instanceof CSSMediaRule) result += String(matchMedia(rule.conditionText).matches);
      if ('cssRules' in rule && rule.cssRules instanceof CSSRuleList)
        return Array.from(rule.cssRules).every(validRule);
      return true;
    };
    for (const rule of sheet.cssRules) {
      if (!validRule(rule)) return '';
      result += rule.cssText;
      if (rule instanceof CSSMediaRule) result += String(matchMedia(rule.conditionText).matches);
      if (result.length > 1_048_576) return '';
    }
  }
  documentLiveStates.set(owner, [...usedStates]);
  return result || 'no-stylesheets';
};

const interaction = (root: HTMLElement): string => {
  const owner = root.ownerDocument;
  return JSON.stringify(
    (documentLiveStates.get(owner) ?? liveStates)
      .filter((name) => CSS.supports(`selector(:${name})`))
      .map((name) => [name, Array.from(owner.querySelectorAll(`:${name}`), identity)]),
  );
};
const fontFaces = (owner: Document): string =>
  JSON.stringify(
    Array.from(owner.fonts, (face) => [
      identity(face),
      face.family,
      face.style,
      face.weight,
      face.stretch,
      face.unicodeRange,
      face.featureSettings,
      face.ascentOverride,
      face.descentOverride,
      face.lineGapOverride,
      face.display,
      face.status,
    ]),
  );

export const historyTableFontValues = (style: CSSStyleDeclaration): string[] => [
  `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`,
  style.getPropertyValue('font-stretch'),
  style.fontVariant,
  style.fontFeatureSettings,
  style.fontVariationSettings,
  style.fontKerning,
  style.fontOpticalSizing,
  style.lineHeight,
  style.letterSpacing,
  style.wordSpacing,
  style.textTransform,
  ...[
    'font-size-adjust',
    'font-synthesis',
    'font-language-override',
    'text-rendering',
    'direction',
    'writing-mode',
    'text-orientation',
    'white-space',
    'word-break',
    'overflow-wrap',
    'hyphens',
    'tab-size',
    'unicode-bidi',
  ].map((name) => style.getPropertyValue(name)),
];

const visible = (element: HTMLElement, style: CSSStyleDeclaration): boolean => {
  const rect = element.getBoundingClientRect();
  return (
    !element.closest('[hidden], [inert]') &&
    element.getClientRects().length > 0 &&
    rect.width > 0 &&
    rect.height > 0 &&
    style.display !== 'none' &&
    style.visibility === 'visible' &&
    style.contentVisibility !== 'hidden' &&
    style.opacity === '1'
  );
};

const simpleTableElement = (element: HTMLElement, style: CSSStyleDeclaration): boolean => {
  if (
    element.hasAttribute('style') ||
    element.hasAttribute('class') ||
    style.transform !== 'none' ||
    style.perspective !== 'none' ||
    style.position !== 'static' ||
    style.opacity !== '1' ||
    style.visibility !== 'visible' ||
    style.contentVisibility !== 'visible'
  )
    return false;
  const tag = element.localName;
  for (const pseudo of ['::before', '::after']) {
    const content = getComputedStyle(element, pseudo).content;
    if (!['none', 'normal', '""', "''"].includes(content)) return false;
  }
  if (tag === 'table' && (style.tableLayout !== 'auto' || style.borderCollapse !== 'collapse'))
    return false;
  const display = new Map([
    ['table', 'table'],
    ['thead', 'table-header-group'],
    ['tbody', 'table-row-group'],
    ['tfoot', 'table-footer-group'],
    ['tr', 'table-row'],
    ['td', 'table-cell'],
    ['th', 'table-cell'],
    ['colgroup', 'table-column-group'],
    ['col', 'table-column'],
    ['caption', 'table-caption'],
  ]).get(tag);
  if (display) return style.display === display;
  return (
    ['a', 'br', 'span', 'strong', 'em', 'b', 'i', 'small', 's', 'sub', 'sup'].includes(tag) &&
    style.display === 'inline'
  );
};

const tableShape = (table: HTMLTableElement): boolean => {
  const count = table.rows.item(0)?.cells.length ?? 0;
  if (count === 0 || count > 32 || table.rows.length === 0) return false;
  if (
    Array.from(table.children).some(
      (element) => !['caption', 'colgroup', 'thead', 'tbody', 'tfoot'].includes(element.localName),
    )
  )
    return false;
  const columns = Array.from(table.querySelectorAll('col'));
  if (columns.length !== 0 && columns.length !== count) return false;
  if (columns.some((column) => column.span !== 1 || column.parentElement?.localName !== 'colgroup'))
    return false;
  for (const row of table.rows) {
    if (row.cells.length !== count) return false;
    for (const cell of row.cells)
      if (
        cell.colSpan !== 1 ||
        cell.rowSpan !== 1 ||
        ['colspan', 'rowspan'].some(
          (name) => cell.hasAttribute(name) && cell.getAttribute(name) !== '1',
        )
      )
        return false;
  }
  return true;
};

const canonicalRailStyle = (owner: Document, value: string | null): string => {
  const style = owner.createElement('span').style;
  style.cssText = value ?? '';
  style.removeProperty('pointer-events');
  return style.cssText;
};

const normalizedAttributes = (
  element: Element,
  tables: readonly PreparedTable[],
  portable = false,
  root?: HTMLElement,
): string[][] => {
  const railIndex = tables.findIndex((table) => table.rail === element);
  const attributes: string[][] = [];
  for (const attribute of element.attributes) {
    if (railIndex >= 0 && ['inert', 'aria-hidden', 'tabindex'].includes(attribute.name)) continue;
    if (
      portable &&
      element === root &&
      [
        'data-reading-position-status',
        'data-reading-position-reason',
        'data-history-presentation-eligibility',
        'aria-busy',
      ].includes(attribute.name)
    )
      continue;
    let value = attribute.value;
    if (portable && attribute.name === 'id') {
      const index = tables.findIndex(
        (table) => table.root === element && table.generatedRootId === value,
      );
      if (index >= 0) value = `@history-table-${index.toString()}`;
    }
    if (portable && attribute.name === 'aria-controls' && railIndex >= 0)
      value = `@history-table-${railIndex.toString()}`;
    if (railIndex >= 0 && attribute.name === 'style') {
      value = canonicalRailStyle(element.ownerDocument, value);
      if (!value) continue;
    }
    attributes.push([attribute.name, value]);
  }
  return attributes.sort(([left = ''], [right = '']) => left.localeCompare(right));
};

export const readHistoryTableProof = (root: HTMLElement): HistoryTableProof | null => {
  try {
    const state = cache.get(root);
    // 未完了の照会は通常fallbackにするが、同ownerの事前作業そのものは取消さない。
    if (state && !state.proof) return null;
    if (!state?.proof) return null;
    if (!state.flush()) {
      invalidateHistoryTableProof(root, 'pending-records');
      return null;
    }
    if (!state.current()) {
      invalidateHistoryTableProof(root, 'current-check');
      return null;
    }
    if (!state.flush()) {
      invalidateHistoryTableProof(root, 'pending-records-after-current');
      return null;
    }
    return state.proof;
  } catch {
    invalidateHistoryTableProof(root);
    return null;
  }
};

export const prepareHistoryTableProof = async (
  root: HTMLElement,
  signal: AbortSignal,
  validateSurface: (tables: ReadonlySet<HTMLTableElement>) => boolean,
): Promise<boolean> => {
  const started = performance.now();
  const diagnosticOwner = readHistoryTableDiagnosticOwner(root);
  const generation = {};
  diagnosticGenerations.set(root, generation);
  if (!diagnosticOwner) {
    invalidateHistoryTableProof(root);
    return false;
  }
  const previousDiagnostic = diagnostics.get(root);
  diagnostics.set(
    root,
    Object.freeze({
      ...diagnosticOwner,
      preparation: Object.freeze({ outcome: 'unavailable', elapsedMilliseconds: 0 }),
      capture: sameOwner(previousDiagnostic, diagnosticOwner)
        ? (previousDiagnostic?.capture ?? null)
        : null,
    }),
  );
  invalidateHistoryTableProof(root);
  const context = readContentContext();
  if (context?.root !== root || context.mutation || context.recoveryRequired) return false;
  const epoch = context.contentEpoch;
  const entryId = context.displayedBinding.entryId;
  const url = context.displayedBinding.url;
  const owner = root.ownerDocument;
  let maximumChunk = 0;
  let phase = 'admission';
  const preparationViewport = viewport();
  let budgetExceeded = false;
  let state: CachedProof | null = null;
  let disposed = false;
  let stopContext = (): void => {
    /* 購読前の早期終了には解放対象がない。 */
  };
  const tableStates: PreparedTable[] = [];
  let observer: MutationObserver | null = null;
  const lifecycle = new AbortController();
  let deadlineTimer: number | undefined;
  let stopWaiting = (): void => {
    /* 待機作成前には終了対象がない。 */
  };
  const stopped = new Promise<false>((resolve) => {
    stopWaiting = () => {
      resolve(false);
    };
    deadlineTimer = window.setTimeout(() => {
      budgetExceeded = true;
      stopWaiting();
    }, PREPARATION_MILLISECONDS);
  });
  signal.addEventListener('abort', stopWaiting, { once: true });
  const invalidate = (): void => {
    if (cache.get(root) === state) invalidateHistoryTableProof(root);
  };
  const owned = (): boolean => {
    const current = readContentContext();
    return (
      !disposed &&
      !signal.aborted &&
      root.isConnected &&
      root.ownerDocument === document &&
      document.getElementById('main-content') === root &&
      root.matches('main#main-content') &&
      current?.root === root &&
      current.contentEpoch === epoch &&
      !current.mutation &&
      !current.recoveryRequired &&
      current.displayedBinding.entryId === entryId &&
      current.displayedBinding.url === url
    );
  };
  try {
    if (!owned()) return false;
    phase = 'admission-cap';
    // native照会の過去の時間は制限できないが、超規模rootをJS全走査へ進めない。
    if (
      root.querySelectorAll('*').length + 1 > MAX_ELEMENTS ||
      root.textContent.length > MAX_TEXT ||
      !owned()
    )
      return false;
    const tables = Array.from(root.querySelectorAll<HTMLTableElement>('table'));
    phase = 'static-surface';
    if (!tables.length || !validateSurface(new Set(tables))) return false;
    phase = 'prepared-table-grid';
    let rows = 0;
    let cells = 0;
    for (const table of tables) {
      const parent = table.parentElement;
      const prepared = parent ? readPreparedTableGeometry(parent) : null;
      if (prepared?.table !== table || !tableShape(table)) return false;
      for (let ancestor: HTMLElement | null = parent; ancestor; ancestor = ancestor.parentElement) {
        const style = getComputedStyle(ancestor);
        if (style.transform !== 'none' || style.perspective !== 'none') return false;
      }
      rows += table.rows.length;
      for (const row of table.rows) cells += row.cells.length;
      if (rows > MAX_ROWS || cells > MAX_CELLS) return false;
      tableStates.push(prepared);
    }
    phase = 'css-profile';
    const preparingResizeEvents = new Set<Event>();
    const preparingRecords: MutationRecord[] = [];
    const markPreparingResize = (event: Event): void => {
      preparingResizeEvents.add(event);
    };
    window.addEventListener('resize', markPreparingResize);
    const preparingObserver = new MutationObserver((records) => {
      preparingRecords.push(...records);
    });
    preparingObserver.observe(owner.documentElement, {
      subtree: true,
      childList: true,
      attributes: true,
      characterData: true,
      attributeOldValue: true,
    });
    let preparedProfile: HistoryTableFontProfile | null | false;
    try {
      preparedProfile = await Promise.race([prepareHistoryTableFontProfile(root), stopped]);
    } finally {
      preparingRecords.push(...preparingObserver.takeRecords());
      preparingObserver.disconnect();
      window.removeEventListener('resize', markPreparingResize);
    }
    if (
      preparedProfile === false ||
      preparingResizeEvents.size > 0 ||
      preparingRecords.some(
        (record) => !preparedProfile || !knownHistoryTablePaintRecord(record, root),
      ) ||
      viewport() !== preparationViewport ||
      tableStates.some((previous) => {
        const current = readPreparedTableGeometry(previous.root);
        return (
          current?.generation !== previous.generation ||
          current.geometryVersion !== previous.geometryVersion ||
          !tableShape(previous.table)
        );
      })
    )
      return false;
    if (!owned()) return false;
    const profile = preparedProfile;
    phase = 'environment';
    const portable =
      profile !== null &&
      simpleHistoryTableProfile(tableStates) &&
      unreferencedHistoryTableIds(root, tableStates);
    if (portable) profileLeases.set(owner, profile);
    const baselineProfileEnvironment = portable
      ? historyTableProfileEnvironment(root, historyTableFontValues)
      : '';
    const baselineViewport = viewport();
    const baselineStyle = portable ? profile.environment : styleSheets(owner);
    const baselineInteraction = portable ? baselineProfileEnvironment : interaction(root);
    let baselineFonts = fontFaces(owner);
    if (!baselineStyle) {
      phase = 'css-inventory-unavailable';
      return false;
    }
    const stableTables = (): boolean =>
      tableStates.every((previous) => {
        const current = readPreparedTableGeometry(previous.root);
        return (
          current !== null &&
          current.table === previous.table &&
          current.rail === previous.rail &&
          current.spacer === previous.spacer &&
          current.generation === previous.generation &&
          current.geometryVersion === previous.geometryVersion
        );
      });
    const admissibleRecords = (records: readonly MutationRecord[]): boolean =>
      records.every((record) => {
        if (
          portable &&
          (knownHistoryTableAnnouncementRecord(record, root) ||
            knownHistoryTablePaintRecord(record, root))
        )
          return true;
        if (
          portable &&
          record.type === 'attributes' &&
          record.target === root &&
          [
            'data-reading-position-status',
            'data-reading-position-reason',
            'data-history-presentation-eligibility',
            'aria-busy',
          ].includes(record.attributeName ?? '')
        )
          return true;
        if (
          record.type !== 'attributes' ||
          !(record.target instanceof HTMLElement) ||
          !tableStates.some((table) => table.rail === record.target) ||
          !stableTables()
        )
          return false;
        if (['inert', 'aria-hidden', 'tabindex'].includes(record.attributeName ?? '')) return true;
        return (
          record.attributeName === 'style' &&
          canonicalRailStyle(owner, record.oldValue) ===
            canonicalRailStyle(owner, record.target.getAttribute('style'))
        );
      });
    observer = new MutationObserver((records) => {
      if (!admissibleRecords(records)) {
        phase = `mutation:${records[0]?.type ?? 'unknown'}:${records[0]?.attributeName ?? ''}`;
        invalidate();
      }
    });
    observer.observe(owner.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      characterData: true,
      attributeOldValue: true,
    });
    state = {
      proof: null,
      reason: () => phase,
      invalidated: (reason) => {
        if (!phase.startsWith('mutation:') && !phase.startsWith('current:'))
          phase = `invalidated:${reason}`;
      },
      current: () => {
        const fail = (reason: string): false => {
          phase = `current:${reason}`;
          return false;
        };
        if (
          !root.isConnected ||
          root.ownerDocument !== document ||
          document.getElementById('main-content') !== root ||
          !root.matches('main#main-content')
        )
          return fail('canonical-root');
        if (!owned()) return fail('owner');
        if (filledHistoryAnimation(root)) return fail('filled-animation');
        if (owner.fonts.status !== 'loaded') return fail('font-status');
        if (!stableTables()) return fail('prepared-tables');
        if (viewport() !== baselineViewport) return fail('viewport');
        if (
          (portable
            ? historyTableProfileEnvironment(root, historyTableFontValues)
            : interaction(root)) !== baselineInteraction
        )
          return fail(portable ? 'profile-environment' : 'interaction');
        if (fontFaces(owner) !== baselineFonts) return fail('font-faces');
        if (!(portable ? profile.current() : styleSheets(owner) === baselineStyle))
          return fail('css-inventory');
        return owned() || fail('owner-after-current');
      },
      flush: () => admissibleRecords(observer?.takeRecords() ?? []),
      dispose: () => {
        disposed = true;
        try {
          observer?.disconnect();
        } finally {
          try {
            stopContext();
          } finally {
            lifecycle.abort();
            signal.removeEventListener('abort', invalidate);
          }
        }
      },
    };
    cache.set(root, state);
    stopContext = subscribeContentContext(() => {
      if (!owned()) invalidate();
    });
    signal.addEventListener('abort', invalidate, { once: true });
    owner.fonts.addEventListener(
      'loading',
      () => {
        if (state?.proof && owner.fonts.status === 'loading') invalidate();
      },
      { signal: lifecycle.signal },
    );
    window.addEventListener('resize', invalidate, { signal: lifecycle.signal });
    const elements: HTMLElement[] = [];
    const serialized: string[] = [];
    const fontFingerprint: string[] = [];
    const roleValues = new Map<string, readonly string[]>();
    const roleElements = new Map<string, HTMLElement>();
    const outsideFonts: (readonly [HTMLElement, string, readonly string[]])[] = [];
    let roleUniform = true;
    const fontGroups = new Map<string, { font: string; texts: Set<string>; index: number }>();
    const indices = new Map<Node, number>();
    const walker = owner.createTreeWalker(
      root,
      NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT | NodeFilter.SHOW_COMMENT,
    );
    let node: Node | null = root;
    let count = 0;
    let nodeCount = 0;
    let textLength = 0;
    let serializedLength = 1;
    const encoder = new TextEncoder();
    let chunkStarted = started;
    const yieldChunk = async (): Promise<boolean> => {
      maximumChunk = Math.max(maximumChunk, performance.now() - chunkStarted);
      await new Promise<void>((resolve) => window.setTimeout(resolve, 0));
      chunkStarted = performance.now();
      if (!owned() || !(state?.flush() ?? false)) {
        if (!phase.startsWith('mutation:') && !phase.startsWith('invalidated:'))
          phase = 'chunk-owner-or-records';
        return false;
      }
      if (performance.now() - started >= PREPARATION_MILLISECONDS) {
        budgetExceeded = true;
        return false;
      }
      return true;
    };
    phase = 'content-and-font-scan';
    while (node) {
      if (++nodeCount > 16_384) {
        phase = 'node-cap';
        return false;
      }
      if (node instanceof Element) {
        // SVG/MathMLは独自のtext/font/animation模型を持つため、単純表のcoverageへ混ぜない。
        if (node.closest('table') && !(node instanceof HTMLElement)) {
          phase = 'foreign-table-element';
          return false;
        }
        if (!(node instanceof HTMLElement) && node.textContent.trim()) {
          const rect = node.getBoundingClientRect();
          if (
            rect.width > 0 &&
            rect.height > 0 &&
            getComputedStyle(node).visibility === 'visible'
          ) {
            phase = 'visible-foreign-text';
            return false;
          }
        }
        if (++count > MAX_ELEMENTS) {
          phase = 'element-cap';
          return false;
        }
        const index = indices.size;
        indices.set(node, index);
        const attributes = normalizedAttributes(node, tableStates, portable, root);
        const serializedNode = JSON.stringify([
          node.localName,
          indices.get(node.parentNode ?? root) ?? -1,
          attributes,
        ]);
        serialized.push(serializedNode);
        serializedLength += encoder.encode(serializedNode).byteLength + 1;
        if (node instanceof HTMLElement) {
          const element = node;
          const style = getComputedStyle(element);
          const table = element.closest('table');
          if (table && !simpleTableElement(element, style)) {
            phase = `table-style:${element.localName}`;
            return false;
          }
          if (element.localName !== 'script' && visible(element, style)) {
            for (const pseudo of ['::before', '::after'])
              if (
                !['none', 'normal', '""', "''"].includes(getComputedStyle(element, pseudo).content)
              ) {
                phase = `generated-content:${element.localName}:${pseudo}`;
                return false;
              }
            if (
              style.display === 'list-item' &&
              (style.listStyleType !== 'none' || style.listStyleImage !== 'none')
            ) {
              phase = `list-marker:${element.localName}`;
              return false;
            }
            const text = Array.from(element.childNodes)
              .filter((item) => item.nodeType === Node.TEXT_NODE)
              .map((item) => item.textContent ?? '')
              .join('')
              .trim();
            if (text) {
              // 変換後glyphのUnicode範囲をraw文字列から推測せず、今回は通常textだけを扱う。
              if (style.textTransform !== 'none') {
                phase = 'text-transform';
                return false;
              }
              const values = historyTableFontValues(style);
              const role = portable ? historyTableRole(element, tableStates) : null;
              if (role) {
                if (!roleElements.has(role)) roleElements.set(role, element);
                const previous = roleValues.get(role);
                if (previous && JSON.stringify(previous) !== JSON.stringify(values))
                  roleUniform = false;
                else roleValues.set(role, Object.freeze(values));
              } else if (portable) outsideFonts.push([element, text, Object.freeze(values)]);
              if (portable && !['normal', '100%'].includes(values[1] ?? '')) roleUniform = false;
              const key = JSON.stringify(values);
              const group = fontGroups.get(key) ?? {
                font: values[0] ?? '',
                texts: new Set<string>(),
                index: fontGroups.size,
              };
              group.texts.add(text);
              fontGroups.set(key, group);
              if (fontGroups.size > MAX_FONT_GROUPS) {
                phase = 'font-group-cap';
                return false;
              }
              // 全textは構造証跡が保持する。字体情報はgroup辞書と全使用要素の対応で重複を避ける。
              fontFingerprint.push(JSON.stringify([index, group.index]));
            }
            if (
              !tableStates.some((owned) => owned.rail === element || owned.spacer === element) &&
              (!table ||
                element instanceof HTMLTableRowElement ||
                element === table ||
                (element instanceof HTMLTableCellElement &&
                  element.parentElement === table.rows.item(0)))
            )
              elements.push(element);
          }
        }
      } else {
        const text = node.textContent ?? '';
        textLength += text.length;
        if (textLength > MAX_TEXT) return false;
        const serializedNode = JSON.stringify([
          node.nodeType === Node.COMMENT_NODE ? '#comment' : '#text',
          indices.get(node.parentNode ?? root) ?? -1,
          text,
        ]);
        serialized.push(serializedNode);
        serializedLength += encoder.encode(serializedNode).byteLength + 1;
      }
      if (serializedLength > MAX_SERIALIZED_BYTES) {
        phase = 'serialized-byte-cap';
        return false;
      }
      if (performance.now() - chunkStarted >= CHUNK_MILLISECONDS && !(await yieldChunk()))
        return false;
      node = walker.nextNode();
    }
    phase = 'glyph-coverage';
    for (const group of fontGroups.values())
      for (const text of group.texts) {
        // FontFaceSetの文字coverageは分割して確認し、全文と形状の同一性は別証跡で保つ。
        const points = Array.from(text);
        for (let offset = 0; offset < points.length; offset += 128) {
          const sample = points.slice(offset, offset + 128).join('');
          if (!owner.fonts.check(group.font, sample)) {
            maximumChunk = Math.max(maximumChunk, performance.now() - chunkStarted);
            const loaded = await Promise.race([owner.fonts.load(group.font, sample), stopped]);
            chunkStarted = performance.now();
            if (loaded === false || !owner.fonts.check(group.font, sample)) return false;
          }
          if (performance.now() - chunkStarted >= CHUNK_MILLISECONDS && !(await yieldChunk()))
            return false;
        }
      }
    maximumChunk = Math.max(maximumChunk, performance.now() - chunkStarted);
    if ((await Promise.race([owner.fonts.ready, stopped])) === false) return false;
    chunkStarted = performance.now();
    baselineFonts = fontFaces(owner);
    maximumChunk = Math.max(maximumChunk, performance.now() - chunkStarted);
    if (!state.current() || !state.flush()) return false;
    if (performance.now() - started > PREPARATION_MILLISECONDS) {
      budgetExceeded = true;
      return false;
    }
    maximumChunk = Math.max(maximumChunk, performance.now() - chunkStarted);
    phase = 'final-owner-environment';
    const proofStructure = `[${serialized.join(',')}]`;
    const proofFingerprint = `[[${Array.from(fontGroups.keys()).join(',')}],[${fontFingerprint.join(',')}]]`;
    const proofEnvironment = JSON.stringify([baselineStyle, baselineInteraction, baselineFonts]);
    let certificate: HistoryTableCertificate | undefined;
    if (portable && roleUniform) {
      const authoredSerialization = serializeHistoryTableAuthored(root, tableStates, true);
      if (authoredSerialization !== null) {
        const authoredElements = [root, ...root.querySelectorAll('*')].filter(
          (element) =>
            !tableStates.some((table) => element === table.rail || element === table.spacer),
        );
        const ordinals = new Map(authoredElements.map((element, index) => [element, index]));
        certificate = Object.freeze({
          version: HISTORY_TABLE_FONT_PROFILE_VERSION,
          authoredSerialization,
          rootAttributes: historyTableRootAttributes(root),
          tableIndices: Object.freeze(
            tableStates.map((table) =>
              Object.freeze([
                ordinals.get(table.root) ?? -1,
                ordinals.get(table.table) ?? -1,
              ] as const),
            ),
          ),
          projection: Object.freeze(
            tableStates.map((table) =>
              JSON.stringify([
                normalizedAttributes(table.root, tableStates, true, root),
                table.rail ? normalizedAttributes(table.rail, tableStates, true, root) : null,
                table.spacer ? normalizedAttributes(table.spacer, tableStates, true, root) : null,
              ]),
            ),
          ),
          generatedIds: Object.freeze(
            tableStates
              .map((table) => table.generatedRootId)
              .filter((id): id is string => id !== null),
          ),
          roleIndices: Object.freeze(
            Array.from(roleElements, ([role, element]) =>
              Object.freeze([role, ordinals.get(element) ?? -1] as const),
            ),
          ),
          roles: Object.freeze(Array.from(roleValues, (entry) => Object.freeze(entry))),
          outsideFonts: Object.freeze(
            outsideFonts.map(([element, text, values]) =>
              Object.freeze([ordinals.get(element) ?? -1, text, values] as const),
            ),
          ),
          elementIndices: Object.freeze(elements.map((element) => ordinals.get(element) ?? -1)),
          structure: proofStructure,
          text: root.textContent,
          fontFingerprint: proofFingerprint,
          environment: proofEnvironment,
          profileEnvironment: baselineProfileEnvironment,
          cssEnvironment: profile.environment,
          fonts: baselineFonts,
        });
        certificates.add(certificate);
      }
    }
    if (!state.current() || !state.flush()) return false;
    state.proof = Object.freeze({
      tables: tableStates,
      elements,
      structure: proofStructure,
      text: root.textContent,
      fontFingerprint: proofFingerprint,
      environment: proofEnvironment,
      ...(certificate ? { certificate } : {}),
      preparedMilliseconds: performance.now() - started,
      maximumChunkMilliseconds: maximumChunk,
    });
    return true;
  } catch {
    return false;
  } finally {
    const previous = diagnostics.get(root);
    if (
      diagnosticGenerations.get(root) === generation &&
      sameOwner(diagnosticOwner, readHistoryTableDiagnosticOwner(root))
    )
      diagnostics.set(
        root,
        Object.freeze({
          ...diagnosticOwner,
          preparation: Object.freeze({
            outcome: state?.proof
              ? 'ready'
              : budgetExceeded && owned()
                ? 'budget-exceeded'
                : 'unavailable',
            elapsedMilliseconds: performance.now() - started,
            maximumChunkMilliseconds: maximumChunk,
            ...(state?.proof
              ? state.proof.certificate
                ? {}
                : { reason: 'portable-profile-unavailable' }
              : { reason: phase }),
          }),
          capture: previous?.capture ?? null,
        }),
      );
    if (deadlineTimer !== undefined) clearTimeout(deadlineTimer);
    signal.removeEventListener('abort', stopWaiting);
    if (!state?.proof) invalidate();
  }
};

// sourceの全文/glyph検査を転用するが、受理済みの新DOMには別の寿命を必ず発行する。
export const adoptIncomingHistoryTableProof = (
  root: HTMLElement,
  receipt: NavigationCommitReceipt,
  certificate: HistoryTableCertificate | undefined,
  incoming: AcceptedIncomingTableArtifact | null | undefined,
): boolean => {
  const started = performance.now();
  const diagnosticOwner = readHistoryTableDiagnosticOwner(root);
  let observer: MutationObserver | null = null;
  let stopContext = (): void => {
    /* 採用前には購読がない。 */
  };
  let adopted = false;
  let handoffFinished = false;
  let failureReason = 'adopted-ready';
  const profile = profileLeases.get(root.ownerDocument);
  const persistentOwner = (): boolean => {
    const context = readContentContext();
    return (
      receipt.root === root &&
      Object.isFrozen(receipt) &&
      !receipt.stateOnly &&
      root.isConnected &&
      root.ownerDocument === document &&
      document.getElementById('main-content') === root &&
      context?.root === root &&
      context.contentEpoch === receipt.contentEpoch &&
      !context.mutation &&
      !context.recoveryRequired &&
      context.displayedBinding.entryId === receipt.entryId &&
      context.displayedBinding.url === receipt.url
    );
  };
  const owned = (): boolean =>
    incoming?.isCurrent() === true &&
    incoming.root === root &&
    incoming.receipt === receipt &&
    persistentOwner();
  const inBudget = (): boolean => {
    const elapsed = performance.now() - started;
    if (elapsed <= 8) return true;
    recordHistoryTableCapture(root, 'budget-exceeded', elapsed, diagnosticOwner);
    return false;
  };
  try {
    if (
      !certificate ||
      !certificates.has(certificate) ||
      certificate.version !== HISTORY_TABLE_FONT_PROFILE_VERSION ||
      !incoming ||
      !profile ||
      !owned() ||
      !profile.current() ||
      !inBudget()
    )
      return false;
    if (
      profile.environment !== certificate.cssEnvironment ||
      root.ownerDocument.fonts.status !== 'loaded' ||
      fontFaces(root.ownerDocument) !== certificate.fonts ||
      historyTableRootAttributes(root) !== certificate.rootAttributes ||
      historyTableProfileEnvironment(root, historyTableFontValues) !==
        certificate.profileEnvironment ||
      incoming.authoredSerialization !== certificate.authoredSerialization
    )
      return false;
    const tables: PreparedTable[] = [];
    const ordered = [root, ...incoming.orderedElements];
    if (incoming.tables.length !== certificate.tableIndices.length) return false;
    for (const [index, item] of incoming.tables.entries()) {
      const prepared = readPreparedTableGeometry(item.root);
      const indices = certificate.tableIndices[index];
      if (
        !indices ||
        item.ordinal !== index ||
        ordered[indices[0]] !== item.root ||
        ordered[indices[1]] !== item.table ||
        prepared?.table !== item.table
      )
        return false;
      tables.push(prepared);
    }
    if (!inBudget()) return false;
    if (
      tables.length !== certificate.projection.length ||
      tables.some(
        (table, index) =>
          JSON.stringify([
            normalizedAttributes(table.root, tables, true, root),
            table.rail ? normalizedAttributes(table.rail, tables, true, root) : null,
            table.spacer ? normalizedAttributes(table.spacer, tables, true, root) : null,
          ]) !== certificate.projection[index],
      )
    )
      return false;
    for (const table of tables) {
      if (
        table.rail &&
        (Array.from(table.rail.style).some((name) => name !== 'pointer-events') ||
          Array.from(table.rail.attributes).some(
            (attribute) =>
              ![
                'data-table-scroll-rail',
                'role',
                'aria-label',
                'aria-controls',
                'inert',
                'aria-hidden',
                'tabindex',
                'style',
              ].includes(attribute.name),
          ))
      )
        return false;
      if (
        table.spacer &&
        (Array.from(table.spacer.style).some((name) => name !== 'inline-size') ||
          Array.from(table.spacer.attributes).some(
            (attribute) => !['data-table-scroll-rail-spacer', 'style'].includes(attribute.name),
          ))
      )
        return false;
    }
    if (
      !unreferencedHistoryTableIds(root, tables, certificate.generatedIds) ||
      serializeHistoryTableAuthored(root, tables, true) !== certificate.authoredSerialization ||
      !owned() ||
      !inBudget()
    )
      return false;
    const roleProbes = new Map<string, HTMLElement>();
    for (const [role, index] of certificate.roleIndices) {
      const element = ordered[index];
      const [ordinal, tag, align] = role.split(':');
      if (
        !(element instanceof HTMLTableCellElement) ||
        element.localName !== tag ||
        (element.getAttribute('align') ?? '') !== align ||
        element.closest('table') !== tables[Number(ordinal)]?.table
      )
        return false;
      roleProbes.set(role, element);
    }
    if (roleProbes.size !== certificate.roles.length) return false;
    for (const [role, values] of certificate.roles) {
      const element = roleProbes.get(role);
      if (
        !element ||
        JSON.stringify(historyTableFontValues(getComputedStyle(element))) !== JSON.stringify(values)
      )
        return false;
    }
    const expectedOutside = new Map<HTMLElement, readonly [string, readonly string[]]>();
    for (const [index, text, values] of certificate.outsideFonts) {
      const element = ordered[index];
      if (!(element instanceof HTMLElement)) return false;
      expectedOutside.set(element, [text, values]);
    }
    const tableSet = new Set(tables.map((table) => table.table));
    const projectionSet = new Set(tables.flatMap((table) => [table.rail, table.spacer]));
    const walker = root.ownerDocument.createTreeWalker(root, NodeFilter.SHOW_ELEMENT, {
      acceptNode: (node) =>
        (node instanceof HTMLTableElement && tableSet.has(node)) ||
        (node instanceof HTMLElement && projectionSet.has(node))
          ? NodeFilter.FILTER_REJECT
          : NodeFilter.FILTER_ACCEPT,
    });
    let outside: Node | null = root;
    let observedOutside = 0;
    while (outside) {
      if (outside instanceof HTMLElement && outside.localName !== 'script') {
        const style = getComputedStyle(outside);
        if (visible(outside, style)) {
          const text = Array.from(outside.childNodes)
            .filter((node) => node.nodeType === Node.TEXT_NODE)
            .map((node) => node.textContent ?? '')
            .join('')
            .trim();
          if (text) {
            const expected = expectedOutside.get(outside);
            if (
              expected?.[0] !== text ||
              JSON.stringify(historyTableFontValues(style)) !== JSON.stringify(expected[1])
            )
              return false;
            observedOutside++;
          }
        }
      }
      outside = walker.nextNode();
    }
    if (observedOutside !== expectedOutside.size) return false;
    if (!inBudget()) return false;
    const elements: HTMLElement[] = [];
    for (const index of certificate.elementIndices) {
      const element = ordered[index];
      if (!(element instanceof HTMLElement)) return false;
      elements.push(element);
    }
    const stableTables = (): boolean =>
      tables.every((previous) => {
        const current = readPreparedTableGeometry(previous.root);
        return (
          current?.table === previous.table &&
          current.rail === previous.rail &&
          current.spacer === previous.spacer &&
          current.generation === previous.generation &&
          current.geometryVersion === previous.geometryVersion
        );
      });
    const knownRecord = (record: MutationRecord, preparation: boolean): boolean => {
      if (
        knownHistoryTableAnnouncementRecord(record, root) ||
        knownHistoryTablePaintRecord(record, root)
      )
        return true;
      const target = record.target;
      if (
        record.type === 'attributes' &&
        target === root &&
        [
          'data-reading-position-status',
          'data-reading-position-reason',
          'data-history-presentation-eligibility',
          'aria-busy',
        ].includes(record.attributeName ?? '')
      )
        return true;
      const table = tables.find(
        (item) => item.root === target || item.rail === target || item.spacer === target,
      );
      if (!table)
        return (
          preparation &&
          record.type === 'childList' &&
          tables.some(
            (item) =>
              item.root.parentNode === target &&
              record.removedNodes.length === 0 &&
              Array.from(record.addedNodes).every((node) => node === item.rail),
          )
        );
      if (record.type === 'childList')
        return (
          preparation &&
          target === table.rail &&
          record.removedNodes.length === 0 &&
          Array.from(record.addedNodes).every((node) => node === table.spacer)
        );
      if (record.type !== 'attributes') return false;
      if (target === table.root)
        return (
          preparation &&
          ['id', 'data-overflow', 'data-fade-left', 'data-fade-right'].includes(
            record.attributeName ?? '',
          )
        );
      if (target === table.spacer) return preparation && record.attributeName === 'style';
      if (['inert', 'aria-hidden', 'tabindex'].includes(record.attributeName ?? '')) return true;
      if (
        preparation &&
        ['data-table-scroll-rail', 'role', 'aria-label', 'aria-controls'].includes(
          record.attributeName ?? '',
        )
      )
        return true;
      return (
        record.attributeName === 'style' &&
        (preparation ||
          canonicalRailStyle(root.ownerDocument, record.oldValue) ===
            canonicalRailStyle(root.ownerDocument, (target as HTMLElement).getAttribute('style')))
      );
    };
    const state: CachedProof = {
      proof: null,
      reason: () => failureReason,
      invalidated: (reason) => {
        if (!failureReason.startsWith('current:') && !failureReason.startsWith('mutation:'))
          failureReason = `invalidated:${reason}`;
      },
      current: () => false,
      flush: () => false,
      dispose: () => undefined,
    };
    const invalidate = (): void => {
      if (cache.get(root) === state) invalidateHistoryTableProof(root);
    };
    observer = new MutationObserver((records) => {
      if (!records.every((record) => knownRecord(record, false)) || !stableTables()) {
        failureReason = `mutation:${records[0]?.type ?? 'unknown'}:${records[0]?.attributeName ?? ''}`;
        invalidate();
      }
    });
    observer.observe(root.ownerDocument.documentElement, {
      subtree: true,
      childList: true,
      attributes: true,
      characterData: true,
      attributeOldValue: true,
    });
    handoffFinished = true;
    const records = incoming.finishHandoff();
    if (!records || !stableTables() || !records.every((record) => knownRecord(record, true)))
      return false;
    const preparedSlots = new Map<Node, Set<string>>();
    for (const record of records) {
      if (
        record.target === root ||
        knownHistoryTableAnnouncementRecord(record, root) ||
        knownHistoryTablePaintRecord(record, root)
      )
        continue;
      const slot =
        record.type === 'attributes'
          ? (record.attributeName ?? '')
          : `#children:${tables.findIndex((table) => table.rail === record.addedNodes[0] || table.spacer === record.addedNodes[0]).toString()}`;
      const slots = preparedSlots.get(record.target) ?? new Set<string>();
      // 既知prepareは各投影slotを一度だけ書く。未知変更を戻しただけの履歴は採用しない。
      if (slots.has(slot)) return false;
      slots.add(slot);
      preparedSlots.set(record.target, slots);
      if (record.type === 'attributes' && record.oldValue !== null) return false;
    }
    invalidateHistoryTableProof(root);
    const lifecycle = new AbortController();
    Object.assign(state, {
      proof: null,
      current: () => {
        const fail = (reason: string): false => {
          failureReason = `current:${reason}`;
          return false;
        };
        if (!persistentOwner()) return fail('owner');
        if (filledHistoryAnimation(root)) return fail('filled-animation');
        if (!profile.current()) return fail('css-inventory');
        if (!stableTables()) return fail('prepared-tables');
        if (root.ownerDocument.fonts.status !== 'loaded') return fail('font-status');
        if (fontFaces(root.ownerDocument) !== certificate.fonts) return fail('font-faces');
        if (
          historyTableProfileEnvironment(root, historyTableFontValues) !==
          certificate.profileEnvironment
        )
          return fail('profile-environment');
        return persistentOwner() || fail('owner-after-current');
      },
      flush: () =>
        stableTables() &&
        (observer?.takeRecords() ?? []).every((record) => knownRecord(record, false)),
      dispose: () => {
        try {
          observer?.disconnect();
        } finally {
          try {
            stopContext();
          } finally {
            lifecycle.abort();
          }
        }
      },
    });
    cache.set(root, state);
    stopContext = subscribeContentContext(() => {
      if (!persistentOwner()) invalidate();
    });
    root.ownerDocument.fonts.addEventListener(
      'loading',
      () => {
        if (root.ownerDocument.fonts.status === 'loading') invalidate();
      },
      { signal: lifecycle.signal },
    );
    window.addEventListener('resize', invalidate, { signal: lifecycle.signal });
    if (!owned() || !state.current() || !state.flush() || !inBudget()) {
      invalidate();
      return false;
    }
    // glyph/構造の証明を共有しても、次の離脱で参照検査する生成IDは現在DOMへ結び直す。
    const reboundCertificate: HistoryTableCertificate = Object.freeze({
      ...certificate,
      generatedIds: Object.freeze(
        tables.map((table) => table.generatedRootId).filter((id): id is string => id !== null),
      ),
    });
    certificates.add(reboundCertificate);
    state.proof = Object.freeze({
      tables: Object.freeze(tables),
      elements: Object.freeze(elements),
      structure: certificate.structure,
      text: certificate.text,
      fontFingerprint: certificate.fontFingerprint,
      environment: certificate.environment,
      preparedMilliseconds: performance.now() - started,
      maximumChunkMilliseconds: performance.now() - started,
      certificate: reboundCertificate,
    });
    adopted = true;
    if (diagnosticOwner && sameOwner(diagnosticOwner, readHistoryTableDiagnosticOwner(root))) {
      diagnosticGenerations.set(root, {});
      diagnostics.set(
        root,
        Object.freeze({
          ...diagnosticOwner,
          preparation: Object.freeze({
            outcome: 'ready',
            elapsedMilliseconds: performance.now() - started,
            reason: 'adopted-portable-certificate',
          }),
          capture: null,
        }),
      );
    }
    recordHistoryTableCapture(root, 'ready', performance.now() - started, diagnosticOwner);
    return true;
  } catch {
    return false;
  } finally {
    if (!handoffFinished) {
      try {
        incoming?.finishHandoff();
      } catch {
        /* 失敗したhandoffを通常位置復元へ波及させない。 */
      }
    }
    if (!adopted) {
      try {
        observer?.disconnect();
      } catch {
        /* 位置jobへ清掃例外を渡さない。 */
      }
      try {
        stopContext();
      } catch {
        /* 別の所有者の通常復元を優先する。 */
      }
    }
  }
};

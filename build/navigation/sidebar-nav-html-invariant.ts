import * as parse5 from 'parse5';
import type { DefaultTreeAdapterMap } from 'parse5';
import { parseSidebarGroupId } from '../../shared/navigation/sidebar-group-id.js';
import {
  assertValidSidebarId,
  assertValidSidebarStateScopeId,
} from '../../shared/navigation/sidebar-identity-contract.js';
import type { SidebarNavRow } from '../../shared/navigation/navigation-types.js';

export class SidebarNavHtmlInvariantError extends Error {
  override name = 'SidebarNavHtmlInvariantError' as const;
}

type Parse5Node = DefaultTreeAdapterMap['node'];
type Parse5ChildNode = DefaultTreeAdapterMap['childNode'];
type Parse5ParentNode = DefaultTreeAdapterMap['parentNode'];
type Parse5Element = DefaultTreeAdapterMap['element'];
type Parse5DocumentFragment = DefaultTreeAdapterMap['documentFragment'];

export type SidebarNavHtmlInvariantMode = 'ssr-build' | 'artifact-extraction' | 'test-fixture';

export interface SidebarNavHtmlInvariantInput {
  readonly mode: SidebarNavHtmlInvariantMode;
  readonly sourceLabel: string;
  readonly sidebarPresent: boolean;
  readonly navHtml: string | null | undefined;
  readonly selectedId: string | null;
  readonly sidebarId?: string | null;
  readonly stateScopeId?: string | null;
  readonly initialExpandedIds: readonly string[];
  readonly topologyRevision: string | null | undefined;
  readonly sidebarRows?: readonly SidebarNavRow[];
}

export type ValidateSidebarNavHtmlInvariantInput = SidebarNavHtmlInvariantInput;

interface ParsedNavRow {
  readonly id: string;
  readonly kind: 'branch' | 'leaf' | 'invalid';
  readonly depth: number;
  readonly parentId: string | null;
  readonly siblingCount: number;
  readonly element: Parse5Element;
  readonly directControl: Parse5Element | null;
  readonly directGroup: Parse5Element | null;
}

const isElementNode = (node: Parse5Node): node is Parse5Element =>
  'tagName' in node && typeof node.tagName === 'string' && Array.isArray(node.attrs);

const isParentNode = (node: Parse5Node): node is Parse5ParentNode => {
  const candidate = node as { childNodes?: unknown };
  return Array.isArray(candidate.childNodes);
};

const getAttribute = (element: Parse5Element, name: string): string | null =>
  element.attrs.find((attribute) => attribute.name === name)?.value ?? null;

const hasAttribute = (element: Parse5Element, name: string): boolean =>
  element.attrs.some((attribute) => attribute.name === name);

const directElementChildren = (node: Parse5ParentNode): Parse5Element[] =>
  node.childNodes.filter((childNode): childNode is Parse5Element => isElementNode(childNode));

const isCommentNode = (node: Parse5ChildNode): boolean => node.nodeName === '#comment';

const isWhitespaceNode = (node: Parse5ChildNode): boolean =>
  !isCommentNode(node) &&
  'value' in node &&
  typeof node.value === 'string' &&
  node.value.trim().length === 0;

const visibleTopLevelChildren = (fragment: Parse5DocumentFragment): Parse5ChildNode[] =>
  fragment.childNodes.filter((childNode) => !isWhitespaceNode(childNode));

const toTrimmedString = (value: string | null | undefined): string =>
  typeof value === 'string' ? value.trim() : '';

function fail(sourceLabel: string, message: string): never {
  throw new SidebarNavHtmlInvariantError(`[sidebar-nav-html:${sourceLabel}] ${message}`);
}

const flattenRows = (rows: readonly SidebarNavRow[]): SidebarNavRow[] =>
  rows.flatMap((row) => [row, ...flattenRows(row.children)]);

const collectRows = (root: Parse5ParentNode, sourceLabel: string): ParsedNavRow[] => {
  const rows: ParsedNavRow[] = [];

  const visit = (list: Parse5Element, parentId: string | null): void => {
    const directChildren = directElementChildren(list);
    const nonRowChildren = directChildren.filter((child) => child.tagName !== 'li');
    if (nonRowChildren.length > 0) {
      fail(sourceLabel, 'sidebar nav ul direct children must all be li rows.');
    }

    const listRows = directChildren.filter((child) => child.tagName === 'li');
    const siblingCount = listRows.length;
    for (const rowElement of listRows) {
      const id = toTrimmedString(getAttribute(rowElement, 'data-node-id'));
      const rawKind = getAttribute(rowElement, 'data-node-kind');
      const kind = rawKind === 'branch' || rawKind === 'leaf' ? rawKind : 'invalid';
      const rawDepth = toTrimmedString(getAttribute(rowElement, 'data-node-depth'));
      const depth = Number.parseInt(rawDepth, 10);
      const directChildren = directElementChildren(rowElement);
      const directControls = directChildren.filter((child) =>
        child.attrs.some((attribute) => attribute.name === 'data-sidebar-nav-control'),
      );
      const directGroups = directChildren.filter((child) => child.tagName === 'ul');

      if (directControls.length > 1) {
        fail(
          sourceLabel,
          `sidebar nav row ${id || '(missing id)'} must not have multiple direct child controls.`,
        );
      }
      if (directGroups.length > 1) {
        fail(
          sourceLabel,
          `sidebar nav row ${id || '(missing id)'} must not have multiple direct child groups.`,
        );
      }

      const directControl = directControls[0] ?? null;
      const directGroup = directGroups[0] ?? null;

      rows.push({
        id,
        kind,
        depth: Number.isFinite(depth) ? depth : Number.NaN,
        parentId,
        siblingCount,
        element: rowElement,
        directControl,
        directGroup,
      });

      if (directGroup !== null) {
        visit(directGroup, id);
      }
    }
  };

  for (const list of directElementChildren(root).filter((child) => child.tagName === 'ul')) {
    visit(list, null);
  }

  return rows;
};

const collectAriaCurrentElements = (
  node: Parse5ParentNode,
  result: Parse5Element[] = [],
): Parse5Element[] => {
  for (const childNode of node.childNodes) {
    if (isElementNode(childNode) && hasAttribute(childNode, 'aria-current')) {
      result.push(childNode);
    }

    if (isParentNode(childNode)) {
      collectAriaCurrentElements(childNode, result);
    }
  }

  return result;
};

const collectElementsWithAttribute = (
  node: Parse5ParentNode,
  attributeName: string,
  result: Parse5Element[] = [],
): Parse5Element[] => {
  for (const childNode of node.childNodes) {
    if (isElementNode(childNode) && hasAttribute(childNode, attributeName)) {
      result.push(childNode);
    }

    if (isParentNode(childNode)) {
      collectElementsWithAttribute(childNode, attributeName, result);
    }
  }

  return result;
};

const readTrueMarker = (
  element: Parse5Element,
  attributeName: 'data-current-branch' | 'data-current-path-indicator',
  rowId: string,
  sourceLabel: string,
): boolean => {
  const value = getAttribute(element, attributeName);
  if (value === null) {
    return false;
  }
  if (value !== 'true') {
    fail(sourceLabel, `sidebar nav row ${rowId} has invalid ${attributeName} value.`);
  }
  return true;
};

const collectAncestorIds = (
  rowById: ReadonlyMap<string, ParsedNavRow>,
  row: ParsedNavRow,
): Set<string> => {
  const ancestors = new Set<string>();
  let currentParentId = row.parentId;
  while (currentParentId !== null) {
    const parent = rowById.get(currentParentId);
    if (parent === undefined) {
      break;
    }
    ancestors.add(parent.id);
    currentParentId = parent.parentId;
  }
  return ancestors;
};

const assertAbsentProjection = (input: SidebarNavHtmlInvariantInput, sourceLabel: string): void => {
  if (toTrimmedString(input.navHtml).length > 0) {
    fail(sourceLabel, 'absent sidebar projection must not contain navHtml.');
  }

  if (input.selectedId !== null) {
    fail(sourceLabel, 'absent sidebar projection must have selectedId=null.');
  }

  if (input.initialExpandedIds.length > 0) {
    fail(sourceLabel, 'absent sidebar projection must have empty initialExpandedIds.');
  }

  if (input.topologyRevision !== null && input.topologyRevision !== undefined) {
    fail(sourceLabel, 'absent sidebar projection must have topologyRevision=null.');
  }
};

const assertNoDuplicateIds = (
  values: readonly string[],
  sourceLabel: string,
  label: string,
): void => {
  const seen = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) {
      fail(sourceLabel, `${label} must not contain duplicate id: ${value}`);
    }
    seen.add(value);
  }
};

const assertSetEquals = (
  actual: readonly string[],
  expected: readonly string[],
  sourceLabel: string,
  label: string,
): void => {
  const normalizedActual = [...new Set(actual)].sort();
  const normalizedExpected = [...new Set(expected)].sort();
  if (
    normalizedActual.length !== normalizedExpected.length ||
    normalizedActual.some((value, index) => value !== normalizedExpected[index])
  ) {
    fail(
      sourceLabel,
      `${label} mismatch: actual=${JSON.stringify(normalizedActual)} expected=${JSON.stringify(
        normalizedExpected,
      )}`,
    );
  }
};

export const validateSidebarNavHtmlInvariant = (input: SidebarNavHtmlInvariantInput): void => {
  const sourceLabel = `${input.mode}:${input.sourceLabel}`;

  if (!input.sidebarPresent) {
    assertAbsentProjection(input, sourceLabel);
    return;
  }

  const navHtml = toTrimmedString(input.navHtml);
  if (navHtml.length === 0) {
    fail(sourceLabel, 'present sidebar projection must contain non-empty navHtml.');
  }

  if (toTrimmedString(input.topologyRevision).length === 0) {
    fail(sourceLabel, 'present sidebar projection must contain non-empty topologyRevision.');
  }

  assertNoDuplicateIds(input.initialExpandedIds, sourceLabel, 'initialExpandedIds');

  const sidebarId = (() => {
    try {
      return assertValidSidebarId(input.sidebarId, 'sidebarId');
    } catch (error) {
      fail(sourceLabel, error instanceof Error ? error.message : 'sidebarId is invalid.');
    }
  })();
  const stateScopeId = (() => {
    try {
      return assertValidSidebarStateScopeId(input.stateScopeId, 'stateScopeId');
    } catch (error) {
      fail(sourceLabel, error instanceof Error ? error.message : 'stateScopeId is invalid.');
    }
  })();
  const expectedRows = input.sidebarRows === undefined ? null : flattenRows(input.sidebarRows);
  if (expectedRows !== null && expectedRows.length === 0) {
    fail(sourceLabel, 'present sidebar projection must contain at least one sidebar row.');
  }

  const fragment = parse5.parseFragment(navHtml);
  if (fragment.childNodes.some((childNode) => isCommentNode(childNode))) {
    fail(sourceLabel, 'navHtml must not contain top-level comment nodes.');
  }

  const topLevelChildren = visibleTopLevelChildren(fragment);
  const topLevelChild = topLevelChildren[0];
  if (
    topLevelChildren.length !== 1 ||
    topLevelChild === undefined ||
    !isElementNode(topLevelChild)
  ) {
    fail(sourceLabel, 'navHtml must be a single top-level nav[data-sidebar-nav] fragment.');
  }

  const nav = topLevelChild;
  if (nav.tagName !== 'nav' || !hasAttribute(nav, 'data-sidebar-nav')) {
    fail(sourceLabel, 'navHtml top-level element must be nav[data-sidebar-nav].');
  }

  if (nav.childNodes.some((childNode) => isCommentNode(childNode))) {
    fail(sourceLabel, 'nav[data-sidebar-nav] must not contain direct child comment nodes.');
  }

  const directNavChildren = directElementChildren(nav);
  const directLists = directNavChildren.filter((child) => child.tagName === 'ul');
  const directList = directLists[0];
  if (directList === undefined || directLists.length !== 1 || directNavChildren.length !== 1) {
    fail(sourceLabel, 'nav[data-sidebar-nav] must have exactly one direct child ul.');
  }

  const navElements = collectRows(nav, sourceLabel);
  const rootRows = directElementChildren(directList).filter((child) => child.tagName === 'li');
  if (rootRows.length === 0) {
    fail(sourceLabel, 'nav[data-sidebar-nav] direct child ul must contain at least one li row.');
  }

  const navSidebarId = toTrimmedString(getAttribute(nav, 'data-sidebar-id'));
  if (navSidebarId !== sidebarId) {
    fail(sourceLabel, 'navHtml data-sidebar-id must match sidebarId.');
  }

  const navTopologyRevision = toTrimmedString(getAttribute(nav, 'data-topology-revision'));
  if (navTopologyRevision !== toTrimmedString(input.topologyRevision)) {
    fail(sourceLabel, 'navHtml data-topology-revision must match topologyRevision.');
  }

  const rowById = new Map<string, ParsedNavRow>();

  const rowElements = new Set<Parse5Element>(navElements.map((row) => row.element));
  for (const markerName of ['data-current-branch', 'data-current-path-indicator'] as const) {
    for (const markerElement of collectElementsWithAttribute(nav, markerName)) {
      if (!rowElements.has(markerElement)) {
        fail(sourceLabel, `${markerName} is only allowed on sidebar nav row li elements.`);
      }
    }
  }

  const expandedBranchIds: string[] = [];
  const selectedLeafIds: string[] = [];

  for (const row of navElements) {
    if (row.id.length === 0) {
      fail(sourceLabel, 'sidebar nav row data-node-id is required.');
    }

    if (rowById.has(row.id)) {
      fail(sourceLabel, `duplicate sidebar nav row id: ${row.id}`);
    }
    rowById.set(row.id, row);

    if (row.kind === 'invalid') {
      fail(sourceLabel, `sidebar nav row ${row.id} has invalid data-node-kind.`);
    }

    if (!Number.isInteger(row.depth) || row.depth < 0) {
      fail(sourceLabel, `sidebar nav row ${row.id} has invalid data-node-depth.`);
    }

    if (row.parentId === null && row.depth !== 0) {
      fail(sourceLabel, `root sidebar nav row ${row.id} must have data-node-depth=0.`);
    }

    if (row.parentId !== null) {
      const parent = rowById.get(row.parentId);
      if (parent === undefined || row.depth !== parent.depth + 1) {
        fail(sourceLabel, `sidebar nav row ${row.id} data-node-depth must be parent depth + 1.`);
      }
    }

    const directControl = row.directControl;
    if (directControl === null) {
      fail(sourceLabel, `sidebar nav row ${row.id} must have a direct child control.`);
    }

    const ariaCurrent = getAttribute(directControl, 'aria-current');

    if (row.kind === 'leaf') {
      if (directControl.tagName !== 'a' || !hasAttribute(directControl, 'data-sidebar-nav-link')) {
        fail(sourceLabel, `leaf row ${row.id} must have a direct child a[data-sidebar-nav-link].`);
      }

      if (row.directGroup !== null) {
        fail(sourceLabel, `leaf row ${row.id} must not have a direct child ul.`);
      }

      const directBranchControlButtons = directElementChildren(row.element).filter(
        (child) =>
          child.tagName === 'button' && hasAttribute(child, 'data-sidebar-nav-branch-control'),
      );
      if (directBranchControlButtons.length > 0) {
        fail(sourceLabel, `leaf row ${row.id} must not have a direct child branch button.`);
      }

      const href = toTrimmedString(getAttribute(directControl, 'href'));
      if (href.length === 0) {
        fail(sourceLabel, `leaf row ${row.id} must have non-empty href.`);
      }

      if (getAttribute(directControl, 'data-link-kind') !== 'internal-document') {
        fail(sourceLabel, `leaf row ${row.id} link must have data-link-kind="internal-document".`);
      }

      if (getAttribute(directControl, 'data-link-surface') !== 'navigation') {
        fail(sourceLabel, `leaf row ${row.id} link must have data-link-surface="navigation".`);
      }

      if (hasAttribute(directControl, 'data-external')) {
        fail(sourceLabel, `leaf row ${row.id} link must not have data-external.`);
      }

      if (row.id === input.selectedId) {
        if (ariaCurrent !== 'page') {
          fail(sourceLabel, `selected leaf row ${row.id} must have aria-current="page".`);
        }
        selectedLeafIds.push(row.id);
      } else if (ariaCurrent !== null) {
        fail(sourceLabel, `non-selected leaf row ${row.id} must not have aria-current.`);
      }
      continue;
    }

    if (
      directControl.tagName !== 'button' ||
      !hasAttribute(directControl, 'data-sidebar-nav-branch-control')
    ) {
      fail(sourceLabel, `branch row ${row.id} must have a direct child branch button.`);
    }

    if (ariaCurrent !== null) {
      fail(sourceLabel, `branch row ${row.id} must not have aria-current.`);
    }

    const directGroup = row.directGroup;
    if (directGroup === null) {
      fail(sourceLabel, `branch row ${row.id} must have a direct child ul group.`);
    }

    const childRows = directElementChildren(directGroup).filter((child) => child.tagName === 'li');
    if (childRows.length === 0) {
      fail(sourceLabel, `branch row ${row.id} must not have an empty child group.`);
    }

    const expanded = getAttribute(directControl, 'aria-expanded');
    if (expanded !== 'true' && expanded !== 'false') {
      fail(sourceLabel, `branch row ${row.id} must have aria-expanded true/false.`);
    }

    const groupId = toTrimmedString(getAttribute(directGroup, 'id'));
    const controls = toTrimmedString(getAttribute(directControl, 'aria-controls'));
    if (groupId.length === 0 || controls !== groupId) {
      fail(sourceLabel, `branch row ${row.id} aria-controls must match direct child group id.`);
    }

    const groupIdentity = parseSidebarGroupId(groupId);
    if (groupIdentity === null) {
      fail(sourceLabel, `branch row ${row.id} has invalid sidebar group id.`);
    }

    if (
      groupIdentity.sidebarId !== sidebarId ||
      groupIdentity.stateScopeId !== stateScopeId ||
      groupIdentity.rowId !== row.id
    ) {
      fail(
        sourceLabel,
        `branch row ${row.id} group id must encode stateScopeId, sidebarId and row id.`,
      );
    }

    if ((expanded === 'false') !== hasAttribute(directGroup, 'hidden')) {
      fail(sourceLabel, `branch row ${row.id} aria-expanded and hidden must be consistent.`);
    }

    if (expanded === 'true') {
      expandedBranchIds.push(row.id);
    }
  }

  const ariaCurrentElements = collectAriaCurrentElements(nav);
  if (ariaCurrentElements.some((element) => getAttribute(element, 'aria-current') !== 'page')) {
    fail(sourceLabel, 'nav aria-current value must be exactly "page".');
  }

  const selectedId = input.selectedId;
  if (selectedId === null) {
    if (ariaCurrentElements.length !== 0) {
      fail(sourceLabel, 'nav must not contain aria-current when selectedId is null.');
    }
  } else {
    const selectedRow = rowById.get(selectedId);
    if (selectedRow === undefined || selectedRow.kind !== 'leaf') {
      fail(sourceLabel, `selectedId ${selectedId} must identify a leaf row in navHtml.`);
    }

    if (selectedLeafIds.length !== 1 || ariaCurrentElements.length !== 1) {
      fail(sourceLabel, 'nav must contain exactly one selected leaf aria-current="page".');
    }
  }

  assertSetEquals(expandedBranchIds, input.initialExpandedIds, sourceLabel, 'initialExpandedIds');

  const selectedRowForPath = selectedId === null ? null : (rowById.get(selectedId) ?? null);
  const inferredCurrentAncestorIds =
    selectedRowForPath === null
      ? new Set<string>()
      : collectAncestorIds(rowById, selectedRowForPath);
  assertSetEquals(
    input.initialExpandedIds,
    [...inferredCurrentAncestorIds],
    sourceLabel,
    'selected leaf ancestor initialExpandedIds',
  );

  for (const row of navElements) {
    const hasCurrentBranch = readTrueMarker(
      row.element,
      'data-current-branch',
      row.id,
      sourceLabel,
    );
    const hasCurrentPathIndicator = readTrueMarker(
      row.element,
      'data-current-path-indicator',
      row.id,
      sourceLabel,
    );
    const expectsCurrentBranch = row.kind === 'branch' && inferredCurrentAncestorIds.has(row.id);
    const expectsCurrentPathIndicator = expectsCurrentBranch && row.siblingCount > 1;

    if (hasCurrentBranch !== expectsCurrentBranch) {
      fail(sourceLabel, `data-current-branch mismatch for ${row.id}.`);
    }

    if (hasCurrentPathIndicator !== expectsCurrentPathIndicator) {
      fail(sourceLabel, `data-current-path-indicator mismatch for ${row.id}.`);
    }
  }

  if (expectedRows === null) {
    return;
  }

  if (expectedRows.length !== navElements.length) {
    fail(sourceLabel, 'sidebarRows and navHtml row count must match.');
  }

  for (const [index, expectedRow] of expectedRows.entries()) {
    const actualRow = navElements[index];
    if (actualRow === undefined) {
      fail(sourceLabel, `missing navHtml row at index ${String(index)}.`);
    }

    if (actualRow.id !== expectedRow.id || actualRow.kind !== expectedRow.kind) {
      fail(sourceLabel, `sidebarRows and navHtml row identity mismatch at index ${String(index)}.`);
    }

    if (actualRow.depth !== expectedRow.depth) {
      fail(sourceLabel, `sidebarRows and navHtml row depth mismatch for ${expectedRow.id}.`);
    }

    const hasCurrentBranch = readTrueMarker(
      actualRow.element,
      'data-current-branch',
      actualRow.id,
      sourceLabel,
    );
    const hasCurrentPathIndicator = readTrueMarker(
      actualRow.element,
      'data-current-path-indicator',
      actualRow.id,
      sourceLabel,
    );
    const expectsCurrentBranch = expectedRow.kind === 'branch' && expectedRow.hasCurrentDescendant;
    const expectsCurrentPathIndicator =
      expectedRow.kind === 'branch' &&
      expectedRow.hasCurrentDescendant &&
      expectedRow.showsCurrentPathIndicator;

    if (hasCurrentBranch !== expectsCurrentBranch) {
      fail(sourceLabel, `data-current-branch mismatch for ${expectedRow.id}.`);
    }

    if (hasCurrentPathIndicator !== expectsCurrentPathIndicator) {
      fail(sourceLabel, `data-current-path-indicator mismatch for ${expectedRow.id}.`);
    }
  }
};

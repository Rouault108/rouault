import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { renderNoteSidebarNav } from '../../build/navigation/render-note-sidebar-nav.js';
import { createSidebarGroupIdPrefixFromSidebarIdentity } from '../../shared/navigation/sidebar-group-id.js';
import type { SidebarNavRow } from '../../shared/navigation/navigation-types.js';
import { expectCssExcludes, expectCssIncludes } from './css-contract-test-helpers.js';
import {
  hasAllDeclarationValuesIncludingForSelectorContaining,
  hasDeclarationForSelectorContaining,
  hasNoDeclarationValueIncludingForSelectorContaining,
  hasOnlyAllowedDeclarationValuesForSelectorContaining,
  hasDeclarationValueNotIncludingForSelectorContaining,
  lacksDeclarationPropertyForSelectorContaining,
  listDeclarationsForSelectorContaining,
} from './support/css-contract.js';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const layoutSidebarCssPath = path.resolve(dirname, '../../src/assets/css/layout-sidebar.css');
const mainCss = readFileSync(layoutSidebarCssPath, 'utf8');

const hoverMedia = (params: string): boolean => /hover\s*:\s*hover/u.test(params) && /pointer\s*:\s*fine/u.test(params);

const currentPage = "[data-sidebar-nav-link][aria-current='page']";
const currentBranch =
  "li[data-current-branch='true'] > [data-sidebar-nav-control]:not([aria-current='page'])";
const currentPathIndicator = [
  "li[data-current-path-indicator='true']",
  '> button[data-sidebar-nav-control][data-sidebar-nav-branch-control]',
].join(' ');

const expectOnlyDeclarationPropertiesForSelector = (
  selectorFragment: string,
  selectorKind: 'element' | 'pseudo-before' | 'pseudo-after',
  allowedProperties: readonly string[],
): void => {
  const allowed = new Set(allowedProperties);
  const unexpected = listDeclarationsForSelectorContaining(mainCss, selectorFragment, {
    scope: 'screen',
    selectorKind,
  }).filter((declaration) => !allowed.has(declaration.property));

  expect(unexpected).toEqual([]);
};

const expectNoDeclarationPropertiesForSelector = (
  selectorFragment: string,
  selectorKind: 'element' | 'pseudo-before' | 'pseudo-after',
  forbiddenProperties: readonly string[],
): void => {
  const violations = forbiddenProperties.filter((property) =>
    !lacksDeclarationPropertyForSelectorContaining(mainCss, selectorFragment, property, {
      scope: 'screen',
      selectorKind,
    }),
  );

  expect(violations).toEqual([]);
};

const expectNoTransitionAllForSidebarNav = (): void => {
  const violations = listDeclarationsForSelectorContaining(mainCss, '[data-sidebar-nav]', {
    scope: 'screen',
    selectorKind: 'any',
  }).filter(
    (declaration) =>
      declaration.property === 'transition-property' &&
      declaration.value
        .split(/\s*,\s*/u)
        .map((value) => value.trim().toLowerCase())
        .includes('all'),
  );

  expect(violations).toEqual([]);
};

const forbiddenFragments = [
  '--accent-soft',
  '--fg-strong',
  'oklch(96% 0.02 240)',
  'color-mix(in oklab, var(--fg-default)',
] as const;

describe('sidebar nav explicit contract', () => {
  it('renderer が leaf / branch の両方に explicit metadata を付与すること', () => {
    const rows: readonly SidebarNavRow[] = [
      {
        id: 'music',
        label: 'Music',
        kind: 'branch',
        depth: 0,
        isCurrent: false,
        hasCurrentDescendant: true,
        showsCurrentPathIndicator: true,
        isInitiallyExpanded: true,
        children: [
          {
            id: 'music/mozart',
            label: 'Mozart',
            kind: 'leaf',
            href: '/notes/music/mozart',
            depth: 1,
            isCurrent: true,
            hasCurrentDescendant: false,
            showsCurrentPathIndicator: false,
            isInitiallyExpanded: false,
            children: [],
          },
        ],
      },
    ];

    const markup = renderNoteSidebarNav(rows, {
      sidebarId: 'note-primary',
      topologyRevision: 'topology:test',
      groupIdPrefix: createSidebarGroupIdPrefixFromSidebarIdentity('note-navigation', 'note-primary'),
    });

    expect(markup).toContain('data-sidebar-nav-control');
    expect(markup).toContain('data-sidebar-nav-branch-control');
    expect(markup).toContain('data-sidebar-nav-link');
    expect(markup).toContain('data-sidebar-nav-label');
    expect(markup).toContain('aria-current="page"');
    expect(markup).toContain('data-current-branch="true"');
    expect(markup).toContain('data-current-path-indicator="true"');
    expect(markup).toContain('stroke="currentColor"');
    expect(markup).toContain('focusable="false"');
    expect(markup).toContain('aria-hidden="true"');
    expect(markup).not.toContain('<a href="/notes/music/mozart" aria-current="page">Mozart</a>');
    expect(markup).not.toContain('<button type="button" aria-expanded="true"');
  });

  it('sidebar nav CSS が explicit selector だけを参照し legacy selector を持たないこと', () => {
    expectCssIncludes(mainCss, [
      '[data-sidebar-nav] [data-sidebar-nav-control]',
      '[data-sidebar-nav] [data-sidebar-nav-branch-control]',
      '[data-sidebar-nav] [data-sidebar-nav-link][aria-current=',
      "li[data-current-branch='true']",
      "li[data-current-path-indicator='true']",
      '[data-sidebar-nav] [data-sidebar-nav-control]:focus-visible',
    ]);

    expectCssExcludes(mainCss, [
      "[data-sidebar-nav] li[data-node-kind='branch'] > button",
      "[data-sidebar-nav] li[data-node-kind='leaf'] > a",
      '[data-sidebar-nav] button:focus-visible',
      '[data-sidebar-nav] a:focus-visible',
    ]);
  });

  it('raw sidebar nav は ::before を surface、::after を indicator として使うこと', () => {
    expect(
      hasDeclarationForSelectorContaining(mainCss, '[data-sidebar-nav-control]::before', 'content', "''", {
        scope: 'base',
        selectorKind: 'pseudo-before',
      }),
    ).toBe(true);
    expect(
      hasDeclarationForSelectorContaining(
        mainCss,
        '[data-sidebar-nav-control]::before',
        'background',
        'transparent',
        { scope: 'base', selectorKind: 'pseudo-before' },
      ),
    ).toBe(true);
    expect(
      hasAllDeclarationValuesIncludingForSelectorContaining(
        mainCss,
        `${currentPage}::before`,
        'background',
        '--sidebar-item-active-bg',
        { scope: 'base', selectorKind: 'pseudo-before' },
      ),
    ).toBe(true);
    expect(
      hasAllDeclarationValuesIncludingForSelectorContaining(
        mainCss,
        `${currentPage}::after`,
        'background',
        '--nav-item-indicator-color',
        { scope: 'base', selectorKind: 'pseudo-after' },
      ),
    ).toBe(true);
    expect(
      hasAllDeclarationValuesIncludingForSelectorContaining(
        mainCss,
        `${currentPathIndicator}::after`,
        'background',
        '--sidebar-item-current-branch-indicator-color',
        { scope: 'base', selectorKind: 'pseudo-after' },
      ),
    ).toBe(true);
  });

  it('current page 本体へ active background を直接塗らないこと', () => {
    expect(
      hasOnlyAllowedDeclarationValuesForSelectorContaining(
        mainCss,
        currentPage,
        'background',
        ['transparent'],
        { scope: 'base', selectorKind: 'element', requireDeclaration: false },
      ),
    ).toBe(true);
    expect(
      lacksDeclarationPropertyForSelectorContaining(mainCss, currentPage, 'background-color', {
        scope: 'base',
        selectorKind: 'element',
      }),
    ).toBe(true);
    expect(
      lacksDeclarationPropertyForSelectorContaining(mainCss, currentPage, 'background-image', {
        scope: 'base',
        selectorKind: 'element',
      }),
    ).toBe(true);
  });

  it('旧 current fallback と current branch ::before indicator が残っていないこと', () => {
    for (const forbidden of forbiddenFragments) {
      for (const selector of [currentPage, `${currentPage}::before`, `${currentPage}::after`]) {
        expect(
          hasNoDeclarationValueIncludingForSelectorContaining(mainCss, selector, forbidden, {
            scope: 'base',
            selectorKind: selector.endsWith('::before')
              ? 'pseudo-before'
              : selector.endsWith('::after')
                ? 'pseudo-after'
                : 'element',
          }),
        ).toBe(true);
      }

      expect(
        hasNoDeclarationValueIncludingForSelectorContaining(mainCss, `${currentBranch}::before`, forbidden, {
          scope: 'base',
          selectorKind: 'pseudo-before',
          allowMissingRule: true,
        }),
      ).toBe(true);
    }

    expect(
      hasOnlyAllowedDeclarationValuesForSelectorContaining(
        mainCss,
        `${currentBranch}::before`,
        'background',
        ['transparent'],
        {
          scope: 'base',
          selectorKind: 'pseudo-before',
          requireDeclaration: false,
        },
      ),
    ).toBe(true);
    expect(
      lacksDeclarationPropertyForSelectorContaining(mainCss, `${currentBranch}::before`, 'background-color', {
        scope: 'base',
        selectorKind: 'pseudo-before',
      }),
    ).toBe(true);
    expect(
      lacksDeclarationPropertyForSelectorContaining(mainCss, `${currentBranch}::before`, 'background-image', {
        scope: 'base',
        selectorKind: 'pseudo-before',
      }),
    ).toBe(true);
    expect(
      lacksDeclarationPropertyForSelectorContaining(mainCss, `${currentBranch}::after`, 'content', {
        scope: 'base',
        selectorKind: 'pseudo-after',
      }),
    ).toBe(true);
  });


  it('current path selector は paint / geometry / transition 契約を allowlist で固定すること', () => {
    const forbiddenProperties = [
      '--sidebar-item-active-bg',
      '--sidebar-item-current-branch-indicator-color',
      'background',
      'background-color',
      'background-image',
      'border',
      'border-block',
      'border-inline',
      'box-shadow',
      'content',
      'height',
      'inset',
      'inset-block',
      'inset-inline',
      'outline',
      'position',
      'transition',
      'width',
    ] as const;

    expectOnlyDeclarationPropertiesForSelector(currentBranch, 'element', ['font-weight']);
    expectNoDeclarationPropertiesForSelector(currentBranch, 'element', forbiddenProperties);
    expectOnlyDeclarationPropertiesForSelector(`${currentBranch}::before`, 'pseudo-before', []);
    expectOnlyDeclarationPropertiesForSelector(`${currentBranch}::after`, 'pseudo-after', []);

    expectOnlyDeclarationPropertiesForSelector(currentPathIndicator, 'element', ['position']);
    expectOnlyDeclarationPropertiesForSelector(`${currentPathIndicator}::after`, 'pseudo-after', [
      'background',
      'block-size',
      'border-radius',
      'content',
      'inline-size',
      'inset-block',
      'inset-inline-start',
      'pointer-events',
      'position',
      'z-index',
    ]);

    expect(
      lacksDeclarationPropertyForSelectorContaining(mainCss, '[data-sidebar-nav]', 'transition', {
        scope: 'screen',
        selectorKind: 'any',
      }),
    ).toBe(true);
    expectNoTransitionAllForSidebarNav();
    expect(
      hasDeclarationValueNotIncludingForSelectorContaining(
        mainCss,
        '[data-sidebar-nav]',
        'transition-property',
        'all',
        { scope: 'screen', selectorKind: 'any' },
      ),
    ).toBe(true);

    const currentBranchCustomPropertyDeclarations = listDeclarationsForSelectorContaining(
      mainCss,
      "li[data-current-branch='true']",
      { scope: 'screen', selectorKind: 'any' },
    ).filter((declaration) => declaration.property.startsWith('--'));
    expect(currentBranchCustomPropertyDeclarations).toEqual([]);
  });

  it('hover / forced-colors / reduced-motion の scope を分離していること', () => {
    expect(
      hasAllDeclarationValuesIncludingForSelectorContaining(
        mainCss,
        '[data-sidebar-nav-branch-control]:hover::before',
        'background',
        '--sidebar-item-branch-hover-bg',
        { mediaPredicate: hoverMedia, selectorKind: 'pseudo-before' },
      ),
    ).toBe(true);
    expect(
      hasDeclarationForSelectorContaining(
        mainCss,
        `${currentPage}::before`,
        'background',
        'Highlight',
        { scope: 'forced-colors', selectorKind: 'pseudo-before' },
      ),
    ).toBe(true);
    expect(
      hasDeclarationForSelectorContaining(
        mainCss,
        '[data-sidebar-nav-control]',
        'transition-property',
        'none',
        { scope: 'reduced-motion', selectorKind: 'element' },
      ),
    ).toBe(true);
    expect(
      hasDeclarationForSelectorContaining(
        mainCss,
        '[data-sidebar-nav-control]:focus-visible',
        'animation',
        'none',
        { scope: 'reduced-motion', selectorKind: 'element' },
      ),
    ).toBe(true);
  });
});

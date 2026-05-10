import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { renderNoteSidebarNav } from '../../build/navigation/render-note-sidebar-nav.js';
import type { SidebarNavRow } from '../../shared/navigation/navigation-types.js';
import { expectCssExcludes, expectCssIncludes } from './css-contract-test-helpers.js';
import {
  hasAllDeclarationValuesIncludingForSelectorContaining,
  hasDeclarationForSelectorContaining,
  hasNoDeclarationValueIncludingForSelectorContaining,
  hasOnlyAllowedDeclarationValuesForSelectorContaining,
  lacksDeclarationPropertyForSelectorContaining,
} from './support/css-contract.js';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const mainCssPath = path.resolve(dirname, '../../src/assets/css/main.css');
const mainCss = readFileSync(mainCssPath, 'utf8');

const hoverMedia = (params: string): boolean => /hover\s*:\s*hover/u.test(params) && /pointer\s*:\s*fine/u.test(params);

const currentPage = "[data-sidebar-nav-link][aria-current='page']";
const currentBranch =
  "li[data-current-branch='true'] > [data-sidebar-nav-control]:not([aria-current='page'])";
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
            isInitiallyExpanded: false,
            children: [],
          },
        ],
      },
    ];

    const markup = renderNoteSidebarNav(rows, {
      topologyRevision: 'topology:test',
    });

    expect(markup).toContain('data-sidebar-nav-control');
    expect(markup).toContain('data-sidebar-nav-branch-control');
    expect(markup).toContain('data-sidebar-nav-link');
    expect(markup).toContain('data-sidebar-nav-label');
    expect(markup).toContain('aria-current="page"');
    expect(markup).toContain('data-current-branch="true"');
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
        `${currentBranch}::after`,
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
        'transition',
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

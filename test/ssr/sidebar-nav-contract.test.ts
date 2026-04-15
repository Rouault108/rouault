import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { renderNoteSidebarNav } from '../../build/navigation/render-note-sidebar-nav.js';
import type { SidebarNavRow } from '../../shared/navigation/navigation-types.js';
import { expectCssExcludes, expectCssIncludes } from './css-contract-test-helpers.js';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const mainCssPath = path.resolve(dirname, '../../src/assets/css/main.css');
const mainCss = readFileSync(mainCssPath, 'utf8');

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
});
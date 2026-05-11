import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import postcss, { type AtRule, type Declaration, type Node, type Rule } from 'postcss';
import selectorParser from 'postcss-selector-parser';
import { describe, expect, it } from 'vitest';

const layoutHeaderPath = fileURLToPath(
  new URL('../../src/components/layout/layout-header.ts', import.meta.url),
);

const allowedContainerParams = new Set([
  'layout-header-shell (width < 400px)',
  'layout-header-shell (width < 640px)',
  'layout-header-shell (width >= 640px)',
  'layout-header-shell (width >= 1024px)',
]);

const forbiddenPlacementProps = (prop: string): boolean => {
  const normalized = prop.toLowerCase();

  return (
    normalized === 'position' ||
    normalized === 'left' ||
    normalized === 'right' ||
    normalized === 'top' ||
    normalized === 'bottom' ||
    normalized === 'transform' ||
    normalized === 'translate' ||
    normalized === 'rotate' ||
    normalized === 'scale' ||
    normalized === 'order' ||
    normalized === 'flex' ||
    normalized.startsWith('flex-') ||
    normalized === 'inline-size' ||
    normalized === 'min-inline-size' ||
    normalized === 'max-inline-size' ||
    normalized === 'width' ||
    normalized === 'min-width' ||
    normalized === 'max-width' ||
    normalized.startsWith('margin') ||
    normalized.startsWith('padding') ||
    normalized.startsWith('inset')
  );
};

const forbiddenStartPlacementTokens = new Set([
  '--layout-header-primary-start-offset',
  '--_layout-header-primary-start-offset',
  '--layout-header-start-leading-visual-reserve',
  '--_layout-header-start-leading-visual-reserve',
  '--_layout-header-start-leading-visual-reserve-min',
  '--layout-header-slot-group-gap',
  '--_layout-header-slot-group-gap-requested',
  '--_layout-header-start-slot-group-gap',
  '--layout-header-sidebar-toggle-visible-size',
  '--_layout-header-sidebar-toggle-visible-size',
  '--layout-header-sidebar-toggle-interaction-bleed',
  '--_layout-header-sidebar-toggle-interaction-bleed',
]);

const normalizeWhitespace = (value: string): string => value.trim().replace(/\s+/gu, ' ');

const extractLayoutHeaderCss = (source: string): string => {
  const marker = 'static override styles = css`';
  const markerIndex = source.indexOf(marker);
  expect(markerIndex, 'static override styles css template が見つかること').to.be.greaterThanOrEqual(
    0,
  );

  const start = markerIndex + marker.length;
  for (let index = start; index < source.length; index += 1) {
    if (source[index] !== '`') {
      continue;
    }

    let backslashCount = 0;
    for (let previous = index - 1; previous >= 0 && source[previous] === '\\'; previous -= 1) {
      backslashCount += 1;
    }

    if (backslashCount % 2 === 0) {
      return source.slice(start, index);
    }
  }

  throw new Error('layout-header の css tagged template 終端が見つかりません');
};

const parseSelector = (selector: string): selectorParser.Root =>
  selectorParser().astSync(selector);

const selectorHasAttribute = (selector: string, attribute: string): boolean => {
  let found = false;
  parseSelector(selector).walkAttributes((node) => {
    if (node.attribute === attribute) {
      found = true;
    }
  });

  return found;
};

const selectorHasClass = (selector: string, className: string): boolean => {
  let found = false;
  parseSelector(selector).walkClasses((node) => {
    if (node.value === className) {
      found = true;
    }
  });

  return found;
};

const selectorHasHost = (selector: string): boolean => {
  let found = false;
  parseSelector(selector).walkPseudos((node) => {
    if (node.value === ':host') {
      found = true;
    }
  });

  return found;
};

const selectorHasPageKindCondition = (selector: string): boolean =>
  selectorHasAttribute(selector, 'note-layout') || selectorHasAttribute(selector, 'sidebar-enabled');

const ruleSelectors = (rule: Rule): string[] =>
  parseSelector(rule.selector)
    .nodes.map((selector) => String(selector).trim())
    .filter((selector) => selector.length > 0);

const nearestContainerParams = (node: Node): string | null => {
  let parent = node.parent;
  while (parent !== undefined) {
    if (parent.type === 'atrule') {
      const atRule = parent as AtRule;
      if (atRule.name === 'container') {
        return normalizeWhitespace(atRule.params);
      }
    }
    parent = parent.parent;
  }

  return null;
};

const readCssRoot = async (): Promise<postcss.Root> => {
  const source = await readFile(layoutHeaderPath, 'utf8');
  return postcss.parse(extractLayoutHeaderCss(source), { from: layoutHeaderPath });
};

describe('layout-header CSS static contract', () => {
  it('layout-header-shell named container と range syntax だけを使うこと', async () => {
    const root = await readCssRoot();
    const containers: AtRule[] = [];
    root.walkAtRules('container', (rule) => {
      containers.push(rule);
    });

    expect(containers.length, '@container が存在すること').to.be.greaterThan(0);

    for (const rule of containers) {
      const params = normalizeWhitespace(rule.params);
      expect(params, `許可されていない @container params: ${params}`).to.satisfy((value: string) =>
        allowedContainerParams.has(value),
      );
      expect(params).not.to.match(/(?:min-width|max-width)/u);
    }
  });

  it('container query 内の :host z-index を使わず narrow-layout 属性で制御すること', async () => {
    const root = await readCssRoot();
    const violations: string[] = [];
    let hasNarrowLayoutZIndex = false;

    root.walkRules((rule) => {
      const selectors = ruleSelectors(rule);
      for (const declaration of (rule.nodes ?? []).filter(
        (node): node is Declaration => node.type === 'decl',
      )) {
        if (declaration.prop.toLowerCase() !== 'z-index') {
          continue;
        }

        if (nearestContainerParams(rule) !== null && selectors.some(selectorHasHost)) {
          violations.push(rule.selector);
        }

        if (selectors.includes(':host([narrow-layout])')) {
          hasNarrowLayoutZIndex = true;
        }
      }
    });

    expect(violations).to.deep.equal([]);
    expect(hasNarrowLayoutZIndex).to.equal(true);
  });

  it('note-layout / sidebar-enabled 条件で corpus-switcher の開始位置を直接変更しないこと', async () => {
    const root = await readCssRoot();
    const violations: string[] = [];

    root.walkRules((rule) => {
      for (const selector of ruleSelectors(rule)) {
        if (!selectorHasClass(selector, 'corpus-switcher') || !selectorHasPageKindCondition(selector)) {
          continue;
        }

        for (const declaration of (rule.nodes ?? []).filter(
          (node): node is Declaration => node.type === 'decl',
        )) {
          const prop = declaration.prop.toLowerCase();
          const value = declaration.value.toLowerCase();
          const containerParams = nearestContainerParams(rule);
          const isAllowedMobileDisplayNone =
            prop === 'display' &&
            value === 'none' &&
            containerParams === 'layout-header-shell (width < 640px)' &&
            selectorHasAttribute(selector, 'note-layout') &&
            selectorHasAttribute(selector, 'sidebar-enabled');

          if (isAllowedMobileDisplayNone) {
            continue;
          }

          if (prop === 'display' || forbiddenPlacementProps(prop)) {
            violations.push(`${selector} { ${declaration.prop}: ${declaration.value} }`);
          }
        }
      }
    });

    expect(violations).to.deep.equal([]);
  });

  it('start-slot-group / slot-group / host token override で corpus 開始位置を page kind 依存にしないこと', async () => {
    const root = await readCssRoot();
    const violations: string[] = [];

    root.walkRules((rule) => {
      for (const selector of ruleSelectors(rule)) {
        if (!selectorHasPageKindCondition(selector)) {
          continue;
        }

        const targetsStartGroup =
          selectorHasClass(selector, 'start-slot-group') || selectorHasClass(selector, 'slot-group');
        const targetsHost = selectorHasHost(selector);

        for (const declaration of (rule.nodes ?? []).filter(
          (node): node is Declaration => node.type === 'decl',
        )) {
          const prop = declaration.prop.toLowerCase();
          const isAllowedStartMinBlockSize =
            selectorHasAttribute(selector, 'sidebar-enabled') &&
            selectorHasClass(selector, 'start-slot-group') &&
            prop === 'min-block-size';

          if (isAllowedStartMinBlockSize) {
            continue;
          }

          if (targetsHost && forbiddenStartPlacementTokens.has(declaration.prop)) {
            violations.push(`${selector} { ${declaration.prop}: ${declaration.value} }`);
            continue;
          }

          if (targetsStartGroup && forbiddenPlacementProps(prop)) {
            violations.push(`${selector} { ${declaration.prop}: ${declaration.value} }`);
          }
        }
      }
    });

    expect(violations).to.deep.equal([]);
  });

  it('mobile の note-layout + sidebar-enabled corpus-switcher 非表示契約だけを例外として持つこと', async () => {
    const root = await readCssRoot();
    const displayNoneRules: string[] = [];

    root.walkRules((rule) => {
      for (const declaration of (rule.nodes ?? []).filter(
        (node): node is Declaration => node.type === 'decl',
      )) {
        if (declaration.prop.toLowerCase() !== 'display' || declaration.value.toLowerCase() !== 'none') {
          continue;
        }

        for (const selector of ruleSelectors(rule)) {
          if (selectorHasClass(selector, 'corpus-switcher')) {
            displayNoneRules.push(`${nearestContainerParams(rule) ?? 'none'} :: ${selector}`);
          }
        }
      }
    });

    expect(displayNoneRules).to.deep.equal([
      'layout-header-shell (width < 640px) :: :host([note-layout][sidebar-enabled]) .corpus-switcher',
    ]);
  });
});

import { readFileSync } from 'node:fs';
import postcss from 'postcss';
import { describe, expect, it } from 'vitest';

const css = readFileSync('src/assets/css/view-transition.css', 'utf8');
const root = postcss.parse(css);
const rules = (selector: string): Record<string, string> => {
  const properties: Record<string, string> = {};
  root.walkRules(selector, (rule) => {
    rule.walkDecls((declaration) => {
      properties[declaration.prop] = declaration.value;
    });
  });
  return properties;
};

describe('本文navigationの視覚境界', () => {
  it('document navigationにopt-inせず、寿命markerの間だけ本文をcaptureする', () => {
    expect(css).not.toContain('@view-transition');
    expect(rules('html[data-content-transition]')['view-transition-name']).toBe('none');
    expect(rules('html[data-content-transition] main#main-content')['view-transition-name']).toBe(
      'rouault-content',
    );
    const captured: string[] = [];
    root.walkDecls('view-transition-name', (declaration) => {
      captured.push(declaration.value);
    });
    expect(captured).toEqual(['none', 'rouault-content']);
  });

  it('寸法補間と旧文字の重なりを避け、snapshotが操作を遮らない', () => {
    expect(
      rules('html[data-content-transition]::view-transition-group(rouault-content)')['animation'],
    ).toBe('none');
    expect(
      rules('html[data-content-transition]::view-transition-old(rouault-content)')['display'],
    ).toBe('none');
    const combined = root.nodes.find(
      (node) => node.type === 'rule' && node.selector.includes('::view-transition,'),
    );
    expect(combined?.toString()).toContain('pointer-events: none');
    const changed: string[] = [];
    root.walkAtRules('keyframes', (keyframe) => {
      keyframe.walkDecls((declaration) => {
        changed.push(declaration.prop);
      });
    });
    expect(changed).toEqual(['opacity', 'opacity']);
    expect(css).not.toContain('opacity: 0;');
    expect(css).not.toMatch(/\b(?:transform|filter)\s*:/u);
  });

  it('動き抑制をCSSでも守る', () => {
    const media: string[] = [];
    root.walkAtRules('media', (node) => {
      media.push(node.toString());
    });
    expect(media.join('')).toContain('(prefers-reduced-motion: reduce)');
    expect(media.join('')).toContain('animation: none');
  });
});

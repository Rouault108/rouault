import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const source = readFileSync(resolve(process.cwd(), 'src/components/ui/select/select.ts'), 'utf8');

describe('select inline style contract', () => {
  it('uses fg-disabled for disabled options and selected disabled check icons', () => {
    expect(source).toContain("return 'var(--fg-disabled)';");
    expect(source).toContain('color: this._resolveOptionColor(opt)');
    expect(source).toContain("? 'var(--fg-disabled)'");
    expect(source).not.toContain("opacity: opt.disabled === true ? 'var(--opacity-disabled");
  });

  it('keeps disabled options out of active / selected forced-colors overrides', () => {
    expect(source).toContain(
      '[data-ui-select-option][aria-selected="true"]:not([aria-disabled="true"])',
    );
    expect(source).toContain('[data-ui-select-option]:hover:not([aria-disabled="true"])');
    expect(source).toContain(
      '[data-ui-select-option][data-active="true"]:not([aria-disabled="true"])',
    );
    expect(source).toContain('[data-ui-select-option][aria-disabled="true"]');
    expect(source).toContain('color: GrayText !important;');
    expect(source).toContain(
      '[data-ui-select-option][aria-selected="true"][aria-disabled="true"]',
    );
  });

  it('does not restore disabled active options to primary/default and uses affordance scrollbar', () => {
    expect(source).toContain('isActive && !isDisabled');
    expect(source).toContain('item.style.color = this._resolveOptionColor(opt);');
    expect(source).toContain(
      "scrollbarColor: 'var(--scrollbar-thumb, var(--fg-control-affordance)) transparent'",
    );
    expect(source).not.toContain("scrollbarColor: 'var(--border-default");
  });
});

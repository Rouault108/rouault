import { describe, expect, it } from 'vitest';
import { buildThemeChromeBootstrapScript } from '../../src/theme/theme-chrome-bootstrap.js';
import {
  THEME_CHROME_BOOTSTRAP_ICON_NAMES,
  THEME_UI_OPTIONS,
} from '../../src/theme/theme-ui-options.js';

describe('theme chrome bootstrap icon contract', () => {
  it('header chrome bootstrap icon registry is derived from theme option icons only', () => {
    const optionIcons = [...new Set(Object.values(THEME_UI_OPTIONS).map((option) => option.icon))];

    expect([...THEME_CHROME_BOOTSTRAP_ICON_NAMES].sort()).toEqual(optionIcons.sort());
    expect(THEME_CHROME_BOOTSTRAP_ICON_NAMES).not.toContain('check');
  });

  it('bootstrap script keeps selected theme item icon as the option-specific icon', () => {
    const script = buildThemeChromeBootstrapScript();

    expect(script).not.toContain("selected ? 'check'");
    expect(script).not.toContain('selected ? "check"');
    expect(script).not.toContain("patchIcon(item, selected ? 'check' : itemOption.icon)");
    expect(script).toContain('patchIcon(item, itemOption.icon)');
  });
});

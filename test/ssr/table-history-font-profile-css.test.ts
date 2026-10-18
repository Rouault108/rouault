import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import postcss from 'postcss';
import { describe, expect, it } from 'vitest';
import {
  HISTORY_TABLE_APPROVED_STYLESHEET_SHA256,
  HISTORY_TABLE_FONT_PROFILE_VERSION,
} from '../../src/components/app/controllers/history-table-font-profile.js';
import { listCssFiles } from './support/css-contract.js';

const digest = (value: string | Buffer): string => createHash('sha256').update(value).digest('hex');
const root = resolve(process.cwd());
const tableCss = readFileSync(resolve(root, 'src/assets/css/table.css'), 'utf8');

describe('単純表の字体再利用を許す監査済みCSS契約', () => {
  it('CSSの変更・追加・削除は固定inventoryの再監査を要求する', () => {
    const inventory = listCssFiles().map((file) => [
      relative(root, file).replaceAll('\\', '/'),
      digest(readFileSync(file)),
    ]);
    // 自動更新するsnapshotにせず、runtimeの許可digestも含めた明示監査を要求する。
    expect(HISTORY_TABLE_FONT_PROFILE_VERSION).toBe('simple-static-table-v1');
    expect(digest(JSON.stringify(inventory))).toBe(
      '1cac36706ef9f0d2b2207a984e70348594a6ec42de9c9a335505564ed85332e6',
    );
    expect(HISTORY_TABLE_APPROVED_STYLESHEET_SHA256).toContain(digest(tableCss));
  });

  it('通常セル・見出しセル・右寄せセルの字体分岐を保持する', () => {
    const declarations = new Map<string, Map<string, string>>();
    postcss.parse(tableCss).walkRules((rule) => {
      if (rule.parent?.type !== 'root') return;
      const values = new Map<string, string>();
      rule.walkDecls((declaration) => {
        values.set(declaration.prop, declaration.value);
      });
      declarations.set(rule.selector, values);
    });
    expect(declarations.get('[data-table-root] > table th')?.get('font-size')).toBe(
      'var(--text-xs, 0.75rem)',
    );
    expect(declarations.get('[data-table-root] > table th')?.get('font-weight')).toBe(
      'var(--font-medium, 500)',
    );
    expect(declarations.get('[data-table-root] > table td')?.get('font-size')).toBe(
      'var(--text-base, 0.875rem)',
    );
    expect(
      declarations.get("[data-table-root] > table td[align='right']")?.get('font-feature-settings'),
    ).toBe("'tnum'");
  });

  it('生成table IDと位置診断属性をCSSの意味から除外する', () => {
    for (const file of listCssFiles()) {
      const css = readFileSync(file, 'utf8');
      expect(css).not.toMatch(/rouault-table-root-/u);
      expect(css).not.toMatch(/data-(?:reading-position-status|history-presentation-eligibility)/u);
      expect(css).not.toMatch(/aria-busy/u);
    }
  });

  it('既知のhtml遷移属性は字体やレイアウトを変更しない', () => {
    const allowed = new Set([
      'view-transition-name',
      'pointer-events',
      'animation',
      'isolation',
      'display',
      'mix-blend-mode',
    ]);
    let rules = 0;
    for (const file of listCssFiles())
      postcss.parse(readFileSync(file, 'utf8')).walkRules((rule) => {
        if (!rule.selector.includes('[data-content-transition]')) return;
        rules += 1;
        rule.walkDecls((declaration) => {
          expect(allowed.has(declaration.prop), `${rule.selector}: ${declaration.prop}`).toBe(true);
          if (declaration.prop === 'display') expect(rule.selector).toContain('::view-transition-');
        });
      });
    expect(rules).toBeGreaterThan(0);
  });
});

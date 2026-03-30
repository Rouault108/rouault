import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const readCodeGroupSource = (): string =>
  readFileSync(
    new URL('../../src/components/ui/code-group/code-group.ts', import.meta.url),
    'utf8',
  );

describe('ui-code-group adapter source contract', () => {
  it('adapter は data-ready が付くまで header/body を表示せず、stack fallback を見せること', () => {
    const source = readCodeGroupSource();

    expect(source).toContain('.code-group-header');
    expect(source).toContain('display: none;');
    expect(source).toContain(":host([data-ready]) .code-group-header");
    expect(source).toContain('display: flex;');

    expect(source).toContain('.body');
    expect(source).toContain(':host([data-ready]) .body');
    expect(source).toContain('display: block;');

    expect(source).toContain('.stack-slot');
    expect(source).toContain(':host([data-ready]) .stack-slot');
    expect(source).toContain('display: none;');
  });

  it('adapter は no-JS fallback surface として default slot の stack-slot を持つこと', () => {
    const source = readCodeGroupSource();

    expect(source).toContain('<slot class="stack-slot"></slot>');
  });

  it('adapter は比較 UI を hydration 後に compose して data-ready を付与すること', () => {
    const source = readCodeGroupSource();

    expect(source).toContain('private _composeFromLightDom(): void');
    expect(source).toContain("this.setAttribute('data-ready', '');");
    expect(source).toContain("this.removeAttribute('data-ready');");
  });

  it('adapter は比較不能時に panel slot へ強制せず、light DOM fallback を維持すること', () => {
    const source = readCodeGroupSource();

    expect(source).toContain('if (composition.majorViolation || composition.items.length < 2)');
    expect(source).toContain('this._resetPanels(composition.blocks);');
    expect(source).toContain("block.removeAttribute('slot');");
    expect(source).toContain("block.removeAttribute('hidden');");
  });

  it('adapter は print 時に header を隠し、hidden panel を含めて全件表示へ退行すること', () => {
    const source = readCodeGroupSource();

    expect(source).toContain('@media print');
    expect(source).toContain('.code-group-header');
    expect(source).toContain('display: none !important;');
    expect(source).toContain("::slotted([slot='panel'][hidden])");
    expect(source).toContain('display: block !important;');
  });

  it('adapter は tablist / copy button を render しても data-ready 以前は CSS で露出しないこと', () => {
    const source = readCodeGroupSource();

    expect(source).toContain('class="code-group-header"');
    expect(source).toContain('class="tab-list"');
    expect(source).toContain('<ui-copy-button');
    expect(source).toContain(":host([data-ready]) .code-group-header");
  });
});
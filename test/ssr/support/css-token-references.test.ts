import { describe, expect, it } from 'vitest';
import {
  auditTokenReferences,
  inspectTokenReferences,
  type CssSource,
} from './css-token-references.js';

const source = (css: string, file = 'component.css'): CssSource => ({ file, css });
const tokens = source(':root { --color: blue; --alias: var(--color); }', 'tokens.css');

describe('CSS token reference verifier fixtures', () => {
  it.each([
    ['公開 token と実定義を持つ互換 alias', '.a { color: var(--alias); }'],
    ['同じ rule の private 変数', '.a { --_color: red; color: var(--_color); }'],
    ['明示された祖先の private 変数', '.a { --_color: red; } .a > .b { color: var(--_color); }'],
    ['状態と疑似要素への継承', '.a { --_color: red; } .a:hover::before { color: var(--_color); }'],
    [
      '文字列内の var とコメント',
      String.raw`.a { content: "var(--missing), \"quoted\""; color: var(/* (, */ --color); }`,
    ],
    ['大文字関数と色関数', '.a { color: color-mix(in srgb, VAR(--color), red); }'],
  ])('%s を受け入れる', (_label, css) => {
    expect(inspectTokenReferences([tokens, source(css)])).toEqual([]);
  });

  it.each([
    ['fallback 付き typo', '.a { color: var(--colro, red); }', 'undefined-fallback'],
    ['未契約の空 fallback', '.a { box-shadow: var(--optional,); }', 'undefined-fallback'],
    ['未定義', '.a { outline: 2px solid var(--missing); }', 'undefined'],
    ['nested fallback の未定義', '.a { color: var(--optional, var(--missing)); }', 'undefined'],
    [
      '既存 token の未使用 fallback の未定義',
      '.a { color: var(--color, var(--missing)); }',
      'undefined',
    ],
    [
      '別 selector の同名定義',
      '.a { --_color: red; } .b { color: var(--_color); }',
      'unproven-scope',
    ],
    [
      '同じ名前で始まる別 class',
      '.a { --_color: red; } .abc { color: var(--_color); }',
      'unproven-scope',
    ],
    ['兄弟 scope', '.a { --_color: red; } .a + .b { color: var(--_color); }', 'unproven-scope'],
    ['別の状態', '.a:hover { --_color: red; } .a { color: var(--_color); }', 'unproven-scope'],
    [
      '疑似要素から本体',
      '.a::before { --_color: red; } .a { color: var(--_color); }',
      'unproven-scope',
    ],
    [
      'media 条件の欠落',
      '@media print { .a { --_color: red; } } .a { color: var(--_color); }',
      'unproven-scope',
    ],
    [
      'supports 条件の欠落',
      '@supports (color: red) { .a { --_color: red; } } .a { color: var(--_color); }',
      'unproven-scope',
    ],
    ['自己循環', '.a { --x: var(--x, red); color: var(--x); }', 'cycle'],
    ['相互循環', '.a { --x: var(--y); --y: var(--x); }', 'cycle'],
    ['fallback 内の循環', '.a { --x: var(--color, var(--y)); --y: var(--x); }', 'cycle'],
    ['未対応の scope', '@scope (.a) { .b { color: var(--color); } }', 'unsupported'],
    ['escaped identifier', String.raw`.a { color: var(--\63 olor); }`, 'unsupported'],
  ])('%s を検出する', (_label, css, kind) => {
    expect(
      inspectTokenReferences([tokens, source(css)]).some((finding) => finding.kind === kind),
    ).toBe(true);
  });

  it('別ファイルと局所 :root を公開 token の供給元とみなさない', () => {
    const findings = inspectTokenReferences([
      source('.a { --foreign: red; } :root { --local: red; }', 'other.css'),
      source('.a { color: var(--foreign); background: var(--local); }'),
    ]);
    expect(findings.map((finding) => finding.kind)).toEqual(['unproven-scope', 'unproven-scope']);
  });

  it('alias の参照先と条件付き token を検証する', () => {
    expect(
      inspectTokenReferences([
        source(
          ':root { --alias: var(--missing); } @media print { :root { --conditional: red; } }',
          'tokens.css',
        ),
        source('.a { color: var(--alias); background: var(--conditional); }'),
      ]).map((finding) => finding.kind),
    ).toEqual(['undefined', 'unproven-scope']);
  });

  it('runtime 契約を参照箇所に限定し、同名参照へ拡大しない', () => {
    const result = auditTokenReferences(
      [
        source(
          '.a { width: var(--runtime); height: var(--runtime); } .b { width: var(--runtime); }',
        ),
      ],
      [
        {
          file: 'component.css',
          selector: '.a',
          property: 'width',
          reference: '--runtime',
          conditions: [],
        },
      ],
    );
    expect(result.references.map((item) => item.category)).toEqual([
      'runtime',
      'unresolved',
      'unresolved',
    ]);
    expect(result.findings).toHaveLength(2);
  });

  it('同一参照の重複を保持して件数の増加を検出できる', () => {
    expect(
      inspectTokenReferences([source('.a { margin: var(--missing) var(--missing); }')]),
    ).toHaveLength(2);
  });

  it('public・local・fallback を別分類する', () => {
    expect(
      auditTokenReferences([
        tokens,
        source(
          '.a { --_color: red; color: var(--color); background: var(--_color); border-color: var(--optional, red); }',
        ),
      ]).references.map((item) => item.category),
    ).toEqual(['public', 'public', 'local', 'unresolved']);
  });
  it('文書根拠を呼び出し側で確認した任意 override だけを参照箇所と条件で許可する', () => {
    const contracts = ['--optional', '--optional2'].map((reference) => ({
      file: 'component.css',
      selector: '.a',
      property: 'color',
      reference,
      conditions: [],
    }));
    const css = '.a { color: var(--optional, var(--optional2, rgb(1, 2, 3))); }';
    expect(auditTokenReferences([source(css)], [], contracts).findings).toEqual([]);
    expect(
      auditTokenReferences([source('.a { color: var(--optional,); }')], [], contracts).findings,
    ).toEqual([]);
    expect(inspectTokenReferences([source(css)])).toHaveLength(2);
    expect(
      auditTokenReferences(
        [source('@media print { .a { color: var(--optional, red); } }')],
        [],
        contracts,
      ).findings[0]?.kind,
    ).toBe('undefined-fallback');
    expect(
      auditTokenReferences([source('.b { color: var(--optional, red); }')], [], contracts).findings,
    ).toHaveLength(1);
    expect(
      auditTokenReferences([source('.a { background: var(--optional, red); }')], [], contracts)
        .findings,
    ).toHaveLength(1);
    expect(
      auditTokenReferences([source('.a { color: var(--optional); }')], [], contracts).findings[0]
        ?.kind,
    ).toBe('undefined');
  });

  it.each([
    [
      ":root[data-theme='light'] { --x: var(--y); } :root[data-theme='dark'] { --y: var(--x); }",
      false,
    ],
    [":root[data-theme='light'] { --x: var(--y); --y: var(--x); }", true],
    [
      '@media (prefers-color-scheme: light) { :root { --x: var(--y); } } @media (prefers-color-scheme: dark) { :root { --y: var(--x); } }',
      false,
    ],
    ['@media (prefers-color-scheme: dark) { :root { --x: var(--y); --y: var(--x); } }', true],
    [
      ":root[data-theme='light'] { --x: var(--y); } @media (prefers-color-scheme: dark) { :root { --y: var(--x); } }",
      true,
    ],
    [
      '@media (forced-colors: active) { :root { --x: var(--y); } } @media (forced-colors: none) { :root { --y: var(--x); } }',
      false,
    ],
    [
      '@media not (prefers-color-scheme: light) { :root { --x: var(--y); } } @media (prefers-color-scheme: light) { :root { --y: var(--x); } }',
      true,
    ],
  ])('両立する theme / media 経路だけで循環をたどる: %s', (css, cyclic) => {
    const findings = inspectTokenReferences([
      source(':root { --x: red; --y: blue; } ' + css, 'tokens.css'),
    ]);
    expect(findings.some((item) => item.kind === 'cycle')).toBe(cyclic);
  });

  it('同じ参照の異なる media を別座標にする', () => {
    const findings = inspectTokenReferences([
      source('.a { color: var(--missing); } @media print { .a { color: var(--missing); } }'),
    ]);
    expect(findings.map((item) => item.conditions)).toEqual([[], ['@media print']]);
  });
});

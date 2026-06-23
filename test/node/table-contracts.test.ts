import { describe, expect, it } from 'vitest';

import { validateNoteContentContracts } from '../../build/content/note-content-contracts.js';
import { rehypeRouaultComponents } from '../../build/rehype/rouault-components.js';

interface HastNode {
  type: string;
  tagName?: string;
  value?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
}

const transformFirstChild = (node: HastNode): HastNode | undefined => {
  const tree: HastNode = {
    type: 'root',
    children: [node],
  };

  rehypeRouaultComponents()(tree);
  return tree.children?.[0];
};

describe('table node contracts', () => {
  it('::table 由来の table を data-table-root に正規化し、colgroup を列順どおり生成すること', () => {
    const first = transformFirstChild({
      type: 'element',
      tagName: 'div',
      properties: {
        'data-table-source': 'true',
        'data-table-column-widths': 'fit wide numeric',
      },
      children: [
        {
          type: 'element',
          tagName: 'table',
          children: [
            {
              type: 'element',
              tagName: 'thead',
              children: [
                {
                  type: 'element',
                  tagName: 'tr',
                  children: [
                    { type: 'element', tagName: 'th', children: [{ type: 'text', value: '項目' }] },
                    { type: 'element', tagName: 'th', children: [{ type: 'text', value: '説明' }] },
                    { type: 'element', tagName: 'th', children: [{ type: 'text', value: '点数' }] },
                  ],
                },
              ],
            },
            {
              type: 'element',
              tagName: 'tbody',
              children: [
                {
                  type: 'element',
                  tagName: 'tr',
                  children: [
                    { type: 'element', tagName: 'td', children: [{ type: 'text', value: 'A' }] },
                    { type: 'element', tagName: 'td', children: [{ type: 'text', value: 'B' }] },
                    { type: 'element', tagName: 'td', children: [{ type: 'text', value: '1' }] },
                  ],
                },
              ],
            },
          ],
        },
      ],
    });

    expect(first?.tagName).toBe('div');
    expect(first?.properties?.['data-table-root']).toBe('true');
    expect(first?.properties?.['data-table-source']).toBeUndefined();
    expect(first?.properties?.['data-table-column-widths']).toBeUndefined();

    const table = first?.children?.[0];
    expect(table?.tagName).toBe('table');
    expect(table?.children?.map((child) => child.tagName)).toEqual(['colgroup', 'thead', 'tbody']);
    expect(
      table?.children?.[0]?.children?.map((child) => child.properties?.['data-table-col-width']),
    ).toEqual(['fit', 'wide', 'numeric']);
  });

  it('caption がある場合は caption の後に colgroup を生成すること', () => {
    const first = transformFirstChild({
      type: 'element',
      tagName: 'div',
      properties: {
        'data-table-source': 'true',
        'data-table-column-widths': 'auto narrow',
      },
      children: [
        {
          type: 'element',
          tagName: 'table',
          children: [
            {
              type: 'element',
              tagName: 'caption',
              children: [{ type: 'text', value: '一覧' }],
            },
            {
              type: 'element',
              tagName: 'tbody',
              children: [
                {
                  type: 'element',
                  tagName: 'tr',
                  children: [
                    { type: 'element', tagName: 'td', children: [{ type: 'text', value: 'A' }] },
                    { type: 'element', tagName: 'td', children: [{ type: 'text', value: 'B' }] },
                  ],
                },
              ],
            },
          ],
        },
      ],
    });

    const table = first?.children?.[0];
    expect(table?.children?.map((child) => child.tagName)).toEqual(['caption', 'colgroup', 'tbody']);
    expect(
      table?.children?.[1]?.children?.map((child) => child.properties?.['data-table-col-width']),
    ).toEqual(['auto', 'narrow']);
  });

  it('column-widths 数と列数が不一致なら build error にすること', () => {
    expect(() =>
      transformFirstChild({
        type: 'element',
        tagName: 'div',
        properties: {
          'data-table-source': 'true',
          'data-table-column-widths': 'fit wide numeric',
        },
        children: [
          {
            type: 'element',
            tagName: 'table',
            children: [
              {
                type: 'element',
                tagName: 'thead',
                children: [
                  {
                    type: 'element',
                    tagName: 'tr',
                    children: [
                      { type: 'element', tagName: 'th', children: [{ type: 'text', value: 'A' }] },
                      { type: 'element', tagName: 'th', children: [{ type: 'text', value: 'B' }] },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      }),
    ).toThrow('[markdown] table の column-widths 数は table 列数と一致する必要があります');
  });

  it('column-widths 指定tableに colspan / rowspan がある場合は build error にすること', () => {
    for (const spanAttribute of ['colspan', 'rowspan']) {
      expect(() =>
        transformFirstChild({
          type: 'element',
          tagName: 'div',
          properties: {
            'data-table-source': 'true',
            'data-table-column-widths': 'fit',
          },
          children: [
            {
              type: 'element',
              tagName: 'table',
              children: [
                {
                  type: 'element',
                  tagName: 'tbody',
                  children: [
                    {
                      type: 'element',
                      tagName: 'tr',
                      children: [
                        {
                          type: 'element',
                          tagName: 'td',
                          properties: { [spanAttribute]: '2' },
                          children: [{ type: 'text', value: 'A' }],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        }),
      ).toThrow('[markdown] column-widths 指定 table では colspan / rowspan は使用できません');
    }
  });

  it('data-table-source 経路では空table fallback、table 0個、複数table、意味要素混在を build error にすること', () => {
    const invalidChildren: HastNode[][] = [
      [],
      [
        {
          type: 'element',
          tagName: 'p',
          children: [{ type: 'text', value: '本文' }],
        },
      ],
      [
        { type: 'element', tagName: 'table', children: [] },
        { type: 'element', tagName: 'table', children: [] },
      ],
      [
        {
          type: 'element',
          tagName: 'p',
          children: [{ type: 'text', value: '本文' }],
        },
        { type: 'element', tagName: 'table', children: [] },
      ],
    ];

    for (const children of invalidChildren) {
      expect(() =>
        transformFirstChild({
          type: 'element',
          tagName: 'div',
          properties: { 'data-table-source': 'true' },
          children,
        }),
      ).toThrow('[markdown] table source は GFM table 1 個だけを含む必要があります');
    }
  });

  it('table を static table root に正規化し、caption / density / table 構造を保持すること', () => {
    const first = transformFirstChild({
      type: 'element',
      tagName: 'table',
      properties: {
        density: 'compact',
      },
      children: [
        {
          type: 'element',
          tagName: 'caption',
          children: [{ type: 'text', value: '2024年 四半期別売上実績' }],
        },
        {
          type: 'element',
          tagName: 'thead',
          children: [
            {
              type: 'element',
              tagName: 'tr',
              children: [
                {
                  type: 'element',
                  tagName: 'th',
                  properties: { scope: 'col' },
                  children: [{ type: 'text', value: '四半期' }],
                },
                {
                  type: 'element',
                  tagName: 'th',
                  properties: { scope: 'col', align: 'right' },
                  children: [{ type: 'text', value: '売上高' }],
                },
              ],
            },
          ],
        },
        {
          type: 'element',
          tagName: 'tbody',
          children: [
            {
              type: 'element',
              tagName: 'tr',
              children: [
                {
                  type: 'element',
                  tagName: 'td',
                  children: [{ type: 'text', value: 'Q1' }],
                },
                {
                  type: 'element',
                  tagName: 'td',
                  properties: { align: 'right' },
                  children: [{ type: 'text', value: '¥12,340,000' }],
                },
              ],
            },
          ],
        },
        {
          type: 'element',
          tagName: 'tfoot',
          children: [
            {
              type: 'element',
              tagName: 'tr',
              children: [
                {
                  type: 'element',
                  tagName: 'td',
                  children: [{ type: 'text', value: '合計' }],
                },
              ],
            },
          ],
        },
      ],
    });

    expect(first?.tagName).toBe('div');
    expect(first?.properties?.['data-table-root']).toBe('true');
    expect(first?.properties?.['role']).toBe('region');
    expect(first?.properties?.['tabindex']).toBe('0');
    expect(first?.properties?.['aria-label']).toBe('2024年 四半期別売上実績');
    expect(first?.properties?.['data-density']).toBe('compact');

    const table = first?.children?.[0];
    expect(table?.tagName).toBe('table');
    expect(table?.children?.map((child) => child.tagName)).toEqual([
      'caption',
      'thead',
      'tbody',
      'tfoot',
    ]);
    expect(table?.children?.[0]?.children?.[0]?.value).toBe('2024年 四半期別売上実績');
    expect(table?.children?.[1]?.children?.[0]?.children?.[1]?.properties?.['align']).toBe('right');
  });

  it('caption も aria-label も無い table には fallback aria-label を補完すること', () => {
    const first = transformFirstChild({
      type: 'element',
      tagName: 'table',
      properties: {},
      children: [
        {
          type: 'element',
          tagName: 'tbody',
          children: [],
        },
      ],
    });

    expect(first?.tagName).toBe('div');
    expect(first?.properties?.['aria-label']).toBe('Data table');
    expect(first?.properties?.['data-density']).toBeUndefined();
  });

  it('plain GFM table の既存出力は変えず colgroup を生成しないこと', () => {
    const first = transformFirstChild({
      type: 'element',
      tagName: 'table',
      properties: {},
      children: [
        {
          type: 'element',
          tagName: 'thead',
          children: [
            {
              type: 'element',
              tagName: 'tr',
              children: [
                { type: 'element', tagName: 'th', children: [{ type: 'text', value: 'A' }] },
                { type: 'element', tagName: 'th', children: [{ type: 'text', value: 'B' }] },
              ],
            },
          ],
        },
      ],
    });

    const table = first?.children?.[0];
    expect(table?.tagName).toBe('table');
    expect(table?.children?.map((child) => child.tagName)).toEqual(['thead']);
  });

  it('{{break}} 由来の br marker を table cell 内 final contract として受け入れること', () => {
    expect(() => {
      validateNoteContentContracts({
        kind: 'reader',
        html: [
          '<div data-table-root="true" role="region" tabindex="0" aria-label="改行テーブル">',
          '<table><tbody><tr><td>1行目<br data-table-cell-break="true">2行目</td></tr></tbody></table>',
          '</div>',
        ].join(''),
        sourceLabel: 'testing/table-cell-break',
      });
    }).not.toThrow();
  });

  it('final DOM に data-table-source が残る場合は contract error にすること', () => {
    expect(() => {
      validateNoteContentContracts({
        kind: 'reader',
        html: '<div data-table-source="true"><table></table></div>',
        sourceLabel: 'testing/table-source-leak',
      });
    }).toThrow('data-table-source は note 最終 HTML に残してはいけません');
  });

  it('table 内 marker なし br は final contract error にすること', () => {
    expect(() => {
      validateNoteContentContracts({
        kind: 'reader',
        html: [
          '<div data-table-root="true" role="region" tabindex="0" aria-label="hard break">',
          '<table><tbody><tr><td>1行目<br>2行目</td></tr></tbody></table>',
          '</div>',
        ].join(''),
        sourceLabel: 'testing/table-markerless-br',
      });
    }).toThrow('table 内の br は data-table-cell-break="true" が必要です');
  });

  it('data-table-cell-break marker は td / th 子孫にだけ許可すること', () => {
    expect(() => {
      validateNoteContentContracts({
        kind: 'reader',
        html: '<p>1行目<br data-table-cell-break="true">2行目</p>',
        sourceLabel: 'testing/table-cell-break-placement',
      });
    }).toThrow('br[data-table-cell-break="true"] は td / th の子孫にだけ配置できます');
  });

  it('final DOM の colgroup は許可 token と table 列数一致を要求すること', () => {
    expect(() => {
      validateNoteContentContracts({
        kind: 'reader',
        html: [
          '<div data-table-root="true" role="region" tabindex="0" aria-label="列幅">',
          '<table><colgroup><col data-table-col-width="huge"></colgroup>',
          '<tbody><tr><td>A</td></tr></tbody></table>',
          '</div>',
        ].join(''),
        sourceLabel: 'testing/table-invalid-col-token',
      });
    }).toThrow('col[data-table-col-width] は許可された table column width token だけを持てます');

    expect(() => {
      validateNoteContentContracts({
        kind: 'reader',
        html: [
          '<div data-table-root="true" role="region" tabindex="0" aria-label="列幅">',
          '<table><colgroup><col></colgroup>',
          '<tbody><tr><td>A</td></tr></tbody></table>',
          '</div>',
        ].join(''),
        sourceLabel: 'testing/table-col-missing-width-token',
      });
    }).toThrow('table の colgroup col には data-table-col-width が必要です');

    expect(() => {
      validateNoteContentContracts({
        kind: 'reader',
        html: [
          '<div data-table-root="true" role="region" tabindex="0" aria-label="列幅">',
          '<table><colgroup><col data-table-col-width="fit"></colgroup>',
          '<tbody><tr><td>A</td><td>B</td></tr></tbody></table>',
          '</div>',
        ].join(''),
        sourceLabel: 'testing/table-col-count',
      });
    }).toThrow('table の colgroup col 数は table 列数と一致する必要があります');
  });

  it('table cell 内 Markdown hard break の検出不能経路は marker なし br として final contract で拒否すること', () => {
    expect(() => {
      validateNoteContentContracts({
        kind: 'reader',
        html: [
          '<div data-table-root="true" role="region" tabindex="0" aria-label="hard break">',
          '<table><tbody><tr><td>前<br>後</td></tr></tbody></table>',
          '</div>',
        ].join(''),
        sourceLabel: 'testing/table-hard-break-fallback',
      });
    }).toThrow('table 内の br は data-table-cell-break="true" が必要です');
  });

  it('旧 ui-table 入力は互換変換せず build error にすること', () => {
    expect(() =>
      transformFirstChild({
        type: 'element',
        tagName: 'ui-table',
        properties: {
          density: 'compact',
          'aria-label': '明示ラベル',
        },
        children: [
          {
            type: 'element',
            tagName: 'table',
            properties: {},
            children: [],
          },
        ],
      }),
    ).toThrow('[markdown] ui-table は static-first 化済みのため入力できません');
  });

  it('representative な static table root 群を note content contract として受け入れること', () => {
    const html = [
      '<div data-table-root="true" role="region" tabindex="0" aria-label="経費レポート">',
      '  <table>',
      '    <thead>',
      '      <tr>',
      '        <th scope="col">項目</th>',
      '        <th scope="col" align="right">金額</th>',
      '      </tr>',
      '    </thead>',
      '    <tbody>',
      '      <tr><td>交通費</td><td align="right">23500</td></tr>',
      '    </tbody>',
      '    <tfoot>',
      '      <tr><td>合計</td><td align="right">23500</td></tr>',
      '    </tfoot>',
      '  </table>',
      '</div>',
      '<div data-table-root="true" role="region" tabindex="0" aria-label="タスク一覧" data-density="compact">',
      '  <table>',
      '    <thead><tr><th scope="col">タスク</th><th scope="col">担当</th></tr></thead>',
      '    <tbody><tr><td>要件定義</td><td>山田</td></tr></tbody>',
      '    <tbody><tr><td>実装</td><td>鈴木</td></tr></tbody>',
      '  </table>',
      '</div>',
      '<div data-table-root="true" role="region" tabindex="0" aria-label="週次スケジュール">',
      '  <table>',
      '    <thead><tr><th scope="col">時間</th><th scope="col">月曜</th><th scope="col">火曜</th></tr></thead>',
      '    <tbody>',
      '      <tr><th scope="row">09:00</th><td colspan="2">全社朝礼</td></tr>',
      '      <tr><th scope="row">10:00</th><td>実装</td><td rowspan="2">設計レビュー</td></tr>',
      '      <tr><th scope="row">11:00</th><td>レビュー</td></tr>',
      '    </tbody>',
      '  </table>',
      '</div>',
      '<div data-table-root="true" role="region" tabindex="0" aria-label="単一行テーブル">',
      '  <table>',
      '    <thead><tr><th scope="col">設定項目</th><th scope="col">値</th></tr></thead>',
      '    <tbody><tr><td>タイムゾーン</td><td>Asia/Tokyo</td></tr></tbody>',
      '  </table>',
      '</div>',
      '<div data-table-root="true" role="region" tabindex="0" aria-label="空のデータテーブル">',
      '  <table>',
      '    <thead><tr><th scope="col">名前</th><th scope="col">日付</th><th scope="col">ステータス</th></tr></thead>',
      '    <tbody></tbody>',
      '  </table>',
      '</div>',
    ].join('');

    expect(() => {
      validateNoteContentContracts({
        kind: 'reader',
        html: html,
        sourceLabel: 'testing/table-contracts',
      });
    }).not.toThrow();
  });
});

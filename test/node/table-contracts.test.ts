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

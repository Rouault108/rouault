import { describe, expect, it } from 'vitest';
import {
  transformHtmlWithLitSsr,
  type DocumentStyleDefinition,
  type SsrAttribute,
} from '../../lib/ssr/html-transform.js';

type TestSsrAttribute = SsrAttribute;

const serializeAttributes = (attributes: readonly TestSsrAttribute[]): string =>
  attributes
    .map((attribute) => ` ${attribute.name}="${attribute.value.replace(/"/g, '&quot;')}"`)
    .join('');

describe('transformHtmlWithLitSsr', () => {
  it('ノート相当のHTMLで対象要素をDSDに置換し、通常HTMLを保持する', async () => {
    const renderCalls: {
      tagName: string;
      attributes: readonly SsrAttribute[];
      innerHtml: string;
    }[] = [];

    const html = `<!doctype html>
      <html lang="ja">
        <head>
          <meta charset="utf-8">
          <script type="application/json" id="sidebar-data">{"items":[]}</script>
        </head>
        <body>
          <main id="main-content">
            <div class="prose">本文</div>
            <ui-code-block language="ts"><pre><code>const value = 1;\nconsole.log(value);\n</code></pre></ui-code-block>
            <ui-table><table><tbody><tr><th>列</th><td>値</td></tr></tbody></table></ui-table>
          </main>
        </body>
      </html>`;

    const transformed = await transformHtmlWithLitSsr(html, {
      targetTagNames: ['ui-code-block', 'ui-table'],
      renderCustomElement: (
        tagName: string,
        attributes: readonly SsrAttribute[],
        innerHtml: string,
      ) => {
        renderCalls.push({ tagName, attributes, innerHtml });
        return Promise.resolve(
          `<${tagName}${serializeAttributes(attributes)}><template shadowrootmode="open"><section data-ssr="${tagName}">${innerHtml}</section></template></${tagName}>`,
        );
      },
      collectDocumentStylesForTags: (tagNames: ReadonlySet<string>) => {
        const renderedTagNames = new Set(tagNames);
        const styles: DocumentStyleDefinition[] = [];

        if (renderedTagNames.has('ui-code-block')) {
          styles.push({
            id: 'ui-code-block-document-styles',
            cssText: '.code-block{display:block;}',
          });
        }

        if (renderedTagNames.has('ui-table')) {
          styles.push({
            id: 'ui-table-document-styles',
            cssText: '.table{display:block;}',
          });
        }

        return styles;
      },
    });

    expect(transformed).toContain('class="prose">本文</div>');
    expect(transformed).toContain('type="application/json" id="sidebar-data"');
    expect(transformed).toContain('<template shadowrootmode="open">');
    expect(transformed).toContain('id="ui-code-block-document-styles"');
    expect(transformed).toContain('id="ui-table-document-styles"');

    expect(renderCalls).toHaveLength(2);
    expect(renderCalls[0]?.tagName).toBe('ui-code-block');
    expect(renderCalls[0]?.attributes).toContainEqual({
      name: 'initial-code',
      value: 'const value = 1;\nconsole.log(value);',
    });
  });

  it('タグ・検索・独立ページ相当のHTMLで対象外の構造を壊さずに変換する', async () => {
    const html = `<!doctype html>
      <html lang="ja">
        <head>
          <meta name="pagefind:metadata:genre" content="music">
        </head>
        <body>
          <main id="main-content">
            <about-page></about-page>
            <search-page></search-page>
            <tag-page tag-page-json="{&quot;tag&quot;:&quot;music&quot;}"></tag-page>
            <article data-static="keep">残したい要素</article>
          </main>
        </body>
      </html>`;

    const transformed = await transformHtmlWithLitSsr(html, {
      targetTagNames: ['about-page', 'search-page', 'tag-page'],
      renderCustomElement: (tagName: string, attributes: readonly SsrAttribute[]) =>
        Promise.resolve(
          tagName === 'about-page'
            ? `<${tagName}${serializeAttributes(attributes)}><div>SSR ${tagName}</div></${tagName}>`
            : `<${tagName}${serializeAttributes(attributes)}><template shadowrootmode="open"><div>SSR ${tagName}</div></template></${tagName}>`,
        ),
      collectDocumentStylesForTags: () => [],
    });

    expect(transformed).toContain('pagefind:metadata:genre');
    expect(transformed).toContain('<article data-static="keep">残したい要素</article>');
    expect(transformed).toContain('<about-page><div>SSR about-page</div></about-page>');
    expect(transformed).toContain(
      '<search-page><template shadowrootmode="open"><div>SSR search-page</div></template></search-page>',
    );
    expect(transformed).toContain(
      '<tag-page tag-page-json="{&quot;tag&quot;:&quot;music&quot;}"><template shadowrootmode="open"><div>SSR tag-page</div></template></tag-page>',
    );
  });

  it('document style を重複注入しない', async () => {
    const html = `<!doctype html>
      <html lang="ja">
        <head>
          <style id="ui-table-document-styles">.existing{display:block;}</style>
        </head>
        <body>
          <main>
            <ui-table><table><tbody><tr><td>A</td></tr></tbody></table></ui-table>
            <ui-table><table><tbody><tr><td>B</td></tr></tbody></table></ui-table>
          </main>
        </body>
      </html>`;

    const transformed = await transformHtmlWithLitSsr(html, {
      targetTagNames: ['ui-table'],
      renderCustomElement: (
        tagName: string,
        attributes: readonly SsrAttribute[],
        innerHtml: string,
      ) =>
        Promise.resolve(
          `<${tagName}${serializeAttributes(attributes)}><template shadowrootmode="open">${innerHtml}</template></${tagName}>`,
        ),
      collectDocumentStylesForTags: () => [
        {
          id: 'ui-table-document-styles',
          cssText: '.table{display:block;}',
        },
      ],
    });

    expect(transformed.match(/id="ui-table-document-styles"/g)).toHaveLength(1);
    expect(transformed).toContain('.existing{display:block;}');
  });
});

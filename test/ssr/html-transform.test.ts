import { describe, expect, it } from 'vitest';
import {
  transformHtmlWithLitSsr,
  type DocumentStyleDefinition,
  type SsrAttribute,
} from '../../build/ssr/html-transform.js';

type TestSsrAttribute = SsrAttribute;

const serializeAttributes = (attributes: readonly TestSsrAttribute[]): string =>
  attributes
    .map((attribute) => ` ${attribute.name}="${attribute.value.replace(/"/g, '&quot;')}"`)
    .join('');

describe('transformHtmlWithLitSsr', () => {
  it('ノート相当のHTMLで対象要素を変換し、対象外の通常HTMLを保持する', async () => {
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
            <ui-details summary="通知"><p>通知本文</p></ui-details>
            <ui-tabs aria-label="表示切替"><div slot="tab" value="one">1つ目</div><div slot="panel">パネル本文</div></ui-tabs>
          </main>
        </body>
      </html>`;

    const transformed = await transformHtmlWithLitSsr(html, {
      targetTagNames: ['ui-details', 'ui-tabs'],
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

        if (renderedTagNames.has('ui-details')) {
          styles.push({
            id: 'ui-details-document-styles',
            cssText: '.details{display:block;}',
          });
        }

        if (renderedTagNames.has('ui-tabs')) {
          styles.push({
            id: 'ui-tabs-document-styles',
            cssText: '.tabs{display:block;}',
          });
        }

        return styles;
      },
    });

    expect(transformed).toContain('class="prose">本文</div>');
    expect(transformed).toContain('type="application/json" id="sidebar-data"');
    expect(transformed).toContain('<template shadowrootmode="open">');
    expect(transformed).toContain('id="ui-details-document-styles"');
    expect(transformed).toContain('id="ui-tabs-document-styles"');

    expect(renderCalls).toHaveLength(2);
    expect(renderCalls[0]?.tagName).toBe('ui-details');
    expect(renderCalls[0]?.attributes).toContainEqual({
      name: 'summary',
      value: '通知',
    });
    expect(
      renderCalls[0]?.attributes.find((attribute) => attribute.name === 'initial-code'),
    ).toBeUndefined();
  });

  it('検索・タグページ相当のHTMLで対象外の構造を壊さずに変換する', async () => {
    const html = `<!doctype html>
      <html lang="ja">
        <head>
          <meta name="pagefind:metadata:genre" content="music">
        </head>
        <body>
          <main id="main-content">
            <search-page></search-page>
            <tag-page tag-page-json="{&quot;tag&quot;:&quot;music&quot;}"></tag-page>
            <article data-static="keep">残したい要素</article>
          </main>
        </body>
      </html>`;

    const transformed = await transformHtmlWithLitSsr(html, {
      targetTagNames: ['search-page', 'tag-page'],
      renderCustomElement: (tagName: string, attributes: readonly SsrAttribute[]) =>
        Promise.resolve(
          `<${tagName}${serializeAttributes(attributes)}><template shadowrootmode="open"><div>SSR ${tagName}</div></template></${tagName}>`,
        ),
      collectDocumentStylesForTags: () => [],
    });

    expect(transformed).toContain('pagefind:metadata:genre');
    expect(transformed).toContain('<article data-static="keep">残したい要素</article>');
    expect(transformed).toContain(
      '<search-page><template shadowrootmode="open"><div>SSR search-page</div></template></search-page>',
    );
    expect(transformed).toContain(
      '<tag-page tag-page-json="{&quot;tag&quot;:&quot;music&quot;}"><template shadowrootmode="open"><div>SSR tag-page</div></template></tag-page>',
    );
  });

  it('light DOM SSR の置換後に生成された対象要素も再帰的に変換する', async () => {
    const renderCalls: string[] = [];

    const html = `<!doctype html>
      <html lang="ja">
        <head></head>
        <body>
          <main id="main-content">
            <page-host data-kind="about"></page-host>
          </main>
        </body>
      </html>`;

    const transformed = await transformHtmlWithLitSsr(html, {
      targetTagNames: ['page-host', 'layout-toc'],
      renderCustomElement: (tagName: string, attributes: readonly SsrAttribute[]) => {
        renderCalls.push(tagName);

        if (tagName === 'page-host') {
          return Promise.resolve(
            `<page-host${serializeAttributes(attributes)}>
              <section class="about-shell">
                <aside class="layout-toc-col">
                  <layout-toc headings-json="[]"></layout-toc>
                </aside>
              </section>
            </page-host>`,
          );
        }

        return Promise.resolve(
          `<layout-toc${serializeAttributes(attributes)}><template shadowrootmode="open"><div>SSR layout-toc</div></template></layout-toc>`,
        );
      },
      collectDocumentStylesForTags: () => [],
    });

    expect(renderCalls).toEqual(['page-host', 'layout-toc']);
    expect(transformed).toContain(
      '<layout-toc headings-json="[]"><template shadowrootmode="open"><div>SSR layout-toc</div></template></layout-toc>',
    );
  });

  it('document style を重複注入しない', async () => {
    const html = `<!doctype html>
      <html lang="ja">
        <head>
          <style id="ui-details-document-styles">.existing{display:block;}</style>
        </head>
        <body>
          <main>
            <ui-details summary="A"><p>A</p></ui-details>
            <ui-details summary="B"><p>B</p></ui-details>
          </main>
        </body>
      </html>`;

    const transformed = await transformHtmlWithLitSsr(html, {
      targetTagNames: ['ui-details'],
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
          id: 'ui-details-document-styles',
          cssText: '.details{display:block;}',
        },
      ],
    });

    expect(transformed.match(/id="ui-details-document-styles"/g)).toHaveLength(1);
    expect(transformed).toContain('.existing{display:block;}');
  });
});
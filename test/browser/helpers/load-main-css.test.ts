import { expect } from '@open-wc/testing';

import { hasTopLevelImport, stripTopLevelImports } from './load-main-css.js';

describe('load-main-css import scanner', () => {
  it('removes all top-level imports', () => {
    const css = "@import './a.css';\n@import url('./b.css');\n:root { color: red; }";
    const stripped = stripTopLevelImports(css);
    expect(stripped).not.to.contain("@import './a.css'");
    expect(stripped).not.to.contain("@import url('./b.css')");
    expect(stripped).to.contain(':root { color: red; }');
    expect(hasTopLevelImport(css)).to.equal(true);
    expect(hasTopLevelImport(stripped)).to.equal(false);
  });

  it('ignores imports in comments and string literals', () => {
    const css = `
      /* @import './comment.css'; */
      .x::before { content: "@import './string.css';"; }
      .y::before { content: '@import "./string2.css";'; }
    `;
    expect(hasTopLevelImport(css)).to.equal(false);
    expect(() => stripTopLevelImports(css)).not.to.throw();
    expect(stripTopLevelImports(css)).to.contain('@import');
  });

  it('throws for real nested imports in media and supports rules', () => {
    expect(() => stripTopLevelImports("@media screen { @import './nested.css'; }")).to.throw();
    expect(() =>
      stripTopLevelImports("@supports (display: grid) { @import './nested.css'; }"),
    ).to.throw();
  });
});

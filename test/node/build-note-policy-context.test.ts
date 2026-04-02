import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { buildNotePolicyContext } from '../../build/remark/directives/policy/build-note-policy-context.js';

describe('buildNotePolicyContext', () => {
  it('frontmatter が取り除かれた testing note でも path から testing/sandbox を復元すること', () => {
    const context = buildNotePolicyContext({
      path: path.resolve(process.cwd(), 'content/testing/sandbox.md'),
      value: '::example-include{ref="sandbox/button-preview"}',
    });

    expect(context.kind).toBe('testing');
    expect(context.testingArea).toBe('sandbox');
    expect(context.isReaderFacing).toBe(false);
    expect(context.allowsCodePreviewControls).toBe(true);
    expect(context.allowsPreviewSandbox).toBe(true);
  });

  it('path から testing note を復元できない場合は reader として扱うこと', () => {
    const context = buildNotePolicyContext({
      path: path.resolve(process.cwd(), 'content/notes/example.md'),
      value: '本文だけの Markdown',
    });

    expect(context.kind).toBe('reader');
    expect(context.testingArea).toBeUndefined();
    expect(context.isReaderFacing).toBe(true);
    expect(context.allowsCodePreviewControls).toBe(false);
    expect(context.allowsPreviewSandbox).toBe(false);
  });
});

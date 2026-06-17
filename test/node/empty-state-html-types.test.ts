import { describe, expect, it } from 'vitest';

import type { EmptyStateHtmlInput } from '../../src/layouts/empty-state-html.js';

describe('static empty state html type contract', () => {
  it('runs a no-op runtime assertion so the type contract participates in node tests', () => {
    expect(true).toBe(true);
  });
});

const iconHtmlInput: EmptyStateHtmlInput = {
  heading: 'Empty',
  // @ts-expect-error trusted icon html is intentionally not part of the static empty-state API.
  trustedIconHtml: '<svg></svg>',
};

const illustrationHtmlInput: EmptyStateHtmlInput = {
  heading: 'Empty',
  // @ts-expect-error trusted illustration html is intentionally not part of the static empty-state API.
  trustedIllustrationHtml: '<svg></svg>',
};

const actionsHtmlInput: EmptyStateHtmlInput = {
  heading: 'Empty',
  // @ts-expect-error trusted actions html is intentionally not part of the static empty-state API.
  trustedActionsHtml: '<button type="button">Action</button>',
};

void iconHtmlInput;
void illustrationHtmlInput;
void actionsHtmlInput;

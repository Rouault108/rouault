import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  parseStaticExploreSearchResponseJson,
  type ParseStaticExploreSearchResponseResult,
} from '../../shared/search/search-json-artifact-parser.js';
import { adoptInitialStaticExploreSearchResponse } from '../../shared/search/static-explore-response-adoption.js';
import type {
  SearchArtifactDiagnosticSource,
  SearchArtifactParseIssueCode,
  SearchDiagnosticSummaryCode,
  SearchJsonParseDiagnosticSink,
} from '../../shared/search/search-diagnostics.js';
import type { StaticExploreSearchResponse } from '../../shared/search/search-types.js';

const isInternalDocumentPathname = (pathname: string): boolean => pathname.startsWith('/notes/');

const createDiagnosticRecorder = () => {
  const issues: {
    code: SearchArtifactParseIssueCode;
    artifactSource: SearchArtifactDiagnosticSource;
  }[] = [];
  const summaries: {
    code: SearchDiagnosticSummaryCode;
    artifactSource: SearchArtifactDiagnosticSource;
    droppedItemCount: number;
  }[] = [];

  const diagnostics: SearchJsonParseDiagnosticSink = {
    addIssue(issue) {
      issues.push({ code: issue.code, artifactSource: issue.artifactSource });
    },
    addSummary(summary) {
      summaries.push(summary);
    },
  };

  return { diagnostics, issues, summaries };
};

const validDiagnostics = {
  degraded: false,
  activeSources: ['catalog'],
  failures: [],
  issues: [],
};

const validItem = (overrides: Record<string, unknown> = {}) => ({
  canonicalPathname: '/notes/valid/',
  pathLabel: 'notes / valid',
  title: 'Valid',
  description: 'valid item',
  date: { epochMs: 1, original: '2026-01-01' },
  tags: ['alpha'],
  snippet: { segments: [{ text: 'valid item', matched: false }] },
  reasons: [{ kind: 'tag-filter-match', tokens: ['alpha'] }],
  ...overrides,
});

const validPayload = (overrides: Record<string, unknown> = {}) => ({
  mode: 'explore',
  items: [validItem()],
  total: 1,
  rankingProfileId: 'rouault-search-v1',
  tagCounts: { alpha: 1 },
  allTagCounts: { alpha: 1, beta: 3 },
  diagnostics: validDiagnostics,
  ...overrides,
});

const parse = (value: unknown): ParseStaticExploreSearchResponseResult => {
  const recorder = createDiagnosticRecorder();
  return parseStaticExploreSearchResponseJson({
    value,
    isInternalDocumentPathname,
    diagnostics: recorder.diagnostics,
  });
};

const expectParsedResponse = (
  result: ParseStaticExploreSearchResponseResult,
): StaticExploreSearchResponse => {
  expect(result.ok).to.equal(true);
  if (!result.ok) {
    throw new Error(`Expected parse success, got ${result.reason}`);
  }
  return result.response;
};

describe('static explore response contract', () => {
  it('valid raw count maps and diagnostics are preserved without recomputing tagCounts/allTagCounts', () => {
    const result = parse(validPayload());
    const response = expectParsedResponse(result);

    expect(response.tagCounts).to.deep.equal({ alpha: 1 });
    expect(response.allTagCounts).to.deep.equal({ alpha: 1, beta: 3 });
    expect(response.diagnostics).to.deep.equal(validDiagnostics);
    if (result.ok) {
      expect(result.metadata).to.deep.equal({
        droppedItemCount: 0,
        rawTotalMatchedAcceptedItems: true,
        usedLegacyTotalFallback: false,
        usedLegacyCountMapFallback: false,
        normalizedFromInvalidItemFields: [],
      });
    }
  });

  it('trim-normalized tags recompute count maps and reject adoption', () => {
    const result = parse(
      validPayload({
        items: [validItem({ tags: [' alpha '] })],
        tagCounts: { alpha: 99 },
        allTagCounts: { alpha: 99, beta: 3 },
      }),
    );

    const response = expectParsedResponse(result);
    expect(response.tagCounts).to.deep.equal({ alpha: 1 });
    expect(response.allTagCounts).to.deep.equal({ alpha: 1 });
    if (result.ok) {
      expect(result.metadata.normalizedFromInvalidItemFields).to.deep.equal(['tags']);
    }
    expect(adoptInitialStaticExploreSearchResponse(result)).to.deep.equal({
      ok: false,
      reason: 'normalized-invalid-item-fields',
    });
  });

  for (const missingKey of ['tagCounts', 'allTagCounts'] as const) {
    it(`${missingKey} one-side missing uses whole-map legacy fallback and adoption rejects it`, () => {
      const payload = Object.fromEntries(
        Object.entries(validPayload()).filter(([key]) => key !== missingKey),
      );
      const result = parse(payload);

      const response = expectParsedResponse(result);
      expect(response.tagCounts).to.deep.equal({ alpha: 1 });
      expect(response.allTagCounts).to.deep.equal({ alpha: 1 });
      if (result.ok) {
        expect(result.metadata.usedLegacyCountMapFallback).to.equal(true);
      }
      expect(adoptInitialStaticExploreSearchResponse(result)).to.deep.equal({
        ok: false,
        reason: 'legacy-count-map-fallback',
      });
    });
  }

  for (const invalidKey of ['tagCounts', 'allTagCounts'] as const) {
    it(`${invalidKey} invalid count map is rejected instead of falling back`, () => {
      expect(
        parse({
          ...validPayload(),
          [invalidKey]: { alpha: -1 },
        }),
      ).to.deep.equal({ ok: false, reason: 'invalid-static-response-count-map' });
    });
  }

  it('source-level contract keeps static parser call sites on the metadata-only signature', () => {
    for (const path of [
      'shared/search/inline-static-explore-response-validator.ts',
      'src/client/post-hydrate/search-page-controller.ts',
      'test/node/search-json-artifact-parser.test.ts',
    ]) {
      const source = readFileSync(resolve(process.cwd(), path), 'utf8');
      const calls = source.match(/parseStaticExploreSearchResponseJson\(\{[\s\S]*?\n\s*\}\)/gu) ?? [];
      expect(calls.length, path).to.be.greaterThan(0);
      for (const call of calls) {
        expect(call, path).not.toContain('siteUrlContext:');
      }
    }
  });

  it('invalid total, rankingProfileId, and diagnostics are response-level parse failures', () => {
    expect(parse(validPayload({ total: 1.5 }))).to.deep.equal({
      ok: false,
      reason: 'invalid-static-response-total',
    });
    expect(parse(validPayload({ rankingProfileId: undefined }))).to.deep.equal({
      ok: false,
      reason: 'invalid-static-response-ranking-profile',
    });
    expect(
      parse(
        validPayload({
          diagnostics: {
            ...validDiagnostics,
            issues: [{ code: 'allowlist-miss', severity: 'warn', stage: 'normalize', count: 1 }],
          },
        }),
      ),
    ).to.deep.equal({ ok: false, reason: 'invalid-static-response-diagnostics' });
  });

  it('raw total mismatch is partial success metadata and adoption rejects it', () => {
    const result = parse(validPayload({ total: 2 }));
    const response = expectParsedResponse(result);

    expect(response.total).to.equal(1);
    if (result.ok) {
      expect(result.metadata.rawTotalMatchedAcceptedItems).to.equal(false);
    }
    expect(adoptInitialStaticExploreSearchResponse(result)).to.deep.equal({
      ok: false,
      reason: 'raw-total-mismatch',
    });
  });

  it('legacy total fallback is metadata only and adoption rejects it', () => {
    const result = parse(validPayload({ total: undefined }));
    expectParsedResponse(result);

    if (result.ok) {
      expect(result.metadata.usedLegacyTotalFallback).to.equal(true);
    }
    expect(adoptInitialStaticExploreSearchResponse(result)).to.deep.equal({
      ok: false,
      reason: 'legacy-total-fallback',
    });
  });

  it('item-level invalid fields are deduplicated in union order', () => {
    const result = parse(
      validPayload({
        items: [
          validItem({ renderHref: '/notes/valid/' }),
          validItem({ canonicalPathname: '/assets/file.pdf' }),
          validItem({ title: '' }),
          validItem({ pathLabel: 1 }),
          validItem({ description: null }),
          validItem({ tags: ['alpha', ' Alpha '] }),
          validItem({ date: { epochMs: 'bad', original: null } }),
          validItem({ snippet: { segments: [{ text: 'x', matched: 'no' }] } }),
          validItem({ reasons: [{ kind: 'missing-kind', tokens: [] }] }),
        ],
        total: 9,
      }),
    );

    expectParsedResponse(result);
    if (result.ok) {
      expect(result.metadata.droppedItemCount).to.equal(9);
      expect(result.metadata.normalizedFromInvalidItemFields).to.deep.equal([
        'renderHref',
        'canonicalPathname',
        'title',
        'pathLabel',
        'description',
        'tags',
        'date',
        'snippet',
        'reasons',
      ]);
    }
    expect(adoptInitialStaticExploreSearchResponse(result)).to.deep.equal({
      ok: false,
      reason: 'dropped-items',
    });
  });

  it('fallback-normalized item fields reject adoption after higher-priority checks pass', () => {
    const result = parse(
      validPayload({
        items: [validItem({ pathLabel: '' })],
        tagCounts: { alpha: 1 },
        allTagCounts: { alpha: 1, beta: 3 },
      }),
    );

    expectParsedResponse(result);
    if (result.ok) {
      expect(result.metadata.normalizedFromInvalidItemFields).to.deep.equal(['pathLabel']);
    }
    expect(adoptInitialStaticExploreSearchResponse(result)).to.deep.equal({
      ok: false,
      reason: 'normalized-invalid-item-fields',
    });
  });

  it('adoption failure reason priority is fixed and parse failures do not leak parser reasons', () => {
    expect(
      adoptInitialStaticExploreSearchResponse({
        ok: false,
        reason: 'invalid-static-response-count-map',
      }),
    ).to.deep.equal({ ok: false, reason: 'parse-failed' });

    const validResult = parse(validPayload());
    const response = expectParsedResponse(validResult);
    if (!validResult.ok) {
      throw new Error('Expected valid parse result.');
    }

    const normalizedTotalMismatch: ParseStaticExploreSearchResponseResult = {
      ok: true,
      response: { ...response, total: response.total + 1 },
      metadata: validResult.metadata,
    };
    expect(adoptInitialStaticExploreSearchResponse(normalizedTotalMismatch)).to.deep.equal({
      ok: false,
      reason: 'normalized-total-mismatch',
    });

    const multipleFailures: ParseStaticExploreSearchResponseResult = {
      ok: true,
      response: { ...response, total: response.total + 1 },
      metadata: {
        ...validResult.metadata,
        droppedItemCount: 1,
        rawTotalMatchedAcceptedItems: false,
        usedLegacyTotalFallback: true,
        usedLegacyCountMapFallback: true,
        normalizedFromInvalidItemFields: ['title'],
      },
    };
    expect(adoptInitialStaticExploreSearchResponse(multipleFailures)).to.deep.equal({
      ok: false,
      reason: 'dropped-items',
    });
  });

  it('source-level contract keeps static droppedItemCount under metadata only', () => {
    const parserSource = readFileSync(
      resolve(process.cwd(), 'shared/search/search-json-artifact-parser.ts'),
      'utf8',
    );
    const staticResultType = parserSource.slice(
      parserSource.indexOf('export type ParseStaticExploreSearchResponseResult'),
      parserSource.indexOf('export const parseSearchCatalogJson'),
    );

    expect(staticResultType).toContain('readonly metadata: StaticExploreParseMetadata;');
    expect(staticResultType).not.toMatch(/readonly response: StaticExploreSearchResponse;[\s\S]*readonly droppedItemCount/u);
    expect(staticResultType).not.toContain('usedLegacyRankingProfileFallback');
    expect(parserSource).toContain("readonly droppedItemCount: number;");
    expect(parserSource).toContain("code: 'allowlist-miss'");
  });
});

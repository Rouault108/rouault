import { describe, expect, it } from 'vitest';

import {
  parseSearchCatalogJson,
  parseStaticExploreSearchResponseJson,
} from '../../shared/search/search-json-artifact-parser.js';
import type {
  SearchArtifactDiagnosticSource,
  SearchArtifactParseIssueCode,
  SearchDiagnosticSummaryCode,
  SearchJsonParseDiagnosticSink,
} from '../../shared/search/search-diagnostics.js';
import { DEFAULT_SITE_URL_CONTEXT } from '../../shared/site/site-url-context.js';

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

const isInternalDocumentPathname = (pathname: string): boolean => pathname.startsWith('/notes/');

describe('search-json-artifact-parser', () => {
  it('catalog schema failure reason と artifactSource を固定すること', () => {
    const recorder = createDiagnosticRecorder();

    const result = parseSearchCatalogJson({
      value: { items: [] },
      siteUrlContext: DEFAULT_SITE_URL_CONTEXT,
      isInternalDocumentPathname,
      diagnostics: recorder.diagnostics,
    });

    expect(result).to.deep.equal({ ok: false, reason: 'invalid-search-catalog-schema' });
    expect(recorder.issues).to.deep.equal([
      { code: 'invalid-search-catalog-schema', artifactSource: 'search-catalog-json' },
    ]);
  });

  it('static explore response は invalid item を metadata に集約し、partial success を返すこと', () => {
    const recorder = createDiagnosticRecorder();

    const result = parseStaticExploreSearchResponseJson({
      value: {
        mode: 'explore',
        items: [
          {
            canonicalPathname: '/notes/valid/',
            pathLabel: 'notes / valid',
            title: 'Valid',
            description: 'valid item',
            date: { epochMs: 1, original: '2026-01-01' },
            tags: ['alpha', 'beta'],
            snippet: { segments: [{ text: 'valid item', matched: false }] },
            reasons: [{ kind: 'tag-filter-match', tokens: ['alpha'] }],
          },
          {
            canonicalPathname: '/notes/legacy-render-href/',
            renderHref: '/notes/legacy-render-href/',
          },
          {
            canonicalPathname: '/assets/file.pdf',
            pathLabel: 'asset',
            title: 'Asset',
            tags: ['asset'],
          },
        ],
        total: 3,
        rankingProfileId: 'rouault-search-v1',
        tagCounts: { stale: 99 },
        allTagCounts: { stale: 10, other: 1 },
        diagnostics: {
          degraded: false,
          activeSources: ['catalog'],
          failures: [],
          issues: [],
        },
      },
      isInternalDocumentPathname,
      diagnostics: recorder.diagnostics,
    });

    expect(result.ok).to.equal(true);
    if (!result.ok) {
      throw new Error('static explore response parse failed');
    }

    expect(result.metadata.droppedItemCount).to.equal(2);
    expect(result.metadata.normalizedFromInvalidItemFields).to.deep.equal([
      'renderHref',
      'canonicalPathname',
    ]);
    expect(result.response.items).to.have.length(1);
    expect(result.response.items[0]?.canonicalPathname).to.equal('/notes/valid/');
    expect(result.response.total).to.equal(1);
    expect(result.response.tagCounts).to.deep.equal({ alpha: 1, beta: 1 });
    expect(result.response.allTagCounts).to.deep.equal({ alpha: 1, beta: 1 });
    expect(result.metadata.rawTotalMatchedAcceptedItems).to.equal(false);
    expect(result.metadata.usedLegacyTotalFallback).to.equal(false);
    expect(result.metadata.usedLegacyCountMapFallback).to.equal(false);
    expect(recorder.summaries).to.deep.equal([
      {
        code: 'search-json-dropped-items',
        artifactSource: 'static-explore-response-json',
        droppedItemCount: 2,
      },
    ]);
  });
});

import { describe, expect, it } from 'vitest';

import { validateInternalDocumentNavigationRequest } from '../../src/router/validate-internal-document-navigation-request.js';
import type { InternalDocumentRouteManifestState } from '../../src/router/internal-document-route-manifest-loader.js';

const createRouteManifestState = (): InternalDocumentRouteManifestState => ({
  status: 'loaded',
  manifest: {
    version: 1,
    buildId: 'build-current',
    buildLabel: 'test',
    generatedAt: '2026-01-01T00:00:00.000Z',
    siteOrigin: 'https://example.com',
    basePath: '',
    routes: ['/', '/notes/current', '/notes/known'],
  },
  routeSet: {
    routes: ['/', '/notes/current', '/notes/known'],
    has(pathname: string) {
      return pathname === '/' || pathname === '/notes/current' || pathname === '/notes/known';
    },
  },
});

describe('validateInternalDocumentNavigationRequest route presence', () => {
  it('route manifest 掲載 pathname を known-route として返すこと', () => {
    const result = validateInternalDocumentNavigationRequest({
      requestedUrl: '/notes/known/?q=1#section',
      currentUrl: 'https://example.com/notes/current/',
      siteUrlContext: { siteOrigin: 'https://example.com', basePath: '' },
      routeManifestState: createRouteManifestState(),
    });

    expect(result).toEqual({
      ok: true,
      normalizedUrl: '/notes/known?q=1#section',
      routePresence: 'known-route',
    });
  });

  it('manifest 非掲載の許可可能な pathname を missing-route-candidate として返すこと', () => {
    const result = validateInternalDocumentNavigationRequest({
      requestedUrl: '/__playwright_missing_route__?from=e2e#section-x',
      currentUrl: 'https://example.com/notes/current/',
      siteUrlContext: { siteOrigin: 'https://example.com', basePath: '' },
      routeManifestState: createRouteManifestState(),
    });

    expect(result).toEqual({
      ok: true,
      normalizedUrl: '/__playwright_missing_route__?from=e2e#section-x',
      routePresence: 'missing-route-candidate',
    });
  });

  it('routePresence 判定は query/hash を使わず basePath 除去後 pathname だけで行うこと', () => {
    const result = validateInternalDocumentNavigationRequest({
      requestedUrl: 'https://example.com/rouault/notes/known/?missing=1#unknown',
      currentUrl: 'https://example.com/rouault/notes/current/',
      siteUrlContext: { siteOrigin: 'https://example.com', basePath: '/rouault' },
      routeManifestState: createRouteManifestState(),
    });

    expect(result).toEqual({
      ok: true,
      normalizedUrl: '/rouault/notes/known?missing=1#unknown',
      routePresence: 'known-route',
    });
  });

  it('manifest 非掲載の default internal resource path は従来どおり拒否すること', () => {
    const result = validateInternalDocumentNavigationRequest({
      requestedUrl: '/assets/client.js',
      currentUrl: 'https://example.com/notes/current/',
      siteUrlContext: { siteOrigin: 'https://example.com', basePath: '' },
      routeManifestState: createRouteManifestState(),
    });

    expect(result).toEqual({ ok: false, reason: 'disallowed-url' });
  });
});

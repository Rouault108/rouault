import { describe, expect, it } from 'vitest';

import { validateDataImageUrl } from '../../shared/media/data-image-url.js';
import { parseSrcset } from '../../shared/media/srcset-parser.js';
import {
  sanitizeImageSource,
  sanitizeImageSrcset,
  sanitizeMediaSources,
  sanitizeScoreSource,
  sanitizeVideoPoster,
  sanitizeVideoSource,
  validateMediaUrl,
} from '../../shared/media/media-source-attributes.js';

const VALID_DATA_IMAGE = 'data:image/png;base64,iVBORw0KGgo=';


describe('media URL safety', () => {
  it('data image URL は明示 allowlist だけを許可すること', () => {
    expect(validateDataImageUrl(VALID_DATA_IMAGE)).toMatchObject({
      ok: true,
      mediaType: 'image/png',
    });
    expect(validateDataImageUrl('data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=')).toEqual({
      ok: false,
      reason: 'unsupported-data-image-media-type',
    });
    expect(validateDataImageUrl('data:text/html;base64,PGgxPng8L2gxPg==')).toEqual({
      ok: false,
      reason: 'unsupported-data-image-media-type',
    });
    expect(validateDataImageUrl('data:image/png;charset=utf-8;base64,iVBORw0KGgo=')).toEqual({
      ok: false,
      reason: 'invalid-data-image-parameters',
    });
  });

  it('image media URL は http / https / relative / allowlisted data image だけを許可すること', () => {
    expect(sanitizeImageSource('/media/image.png')).toBe('/media/image.png');
    expect(sanitizeImageSource('https://example.com/image.png')).toBe('https://example.com/image.png');
    expect(sanitizeImageSource(VALID_DATA_IMAGE)).toBe(VALID_DATA_IMAGE);
    expect(validateMediaUrl('javascript:alert(1)', { allowDataImage: true })).toEqual({
      ok: false,
      reason: 'unsupported-media-scheme',
    });
    expect(sanitizeImageSource('data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=')).toBeUndefined();
    expect(sanitizeImageSource('https://user@example.com/image.png')).toBeUndefined();
  });

  it('video media URL は data URL を許可しないこと', () => {
    expect(sanitizeVideoSource('/media/video.mp4')).toBe('/media/video.mp4');
    expect(sanitizeVideoPoster(VALID_DATA_IMAGE)).toBe(VALID_DATA_IMAGE);
    expect(sanitizeVideoSource(VALID_DATA_IMAGE)).toBeUndefined();
    expect(sanitizeVideoSource('mailto:hello@example.com')).toBeUndefined();
  });


  it('score source はリポジトリ内の相対 SVG だけを許可すること', () => {
    const siteUrlContext = { siteOrigin: 'https://example.com', basePath: '/rouault' };

    expect(sanitizeScoreSource('media/score/fragment.svg', { siteUrlContext })).toBe(
      'media/score/fragment.svg',
    );
    expect(
      sanitizeScoreSource('https://example.com/rouault/media/score/fragment.svg', {
        siteUrlContext,
      }),
    ).toBe('media/score/fragment.svg');
    expect(sanitizeScoreSource('/media/score/fragment.svg', { siteUrlContext })).toBeUndefined();
    expect(sanitizeScoreSource('../media/score/fragment.svg', { siteUrlContext })).toBeUndefined();
    expect(
      sanitizeScoreSource('https://other.example/rouault/media/score/fragment.svg', {
        siteUrlContext,
      }),
    ).toBeUndefined();
    expect(sanitizeScoreSource('media/score/fragment.png', { siteUrlContext })).toBeUndefined();
  });

  it('srcset parser は候補 URL と descriptor を分離し、unsafe 候補がある srcset を drop すること', () => {
    expect(parseSrcset('/a.png 1x, /b.png 2x')).toEqual({
      ok: true,
      candidates: [
        { url: '/a.png', descriptors: ['1x'] },
        { url: '/b.png', descriptors: ['2x'] },
      ],
    });
    expect(sanitizeImageSrcset('/a.png 1x, /b.png 2x')).toBe('/a.png 1x, /b.png 2x');
    expect(sanitizeImageSrcset('/a.png 1x, javascript:alert(1) 2x')).toBeUndefined();
  });

  it('media source descriptors は unsafe srcset を除外すること', () => {
    expect(
      sanitizeMediaSources([
        { type: 'image/webp', srcset: '/image.webp 1x, /image@2x.webp 2x' },
        { type: 'image/png', srcset: 'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4= 1x' },
      ]),
    ).toEqual([{ type: 'image/webp', srcset: '/image.webp 1x, /image@2x.webp 2x' }]);
  });
});

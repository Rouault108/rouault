import type { StaticRenderIdContext } from '../../shared/static-render-id-context.js';
import type { IconName } from '../../shared/icons/icon-paths.js';
import {
  sanitizeVideoPoster,
  sanitizeVideoSource,
} from '../../shared/media/media-source-attributes.js';
import type { HastNode, HastProperties } from './hast-utils.js';
import { createStaticIconHast } from './static-icon-hast.js';
import {
  booleanProperty,
  enhancerProperties,
  nativeElement as el,
  nativeRootProperties,
  nativeText as text,
  stringProperty,
} from './native-note-hast.js';

export interface NativeVideoTrack {
  readonly src: string;
  readonly srclang: string;
  readonly label: string;
  readonly kind: 'subtitles' | 'captions' | 'descriptions' | 'chapters' | 'metadata';
  readonly default?: boolean;
}

const button = (
  action: string,
  label: string,
  icons: readonly IconName[],
  className = 'note-control',
): HastNode =>
  el(
    'button',
    {
      type: 'button',
      className: [className],
      'data-video-action': action,
      'aria-label': label,
      ...(['skip-button', 'play-button'].includes(className) ? { tabIndex: -1 } : {}),
    },
    icons.map((icon, index) =>
      createStaticIconHast(icon, { 'data-video-icon': icon, ...(index ? { hidden: true } : {}) }),
    ),
  );

export const lowerNativeVideo = (
  node: HastNode,
  ids: StaticRenderIdContext,
  tracks: readonly NativeVideoTrack[] = [],
): void => {
  const caption = stringProperty(node, 'caption').trim();
  const captionId = caption ? ids.nextId('video-caption') : undefined;
  const media: HastProperties = {
    controls: true,
    playsInline: true,
    preload: 'metadata',
    className: ['video-element'],
  };
  const src = sanitizeVideoSource(node.properties?.['src']);
  const poster = sanitizeVideoPoster(node.properties?.['poster']);
  if (src) media['src'] = src;
  if (poster) media['poster'] = poster;
  for (const name of ['autoplay', 'loop']) if (booleanProperty(node, name)) media[name] = true;
  media['muted'] = node.properties?.['muted'] === undefined || booleanProperty(node, 'muted');
  if (node.properties?.['playsinline'] !== undefined)
    media['playsInline'] = booleanProperty(node, 'playsinline');
  for (const dimension of ['width', 'height']) {
    const value = Math.trunc(Number(node.properties?.[dimension]));
    if (Number.isFinite(value) && value > 0) media[dimension] = value;
  }
  const trackNodes = tracks.flatMap((track) => {
    const source = sanitizeVideoSource(track.src);
    if (
      !source ||
      !track.srclang.trim() ||
      !track.label.trim() ||
      !['subtitles', 'captions', 'descriptions', 'chapters', 'metadata'].includes(track.kind)
    )
      return [];
    return [
      el('track', {
        src: source,
        srclang: track.srclang.trim(),
        label: track.label.trim(),
        kind: track.kind,
        default: track.default === true,
      }),
    ];
  });
  const collectTracks = (child: HastNode): void => {
    if (child.tagName === 'track') {
      const source = sanitizeVideoSource(child.properties?.['src']);
      if (source) {
        const properties: HastProperties = { ...child.properties, src: source };
        delete properties['slot'];
        trackNodes.push(el('track', properties));
      }
      return;
    }
    if (stringProperty(child, 'slot') === 'tracks')
      for (const descendant of child.children ?? []) collectTracks(descendant);
  };
  for (const child of node.children ?? []) collectTracks(child);
  if (captionId) media['aria-describedby'] = captionId;
  const range = (name: string, label: string, maximum: number, step: number): HastNode =>
    el('input', {
      type: 'range',
      className: [`${name}-input`],
      [`data-video-${name}`]: '',
      min: 0,
      max: maximum,
      step,
      value: 0,
      'aria-label': label,
      'aria-valuemin': '0',
      'aria-valuemax': String(maximum),
      'aria-valuenow': '0',
    });
  const controls = el(
    'div',
    { 'data-video-enhanced-controls': '', 'data-search-exclude': '', hidden: true },
    [
      el('div', { className: ['state-layer'], 'data-video-empty': '', hidden: true }, [
        el('div', { className: ['empty-panel'], role: 'status' }, [
          createStaticIconHast('film'),
          text('動画ソースが設定されていません'),
        ]),
      ]),
      el(
        'div',
        {
          className: ['state-layer'],
          'data-video-loading': '',
          hidden: true,
          'aria-hidden': 'true',
        },
        [
          el('div', { className: ['loading-panel'] }, [
            el('span', { className: ['loading-spinner'] }),
          ]),
        ],
      ),
      el('div', { className: ['state-layer'], 'data-video-error': '', hidden: true }, [
        el('div', { className: ['error-panel'] }, [
          createStaticIconHast('triangle-alert'),
          el('span', { 'data-video-error-text': '', className: ['state-text'] }),
          el(
            'button',
            { type: 'button', className: ['retry-button'], 'data-video-action': 'retry' },
            [text('再試行')],
          ),
        ]),
      ]),
      el('div', { className: ['speed-badge'], 'aria-hidden': 'true' }, [text('2x')]),
      el('div', { className: ['skip-indicator', 'skip-indicator-left'], 'aria-hidden': 'true' }, [
        text('-10'),
      ]),
      el('div', { className: ['skip-indicator', 'skip-indicator-right'], 'aria-hidden': 'true' }, [
        text('+10'),
      ]),
      el(
        'div',
        {
          className: ['fullscreen-caption', ...(caption ? ['has-content'] : [])],
          'aria-hidden': 'true',
        },
        [text(caption)],
      ),
      el('div', { className: ['overlay-center'] }, [
        el('div', { className: ['skip-row'] }, [
          button('back', '10秒戻る', ['rotate-ccw'], 'skip-button'),
          button('play', '再生', ['play', 'pause', 'rotate-ccw'], 'play-button'),
          button('forward', '10秒進む', ['rotate-cw'], 'skip-button'),
        ]),
      ]),
      el('div', { className: ['floating-bar'] }, [
        el('div', { className: ['bar-row', 'bar-row-top'] }, [
          range('seek', '再生位置', 0, 0.1),
          el('span', { className: ['time-label'] }, [text('0:00 / 不明')]),
        ]),
        el('div', { className: ['bar-row', 'bar-row-bottom'] }, [
          el('div', { className: ['bar-group-left'] }, [
            button('play', '再生', ['play', 'pause', 'rotate-ccw']),
            button('back', '10秒戻る', ['rewind']),
            button('forward', '10秒進む', ['fast-forward']),
            button('mute', 'ミュート解除', ['volume-x', 'volume-1', 'volume-2']),
            range('volume', '音量', 1, 0.05),
          ]),
          el('div', { className: ['bar-group-right'] }, [
            button('captions', '字幕をオン', ['captions-off', 'captions']),
            button('fullscreen', '全画面表示', ['maximize', 'minimize']),
          ]),
        ]),
      ]),
    ],
  );
  const player: HastProperties = {
    'data-video-player': '',
    className: ['player-shell'],
    style: `aspect-ratio: ${media['width'] && media['height'] ? `${String(media['width'])} / ${String(media['height'])}` : '16 / 9'};`,
    ...(captionId ? { 'aria-describedby': captionId } : {}),
  };
  Object.assign(
    node,
    el(
      'figure',
      {
        ...nativeRootProperties(node),
        'data-video-root': '',
        ...enhancerProperties('video-enhancer', 'visible'),
      },
      [
        el('div', player, [
          el('video', media, trackNodes),
          controls,
          el('p', {
            'data-video-live-region': '',
            'data-search-exclude': '',
            className: ['sr-only'],
            role: 'status',
            'aria-live': 'polite',
            'aria-atomic': 'true',
          }),
        ]),
        ...(captionId
          ? [el('figcaption', { id: captionId, className: ['caption'] }, [text(caption)])]
          : []),
      ],
    ),
  );
};

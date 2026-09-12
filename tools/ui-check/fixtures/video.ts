import { UiVideo } from '../../../src/components/ui/video/video.js';

const captionVideo = document.querySelector('#video-captions');
if (captionVideo instanceof UiVideo) {
  captionVideo.tracks = [
    {
      src: '/src/assets/other/sample-vtt.vtt',
      srclang: 'ja',
      label: '日本語',
      kind: 'captions',
      default: true,
    },
  ];
}

const issuedWarnings =
  (globalThis as typeof globalThis & { litIssuedWarnings?: Set<string> }).litIssuedWarnings ??
  new Set<string>();
issuedWarnings.add('dev-mode');
(globalThis as typeof globalThis & { litIssuedWarnings?: Set<string> }).litIssuedWarnings =
  issuedWarnings;

import { setCustomElementsManifest } from '@storybook/web-components-vite';
import type { Preview } from '@storybook/web-components';
import customElements from '../custom-elements.json';

import '../src/assets/css/main.css';

setCustomElementsManifest(customElements);

const preview: Preview = {
  parameters: {
    actions: { argTypesRegex: '^on[A-Z].*' },

    a11y: {
      element: '#storybook-root',
    },

    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
      expanded: true,
    },

    backgrounds: {
      default: 'light',
      values: [
        {
          name: 'light',
          value: '#ffffff',
        },
        {
          name: 'dark',
          value: '#1a1a1a',
        },
      ],
    },

    docs: {
      source: { type: 'dynamic' },
    },

    options: {
      storySort: {
        order: ['Foundations', 'Layouts', 'Components', 'Legacy Components'],
      },
    },

    interactions: {
      debugging: true,
    },
  },
};

export default preview;

import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import './score';
import type { UiScore } from './score';

const INLINE_SCORE_TEMPLATE = html`
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 920 220">
    <rect width="920" height="220" fill="white"></rect>
    <g stroke="#111111" stroke-width="2" fill="none">
      <line x1="40" y1="56" x2="880" y2="56"></line>
      <line x1="40" y1="74" x2="880" y2="74"></line>
      <line x1="40" y1="92" x2="880" y2="92"></line>
      <line x1="40" y1="110" x2="880" y2="110"></line>
      <line x1="40" y1="128" x2="880" y2="128"></line>
    </g>
    <g fill="#111111">
      <ellipse cx="210" cy="92" rx="12" ry="9"></ellipse>
      <ellipse cx="300" cy="74" rx="12" ry="9"></ellipse>
      <ellipse cx="390" cy="110" rx="12" ry="9"></ellipse>
      <ellipse cx="500" cy="92" rx="12" ry="9"></ellipse>
      <ellipse cx="620" cy="74" rx="12" ry="9"></ellipse>
      <ellipse cx="740" cy="110" rx="12" ry="9"></ellipse>
    </g>
  </svg>
`;

const RUNTIME_SCORE_SVG = `
<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1400 240'>
  <rect width='1400' height='240' fill='white'/>
  <g stroke='#111111' stroke-width='2' fill='none'>
    <line x1='40' y1='70' x2='1360' y2='70'/>
    <line x1='40' y1='90' x2='1360' y2='90'/>
    <line x1='40' y1='110' x2='1360' y2='110'/>
    <line x1='40' y1='130' x2='1360' y2='130'/>
    <line x1='40' y1='150' x2='1360' y2='150'/>
  </g>
  <g fill='#111111'>
    <ellipse cx='200' cy='110' rx='12' ry='9'/>
    <ellipse cx='340' cy='90' rx='12' ry='9'/>
    <ellipse cx='500' cy='130' rx='12' ry='9'/>
    <ellipse cx='700' cy='110' rx='12' ry='9'/>
    <ellipse cx='860' cy='90' rx='12' ry='9'/>
    <ellipse cx='1040' cy='130' rx='12' ry='9'/>
    <ellipse cx='1220' cy='110' rx='12' ry='9'/>
  </g>
</svg>
`.trim();

const toDataSvgUri = (svg: string): string => `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
const RUNTIME_SCORE_SRC = toDataSvgUri(RUNTIME_SCORE_SVG);
const INVALID_SCORE_SRC = 'data:image/svg+xml;utf8,not-an-svg';

const meta: Meta<UiScore> = {
  title: 'Components/Score',
  component: 'ui-score',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
score の **表示見本** です。

この story ファイルは **docs / smoke / 手動確認** に限定します。  
inline SVG 優先 / runtime fetch / sanitize / overflow scroll / fade hint / aria busy / error live region の合否は Storybook で判定しません。

browser contract は別途 \
\`test/browser/score.browser.test.ts\` 側へ移してください。
        `,
      },
    },
  },
};

export default meta;
type Story = StoryObj<UiScore>;

export const Default: Story = {
  tags: ['smoke'],
  parameters: {
    docs: {
      description: {
        story: 'inline SVG を使う代表表示用 smoke story です。',
      },
    },
  },
  render: () => html`
    <ui-score caption="Inline score" label="簡単な楽譜">
      ${INLINE_SCORE_TEMPLATE}
    </ui-score>
  `,
};

export const LoadingAndErrorStates: Story = {
  tags: ['manual-only'],
  parameters: {
    docs: {
      description: {
        story:
          'runtime fetch と invalid source の見え方を手で確認するための manual-only story です。ロード・エラー状態の合否は `test/browser/score.browser.test.ts` を正本とします。',
      },
    },
  },
  render: () => html`
    <div style="display: grid; gap: 1rem;">
      <ui-score src="${RUNTIME_SCORE_SRC}" caption="Runtime score" label="runtime score"></ui-score>
      <ui-score src="${INVALID_SCORE_SRC}" caption="Invalid source" label="invalid score"></ui-score>
    </div>
  `,
};

export const OverflowAndFadeHints: Story = {
  parameters: {
    docs: {
      description: {
        story: '横に長い楽譜 surface の見え方を観察する docs story です。',
      },
    },
  },
  render: () => html`
    <ui-score src="${RUNTIME_SCORE_SRC}" caption="Overflow surface" label="overflow score"></ui-score>
  `,
};

export const ManualRuntimeFetchReview: Story = {
  tags: ['manual-only'],
  parameters: {
    docs: {
      description: {
        story: `
手動確認用 story です。

確認内容:
- inline と runtime fetch の視覚差
- overflow scroll / fade hint の印象
- caption の密度

sanitize / aria-busy / error live region / runtime replacement の合否は browser test 側へ移してください。
        `,
      },
    },
  },
  render: () => html`
    <div style="display: grid; gap: 1rem;">
      <ui-score caption="Inline score" label="inline score">${INLINE_SCORE_TEMPLATE}</ui-score>
      <ui-score src="${RUNTIME_SCORE_SRC}" caption="Runtime score" label="runtime score"></ui-score>
    </div>
  `,
};
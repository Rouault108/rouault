import { expect } from '@open-wc/testing';

import { enhanceScoreScroll } from '../../src/client/post-hydrate/score-scroll-enhancer.js';

const nextFrame = async (): Promise<void> => {
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve());
  });
};

const createScoreFixture = (): HTMLElement => {
  const score = document.createElement('figure');
  score.className = 'score';
  score.dataset['score'] = 'true';
  score.innerHTML = `
    <div class="score__scroll" data-score-scroll tabindex="0" style="inline-size: 120px; overflow-x: auto;">
      <div class="score__stage" data-score-stage style="inline-size: 360px; block-size: 20px;"></div>
    </div>
  `;
  document.body.append(score);
  return score;
};

const expectElement = <T extends Element>(element: T | null | undefined, label: string): T => {
  expect(element, label).to.not.equal(null);
  expect(element, label).to.not.equal(undefined);
  return element as T;
};

describe('score-scroll-enhancer', () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it('score root 起点で overflow / fade 状態を同期すること', async () => {
    const score = createScoreFixture();
    const scroll = score.querySelector<HTMLElement>('[data-score-scroll]');
    const scrollElement = expectElement(scroll, 'scroll');

    enhanceScoreScroll(score);
    await nextFrame();

    expect(scroll?.dataset['overflow']).to.equal('true');
    expect(scroll?.dataset['fadeRight']).to.equal('true');
    expect(scroll?.dataset['fadeLeft']).to.equal(undefined);

    scrollElement.scrollLeft = 80;
    scrollElement.dispatchEvent(new Event('scroll'));

    expect(scroll?.dataset['fadeLeft']).to.equal('true');
  });

  it('AbortSignal で listener を解除し、同じ score を再有効化できること', async () => {
    const score = createScoreFixture();
    const scroll = score.querySelector<HTMLElement>('[data-score-scroll]');
    const scrollElement = expectElement(scroll, 'scroll');
    const first = new AbortController();
    const second = new AbortController();

    enhanceScoreScroll(score, first.signal);
    await nextFrame();
    expect(scroll?.dataset['overflow']).to.equal('true');

    first.abort();
    scroll?.removeAttribute('data-overflow');
    scroll?.removeAttribute('data-fade-right');
    scrollElement.scrollLeft = 0;
    scrollElement.dispatchEvent(new Event('scroll'));
    expect(scroll?.dataset['overflow']).to.equal(undefined);

    enhanceScoreScroll(score, second.signal);
    await nextFrame();
    expect(scroll?.dataset['overflow']).to.equal('true');
    expect(scroll?.dataset['fadeRight']).to.equal('true');
  });
});

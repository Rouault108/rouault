import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { expect } from 'storybook/test';
import './not-found-page';
import type { NotFoundPage } from './not-found-page';

interface StoryArgs {
  requestedPath: string;
}

function getComponent(canvasElement: HTMLElement): NotFoundPage {
  const element = canvasElement.querySelector<NotFoundPage>('not-found-page');
  if (!element) {
    throw new Error('not-found-page が見つかりません');
  }
  return element;
}

function getShadowRoot(element: NotFoundPage): ShadowRoot {
  const shadowRoot = element.shadowRoot;
  if (!shadowRoot) {
    throw new Error('shadowRoot が見つかりません');
  }
  return shadowRoot;
}

function getStyleText(shadowRoot: ShadowRoot): string {
  const inlineStyles = Array.from(shadowRoot.querySelectorAll('style'))
    .map((style) => style.textContent)
    .join('\n');

  const adoptedStyles = shadowRoot.adoptedStyleSheets
    .map((sheet) => {
      try {
        return Array.from(sheet.cssRules)
          .map((rule) => rule.cssText)
          .join('\n');
      } catch {
        return '';
      }
    })
    .join('\n');

  const styleText = `${inlineStyles}\n${adoptedStyles}`.trim();
  if (!styleText) {
    throw new Error('style が見つかりません');
  }
  return styleText;
}

const meta = {
  title: 'Components/NotFoundPage',
  component: 'not-found-page',
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
  args: {
    requestedPath: '',
  },
  render: (args: StoryArgs) => html`
    <div style="min-height: 100vh; background: var(--bg-default); color: var(--fg-default);">
      <not-found-page requested-path=${args.requestedPath}></not-found-page>
    </div>
  `,
} satisfies Meta<StoryArgs>;

export default meta;

type Story = StoryObj<StoryArgs>;

export const DefaultContract: Story = {
  parameters: { rouaultContractKind: 'interaction-contract' },
  play: async ({ canvasElement }) => {
    const element = getComponent(canvasElement);
    const root = getShadowRoot(element);

    const section = root.querySelector('section[aria-labelledby="not-found-page-title"]');
    await expect(section).not.toBeNull();

    const heading = root.querySelector<HTMLHeadingElement>('#not-found-page-title');
    await expect(heading?.textContent.trim()).toBe('このページは見つかりませんでした');

    const nav = root.querySelector<HTMLElement>('nav[aria-label="404 navigation"]');
    await expect(nav).not.toBeNull();

    const links = Array.from(root.querySelectorAll<HTMLAnchorElement>('a'));
    const buttons = Array.from(root.querySelectorAll<HTMLButtonElement>('button'));

    await expect(links.length).toBe(2);
    await expect(buttons.length).toBe(1);
    await expect(links[0]?.getAttribute('href')).toBe('/search');
    await expect(links[1]?.getAttribute('href')).toBe('/about/');
    await expect(buttons[0]?.getAttribute('type')).toBe('button');
  },
};

export const RequestedPathContract: Story = {
  parameters: { rouaultContractKind: 'interaction-contract' },
  args: {
    requestedPath: '/notes/missing-entry?tab=outline#section-2',
  },
  play: async ({ canvasElement, args }) => {
    const element = getComponent(canvasElement);
    const root = getShadowRoot(element);

    const meta = root.querySelector('.meta');
    await expect(meta).not.toBeNull();

    const code = root.querySelector('.meta-value code');
    await expect(code?.textContent.trim()).toBe(args.requestedPath);
  },
};

export const NativeActionSemantics: Story = {
  parameters: { rouaultContractKind: 'interaction-contract' },
  play: async ({ canvasElement }) => {
    const element = getComponent(canvasElement);
    const root = getShadowRoot(element);

    const actionLinks = Array.from(root.querySelectorAll<HTMLAnchorElement>('a.action-link'));
    const actionButton = root.querySelector<HTMLButtonElement>('button.action-button');

    await expect(actionLinks.length).toBe(2);
    await expect(actionButton).not.toBeNull();

    await expect(actionLinks[0]?.textContent.trim()).toBe('検索ページへ');
    await expect(actionLinks[1]?.textContent.trim()).toBe('このサイトについて');
    await expect(actionButton?.textContent.trim()).toBe('前のページへ戻る');
  },
};

export const AccessibilityMediaContracts: Story = {
  parameters: { rouaultContractKind: 'boundary-contract' },
  play: async ({ canvasElement }) => {
    const element = getComponent(canvasElement);
    const root = getShadowRoot(element);
    const styleText = getStyleText(root);

    await expect(styleText.includes(':focus-visible')).toBe(true);
    await expect(styleText.includes('@media (prefers-reduced-motion: reduce)')).toBe(true);
    await expect(styleText.includes('@media (forced-colors: active)')).toBe(true);
  },
};

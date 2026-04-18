import type { TestingArea } from '../../shared/note/testing-area.js';

export interface TabsExamplePanel {
  readonly value: string;
  readonly label: string;
  readonly heading: string;
  readonly body: string;
  readonly codeLang?: string;
  readonly code?: string;
}

export interface TabsExampleDefinition {
  readonly defaultSelectedValue: string;
  readonly orientation: 'horizontal' | 'vertical';
  readonly urlSync?: boolean;
  readonly panels: readonly TabsExamplePanel[];
}

export interface TranslationExampleDefinition {
  readonly original: string;
  readonly translated: string;
  readonly lang: string;
  readonly targetLang: string;
  readonly surface: 'popover' | 'drawer';
}

export interface SandboxExampleDefinition {
  readonly heading: string;
  readonly controls: readonly ('theme' | 'surface' | 'viewport')[];
  readonly previewTheme: 'page' | 'light' | 'dark';
  readonly previewSurface: 'surface' | 'canvas' | 'muted';
  readonly previewViewport: 'full' | 'tablet' | 'mobile';
  readonly previewPadding: 'normal' | 'compact' | 'none';
  readonly previewAlign: 'center' | 'start' | 'stretch';
  readonly iframeTitle: string;
  readonly allowJs: boolean;
  readonly height: number;
  readonly htmlPath: string;
  readonly cssPath?: string;
  readonly jsPath?: string;
}

interface MarkdownFileExample {
  readonly kind: 'markdown-file';
  readonly markdownPath: string;
  readonly testingArea: TestingArea;
}

interface TabsMarkdownExample {
  readonly kind: 'tabs';
  readonly testingArea: 'interactive';
  readonly definition: TabsExampleDefinition;
}

interface TranslationMarkdownExample {
  readonly kind: 'translation';
  readonly testingArea: 'interactive';
  readonly definition: TranslationExampleDefinition;
}

interface SandboxMarkdownExample {
  readonly kind: 'sandbox';
  readonly testingArea: 'sandbox';
  readonly definition: SandboxExampleDefinition;
}

export type TestingExampleDefinition =
  | MarkdownFileExample
  | TabsMarkdownExample
  | TranslationMarkdownExample
  | SandboxMarkdownExample;

export const TESTING_EXAMPLE_MEDIA = {
  hero: 'examples/media/testing/test-hero.jpg',
  card: 'examples/media/testing/test-card.jpg',
} as const;

export const SHARED_TABS_URL_SYNC_EXAMPLE: TabsExampleDefinition = {
  defaultSelectedValue: 'javascript',
  orientation: 'horizontal',
  urlSync: true,
  panels: [
    {
      value: 'javascript',
      label: 'JavaScript',
      heading: 'JavaScriptのHello, World!',
      body: 'JavaScriptではこのように書きます。',
      codeLang: 'js',
      code: "console.log('Hello, World!');",
    },
    {
      value: 'rust',
      label: 'Rust',
      heading: 'RustのHello, World!',
      body: 'Rustではこのように書きます。',
      codeLang: 'rust',
      code: 'fn main() {\n    println!("Hello, World!");\n}',
    },
  ],
};

/**
 * interactive canary 専用の tabs URL sync 例です。
 *
 * - interactive canary は interactive UI の hydration だけを監視対象とします。
 * - code-block enhancer の post-commit hydration を混入させないため、
 *   panel 内へ fenced code block を入れません。
 * - code surface の検証は testing/code 側へ寄せます。
 */
export const SHARED_TABS_URL_SYNC_INTERACTIVE_CANARY_EXAMPLE: TabsExampleDefinition = {
  defaultSelectedValue: 'javascript',
  orientation: 'horizontal',
  urlSync: true,
  panels: [
    {
      value: 'javascript',
      label: 'JavaScript',
      heading: 'JavaScriptのHello, World!',
      body: 'JavaScriptではこのように書きます。ここでは interactive canary を純化するため、コードブロックは含めません。',
    },
    {
      value: 'rust',
      label: 'Rust',
      heading: 'RustのHello, World!',
      body: 'Rustではこのように書きます。ここでは interactive canary を純化するため、コードブロックは含めません。',
    },
  ],
};

export const SHARED_TABS_STATIC_EXAMPLE: TabsExampleDefinition = {
  defaultSelectedValue: 'overview',
  orientation: 'horizontal',
  panels: [
    {
      value: 'overview',
      label: '概要',
      heading: '概要の内容',
      body: '概要タブの最小構成です。',
    },
    {
      value: 'details',
      label: '詳細',
      heading: '詳細の内容',
      body: '詳細タブの最小構成です。',
    },
  ],
};

export const SHARED_TRANSLATION_EXAMPLE: TranslationExampleDefinition = {
  original: 'Je pense, donc je suis.',
  translated: '我思う、ゆえに我あり。',
  lang: 'fr',
  targetLang: 'ja',
  surface: 'drawer',
};

export const SHARED_SANDBOX_BUTTON_EXAMPLE: SandboxExampleDefinition = {
  heading: 'ボタン例',
  controls: ['viewport'],
  previewTheme: 'light',
  previewSurface: 'surface',
  previewViewport: 'tablet',
  previewPadding: 'compact',
  previewAlign: 'center',
  iframeTitle: 'ボタンの sandbox',
  allowJs: true,
  height: 160,
  htmlPath: 'examples/snippets/sandbox/button.html',
  cssPath: 'examples/snippets/sandbox/button.css',
  jsPath: 'examples/snippets/sandbox/button.js',
};

export const TESTING_EXAMPLES = {
  'markdown-basic/core': {
    kind: 'markdown-file',
    markdownPath: 'examples/snippets/markdown-basic/core.md',
    testingArea: 'markdown-basic',
  },
  'media/core': {
    kind: 'markdown-file',
    markdownPath: 'examples/snippets/media/core.md',
    testingArea: 'media',
  },
  'code/core': {
    kind: 'markdown-file',
    markdownPath: 'examples/snippets/code/core.md',
    testingArea: 'code',
  },
  'code/syntax-card': {
    kind: 'markdown-file',
    markdownPath: 'examples/snippets/code/syntax-card.md',
    testingArea: 'code',
  },
  'interactive/callout-details': {
    kind: 'markdown-file',
    markdownPath: 'examples/snippets/interactive/callout-details.md',
    testingArea: 'interactive',
  },
  'interactive/tabs-url-sync': {
    kind: 'tabs',
    testingArea: 'interactive',
    definition: SHARED_TABS_URL_SYNC_INTERACTIVE_CANARY_EXAMPLE,
  },
  'interactive/tabs-static': {
    kind: 'tabs',
    testingArea: 'interactive',
    definition: SHARED_TABS_STATIC_EXAMPLE,
  },
  'interactive/translation': {
    kind: 'translation',
    testingArea: 'interactive',
    definition: SHARED_TRANSLATION_EXAMPLE,
  },
  'sandbox/button-preview': {
    kind: 'sandbox',
    testingArea: 'sandbox',
    definition: SHARED_SANDBOX_BUTTON_EXAMPLE,
  },
} as const satisfies Record<string, TestingExampleDefinition>;

export type TestingExampleRef = keyof typeof TESTING_EXAMPLES;

const escapeAttribute = (value: string): string => value.replace(/"/g, '\\"');

const renderTabsMarkdown = (definition: TabsExampleDefinition): string => {
  const lines = [
    `::tabs{default-selected-value="${escapeAttribute(definition.defaultSelectedValue)}" orientation="${definition.orientation}"${definition.urlSync ? ' url-sync="true"' : ''}}`,
  ];

  for (const panel of definition.panels) {
    lines.push(`::tab{value="${escapeAttribute(panel.value)}"}`);
    lines.push(panel.label);
    lines.push('::');
    lines.push('::panel');
    lines.push('');
    lines.push(`### ${panel.heading}`);
    lines.push('');
    lines.push(panel.body);
    if (panel.codeLang && panel.code) {
      lines.push('');
      lines.push(`\`\`\`${panel.codeLang}`);
      lines.push(panel.code);
      lines.push('```');
    }
    lines.push('');
    lines.push('::');
  }

  lines.push('::');
  return lines.join('\n');
};

const renderTranslationMarkdown = (definition: TranslationExampleDefinition): string =>
  [
    `::translation-overlay{lang="${definition.lang}" target-lang="${definition.targetLang}" surface="${definition.surface}" original="${definition.original}" translated="${definition.translated}"}`,
    '::',
    '',
    `::translation{lang="${definition.lang}" target-lang="${definition.targetLang}"}`,
    definition.original,
    '',
    definition.translated,
    '::',
  ].join('\n');

const renderSandboxMarkdown = (
  definition: SandboxExampleDefinition,
  readText: (filePath: string) => string,
): string => {
  const controlsAttribute =
    definition.controls.length > 0 ? ` controls="${definition.controls.join(' ')}"` : '';

  const lines = [
    `::code-preview{heading="${escapeAttribute(definition.heading)}"${controlsAttribute} preview-theme="${definition.previewTheme}" preview-surface="${definition.previewSurface}" preview-viewport="${definition.previewViewport}" preview-padding="${definition.previewPadding}" preview-align="${definition.previewAlign}"}`,
    `::preview-sandbox{iframe-title="${escapeAttribute(definition.iframeTitle)}"${definition.allowJs ? ' allow-js="true"' : ''} height="${String(definition.height)}"}`,
    '',
    `\`\`\`preview-html filename="${definition.htmlPath.split('/').at(-1) ?? 'example.html'}"`,
    readText(definition.htmlPath).trimEnd(),
    '```',
  ];

  if (definition.cssPath) {
    lines.push('');
    lines.push(
      `\`\`\`preview-css filename="${definition.cssPath.split('/').at(-1) ?? 'example.css'}"`,
    );
    lines.push(readText(definition.cssPath).trimEnd());
    lines.push('```');
  }

  if (definition.jsPath) {
    lines.push('');
    lines.push(
      `\`\`\`preview-js filename="${definition.jsPath.split('/').at(-1) ?? 'example.js'}"`,
    );
    lines.push(readText(definition.jsPath).trimEnd());
    lines.push('```');
  }

  lines.push('');
  lines.push('::');
  lines.push('::');
  return lines.join('\n');
};

export const renderTestingExampleMarkdown = (
  example: TestingExampleDefinition,
  readText: (filePath: string) => string,
): string => {
  switch (example.kind) {
    case 'markdown-file':
      return readText(example.markdownPath);
    case 'tabs':
      return renderTabsMarkdown(example.definition);
    case 'translation':
      return renderTranslationMarkdown(example.definition);
    case 'sandbox':
      return renderSandboxMarkdown(example.definition, readText);
  }
};

import { expect } from '@open-wc/testing';

export interface Rgba {
  /** 0..255 */
  readonly r: number;
  /** 0..255 */
  readonly g: number;
  /** 0..255 */
  readonly b: number;
  /** 0..1 */
  readonly a: number;
}

export type ColorProperty =
  | 'color'
  | 'background-color'
  | 'border-top-color'
  | 'border-right-color'
  | 'border-bottom-color'
  | 'border-left-color'
  | 'outline-color';

export interface ResolveComputedColorOptions {
  readonly currentColorBase?: string;
  readonly tokenName?: string;
}

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

const toRgba = (r: number, g: number, b: number, a = 1): Rgba => ({
  r: Math.round(clamp(r, 0, 255)),
  g: Math.round(clamp(g, 0, 255)),
  b: Math.round(clamp(b, 0, 255)),
  a: clamp(a, 0, 1),
});

const splitTopLevel = (value: string, separator = ','): string[] => {
  const parts: string[] = [];
  let current = '';
  let depth = 0;
  let quote: 'single' | 'double' | null = null;
  let escaped = false;

  for (const char of value) {
    if (quote !== null) {
      current += char;
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if ((quote === 'single' && char === "'") || (quote === 'double' && char === '"')) {
        quote = null;
      }
      continue;
    }
    if (char === "'") {
      quote = 'single';
      current += char;
      continue;
    }
    if (char === '"') {
      quote = 'double';
      current += char;
      continue;
    }
    if (char === '(') depth += 1;
    if (char === ')') depth -= 1;
    if (char === separator && depth === 0) {
      parts.push(current.trim());
      current = '';
      continue;
    }
    current += char;
  }
  if (current.trim().length > 0) parts.push(current.trim());
  return parts;
};

const splitSpaceTopLevel = (value: string): string[] => {
  const parts: string[] = [];
  let current = '';
  let depth = 0;
  let quote: 'single' | 'double' | null = null;
  let escaped = false;
  for (const char of value.trim()) {
    if (quote !== null) {
      current += char;
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if ((quote === 'single' && char === "'") || (quote === 'double' && char === '"'))
        quote = null;
      continue;
    }
    if (char === "'") {
      quote = 'single';
      current += char;
      continue;
    }
    if (char === '"') {
      quote = 'double';
      current += char;
      continue;
    }
    if (char === '(') depth += 1;
    if (char === ')') depth -= 1;
    if (/\s/u.test(char) && depth === 0) {
      if (current.length > 0) {
        parts.push(current);
        current = '';
      }
      continue;
    }
    current += char;
  }
  if (current.length > 0) parts.push(current);
  return parts;
};

const parseAlpha = (value: string | undefined): number => {
  if (value === undefined) return 1;
  const trimmed = value.trim();
  if (trimmed.endsWith('%')) return Number(trimmed.slice(0, -1)) / 100;
  return Number(trimmed);
};

const parseRgbChannel = (value: string): number => {
  const trimmed = value.trim();
  if (trimmed.endsWith('%')) return (Number(trimmed.slice(0, -1)) / 100) * 255;
  return Number(trimmed);
};

const srgbToLinear = (encoded: number): number => {
  const value = encoded / 255;
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
};

const linearToEncodedChannel = (linear: number): number => {
  const clamped = clamp(linear, 0, 1);
  const encoded = clamped <= 0.0031308 ? 12.92 * clamped : 1.055 * clamped ** (1 / 2.4) - 0.055;
  return encoded * 255;
};

interface Oklab {
  readonly l: number;
  readonly a: number;
  readonly b: number;
  readonly alpha: number;
}

const rgbaToOklab = (color: Rgba): Oklab => {
  const r = srgbToLinear(color.r);
  const g = srgbToLinear(color.g);
  const b = srgbToLinear(color.b);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return {
    l: 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    a: 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    b: 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
    alpha: color.a,
  };
};

const oklabToRgba = (lab: Oklab): Rgba => {
  const l = lab.l + 0.3963377774 * lab.a + 0.2158037573 * lab.b;
  const m = lab.l - 0.1055613458 * lab.a - 0.0638541728 * lab.b;
  const s = lab.l - 0.0894841775 * lab.a - 1.291485548 * lab.b;
  const l3 = l ** 3;
  const m3 = m ** 3;
  const s3 = s ** 3;
  return toRgba(
    linearToEncodedChannel(+4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3),
    linearToEncodedChannel(-1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3),
    linearToEncodedChannel(-0.0041960863 * l3 - 0.7034186147 * m3 + 1.707614701 * s3),
    lab.alpha,
  );
};

const oklchToRgba = (l: number, c: number, h: number, alpha: number): Rgba => {
  const radians = (h * Math.PI) / 180;
  return oklabToRgba({ l, a: c * Math.cos(radians), b: c * Math.sin(radians), alpha });
};

export const parseColor = (value: string): Rgba => {
  const trimmed = value.trim();
  if (trimmed === 'transparent') return toRgba(0, 0, 0, 0);

  const rgb = trimmed.match(/^rgba?\((?<body>.*)\)$/u);
  if (rgb?.groups) {
    const body = rgb.groups['body'] ?? '';
    const slashParts = splitTopLevel(body, '/');
    const channels =
      slashParts.length === 2 ? splitSpaceTopLevel(slashParts[0] ?? '') : splitTopLevel(body);
    const alpha = slashParts.length === 2 ? parseAlpha(slashParts[1]) : parseAlpha(channels[3]);
    if (channels.length < 3) throw new Error(`RGB 色を解釈できません: ${value}`);
    return toRgba(
      parseRgbChannel(channels[0] ?? ''),
      parseRgbChannel(channels[1] ?? ''),
      parseRgbChannel(channels[2] ?? ''),
      alpha,
    );
  }

  const srgb = trimmed.match(/^color\(\s*srgb\s+(?<body>.*)\)$/u);
  if (srgb?.groups) {
    const parts = splitTopLevel(srgb.groups['body'] ?? '', '/');
    const channels = splitSpaceTopLevel(parts[0] ?? '');
    if (channels.length < 3) throw new Error(`color(srgb ...) を解釈できません: ${value}`);
    return toRgba(
      Number(channels[0]) * 255,
      Number(channels[1]) * 255,
      Number(channels[2]) * 255,
      parseAlpha(parts[1]),
    );
  }

  const cssNumber = '[+-]?(?:\\d+\\.?\\d*|\\.\\d+)(?:e[+-]?\\d+)?';

  const oklch = trimmed.match(
    new RegExp(
      `^oklch\\(\\s*(?<l>${cssNumber})(?<lp>%?)\\s+(?<c>${cssNumber})\\s+(?<h>${cssNumber})(?:\\s*\\/\\s*(?<alpha>${cssNumber}%?))?\\s*\\)$`,
      'u',
    ),
  );
  if (oklch?.groups) {
    const l = Number(oklch.groups['l']) / (oklch.groups['lp'] === '%' ? 100 : 1);
    return oklchToRgba(
      l,
      Number(oklch.groups['c']),
      Number(oklch.groups['h']),
      parseAlpha(oklch.groups['alpha']),
    );
  }

  const oklab = trimmed.match(
    new RegExp(
      `^oklab\\(\\s*(?<l>${cssNumber})(?<lp>%?)\\s+(?<a>${cssNumber})\\s+(?<b>${cssNumber})(?:\\s*\\/\\s*(?<alpha>${cssNumber}%?))?\\s*\\)$`,
      'u',
    ),
  );
  if (oklab?.groups) {
    const l = Number(oklab.groups['l']) / (oklab.groups['lp'] === '%' ? 100 : 1);
    return oklabToRgba({
      l,
      a: Number(oklab.groups['a']),
      b: Number(oklab.groups['b']),
      alpha: parseAlpha(oklab.groups['alpha']),
    });
  }

  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) throw new Error('canvas context を作成できません');
  context.fillStyle = 'rgb(1, 2, 3)';
  context.fillStyle = trimmed;
  if (context.fillStyle === 'rgb(1, 2, 3)') throw new Error(`CSS 色を解決できません: ${value}`);
  return parseColor(context.fillStyle);
};

const readCustomProperty = (contextElement: Element, tokenName: string): string => {
  let current: Element | null = contextElement;
  while (current !== null) {
    const value = getComputedStyle(current).getPropertyValue(tokenName).trim();
    if (value.length > 0) return value;
    current = current.parentElement;
  }
  const root = contextElement.getRootNode();
  if (root instanceof ShadowRoot) {
    const value = getComputedStyle(root.host).getPropertyValue(tokenName).trim();
    if (value.length > 0) return value;
  }
  const value = getComputedStyle(document.documentElement).getPropertyValue(tokenName).trim();
  if (value.length > 0) return value;
  throw new Error(`${tokenName} を解決できません`);
};

const expandVars = (value: string, contextElement: Element, seen = new Set<string>()): string => {
  const varStart = value.indexOf('var(');
  if (varStart < 0) return value;
  let depth = 0;
  for (let index = varStart + 4; index < value.length; index += 1) {
    const char = value[index];
    if (char === '(') depth += 1;
    if (char === ')') {
      if (depth === 0) {
        const body = value.slice(varStart + 4, index);
        const [tokenName, fallback] = splitTopLevel(body);
        if (tokenName === undefined || !tokenName.trim().startsWith('--')) {
          throw new Error(`var(...) の token 名を解釈できません: ${value}`);
        }
        const token = tokenName.trim();
        if (seen.has(token)) throw new Error(`CSS 変数が循環しています: ${token}`);
        let replacement: string;
        try {
          seen.add(token);
          replacement = readCustomProperty(contextElement, token);
        } catch (error) {
          if (fallback === undefined) throw error;
          replacement = fallback;
        } finally {
          seen.delete(token);
        }
        return expandVars(
          `${value.slice(0, varStart)}${replacement}${value.slice(index + 1)}`,
          contextElement,
          seen,
        );
      }
      depth -= 1;
    }
  }
  throw new Error(`var(...) が閉じられていません: ${value}`);
};

const resolveOklchFrom = (
  value: string,
  contextElement: Element,
  property: ColorProperty,
  options: ResolveComputedColorOptions,
): Rgba | null => {
  const match = value.match(
    /^oklch\(\s*from\s+(?<source>var\(--(?:primary|fg-default)\))\s+l\s+c\s+h\s*\/\s*(?<alpha>[0-9.]+%?)\s*\)$/u,
  );
  if (!match?.groups) return null;
  const source = resolveComputedColor(
    match.groups['source'] ?? '',
    contextElement,
    property,
    options,
  );
  const lab = rgbaToOklab(source);
  return oklabToRgba({ ...lab, alpha: parseAlpha(match.groups['alpha']) });
};

const parseColorMixPart = (part: string): { color: string; percentage?: number } => {
  const pieces = splitSpaceTopLevel(part);
  const last = pieces.at(-1);
  if (last?.endsWith('%')) {
    return { color: pieces.slice(0, -1).join(' '), percentage: Number(last.slice(0, -1)) / 100 };
  }
  return { color: part };
};

const resolveColorMix = (
  value: string,
  contextElement: Element,
  property: ColorProperty,
  options: ResolveComputedColorOptions,
): Rgba | null => {
  const match = value.match(/^color-mix\(\s*in\s+oklab\s*,\s*(?<body>.*)\)$/u);
  if (!match?.groups) return null;
  const parts = splitTopLevel(match.groups['body'] ?? '');
  if (parts.length !== 2) throw new Error(`color-mix(in oklab, ...) は2色だけ対応します: ${value}`);
  if (parts.some((part) => part.includes('color-mix(')))
    throw new Error(`nested color-mix は非対応です: ${value}`);
  const first = parseColorMixPart(parts[0] ?? '');
  const second = parseColorMixPart(parts[1] ?? '');
  let p1: number;
  let p2: number;

  if (first.percentage === undefined) {
    if (second.percentage === undefined) {
      p1 = 0.5;
      p2 = 0.5;
    } else {
      p2 = second.percentage;
      p1 = 1 - p2;
    }
  } else if (second.percentage === undefined) {
    p1 = first.percentage;
    p2 = 1 - p1;
  } else {
    p1 = first.percentage;
    p2 = second.percentage;
  }

  const sum = p1 + p2;
  if (sum <= 0) return toRgba(0, 0, 0, 0);

  const alphaMultiplier = Math.min(sum, 1);
  if (sum !== 1) {
    p1 /= sum;
    p2 /= sum;
  }

  const color1 = rgbaToOklab(resolveComputedColor(first.color, contextElement, property, options));
  const color2 = rgbaToOklab(resolveComputedColor(second.color, contextElement, property, options));
  const a1 = color1.alpha * p1;
  const a2 = color2.alpha * p2;
  const outAlpha = (a1 + a2) * alphaMultiplier;
  if (outAlpha <= 0) return toRgba(0, 0, 0, 0);
  return oklabToRgba({
    l: (color1.l * a1 + color2.l * a2) / (a1 + a2),
    a: (color1.a * a1 + color2.a * a2) / (a1 + a2),
    b: (color1.b * a1 + color2.b * a2) / (a1 + a2),
    alpha: outAlpha,
  });
};

const normalizeViaProbe = (
  value: string,
  contextElement: Element,
  property: ColorProperty,
): string | null => {
  const root = contextElement.getRootNode();
  const probe = document.createElement('span');
  probe.style.position = 'absolute';
  probe.style.inset = '-9999px auto auto -9999px';
  probe.style.setProperty(property, value);
  if (probe.style.getPropertyValue(property) === '') return null;

  const parent = root instanceof ShadowRoot ? root : document.body;
  parent.append(probe);
  const computed = getComputedStyle(probe).getPropertyValue(property);
  probe.remove();
  return computed.trim().length > 0 ? computed : null;
};

export const resolveComputedColor = (
  value: string,
  contextElement: Element,
  property: ColorProperty,
  options: ResolveComputedColorOptions = {},
): Rgba => {
  const trimmed = value.trim();
  if (trimmed === 'currentColor') {
    return resolveComputedColor(
      options.currentColorBase ?? getComputedStyle(contextElement).color,
      contextElement,
      'color',
      options,
    );
  }
  if (trimmed.startsWith('var(')) {
    return resolveComputedColor(
      expandVars(trimmed, contextElement),
      contextElement,
      property,
      options,
    );
  }
  const expanded = expandVars(trimmed, contextElement);
  const relative = resolveOklchFrom(expanded, contextElement, property, options);
  if (relative !== null) return relative;
  const mixed = resolveColorMix(expanded, contextElement, property, options);
  if (mixed !== null) return mixed;
  const probed = normalizeViaProbe(expanded, contextElement, property);
  if (probed !== null && probed !== expanded) return parseColor(probed);
  try {
    return parseColor(expanded);
  } catch (error) {
    throw new Error(
      `${options.tokenName ?? property} の色を解決できません: ${value} / ${expanded}`,
      { cause: error },
    );
  }
};

export const resolvePseudoColor = (
  element: Element,
  pseudoElement: '::before' | '::after',
  property: ColorProperty,
): Rgba => {
  const pseudoStyle = getComputedStyle(element, pseudoElement);
  return resolveComputedColor(pseudoStyle.getPropertyValue(property), element, property, {
    currentColorBase: pseudoStyle.color,
  });
};

export const compositeOver = (foreground: Rgba, background: Rgba): Rgba => {
  const alpha = foreground.a + background.a * (1 - foreground.a);
  if (alpha <= 0) return toRgba(0, 0, 0, 0);
  return toRgba(
    (foreground.r * foreground.a + background.r * background.a * (1 - foreground.a)) / alpha,
    (foreground.g * foreground.a + background.g * background.a * (1 - foreground.a)) / alpha,
    (foreground.b * foreground.a + background.b * background.a * (1 - foreground.a)) / alpha,
    alpha,
  );
};

const backgroundOf = (element: Element): Rgba =>
  resolveComputedColor(getComputedStyle(element).backgroundColor, element, 'background-color');

const collectBackgroundChain = (element: Element, fallbackRoot?: Element): Element[] => {
  const chain: Element[] = [];
  const seen = new Set<Element>();
  const pushChain = (start: Element | null): void => {
    let current: Element | null = start;
    while (current !== null && !seen.has(current)) {
      chain.push(current);
      seen.add(current);
      current = current.parentElement;
    }
    const root = start?.getRootNode();
    if (root instanceof ShadowRoot && !seen.has(root.host)) pushChain(root.host);
  };
  pushChain(element);
  if (fallbackRoot !== undefined) pushChain(fallbackRoot);
  pushChain(document.body);
  pushChain(document.documentElement);
  return chain;
};

export const resolvePaintedElementBackground = (element: Element, fallbackRoot?: Element): Rgba => {
  const candidates = collectBackgroundChain(element, fallbackRoot).map((candidate) => ({
    element: candidate,
    color: backgroundOf(candidate),
  }));
  let painted = toRgba(0, 0, 0, 0);
  for (const { color } of [...candidates].reverse()) {
    painted = compositeOver(color, painted);
  }
  if (painted.a !== 1) {
    throw new Error(
      `不透明な painted background を解決できません: alpha=${painted.a}; path=${candidates
        .map(
          ({ element, color }) =>
            `${element.localName}:${getComputedStyle(element).backgroundColor}:${color.a}`,
        )
        .join(' -> ')}`,
    );
  }
  return painted;
};

const luminance = (color: Rgba): number => {
  const r = srgbToLinear(color.r);
  const g = srgbToLinear(color.g);
  const b = srgbToLinear(color.b);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

export const contrastRatio = (foreground: Rgba, background: Rgba): number => {
  const fg = luminance(foreground);
  const bg = luminance(background);
  const lighter = Math.max(fg, bg);
  const darker = Math.min(fg, bg);
  return (lighter + 0.05) / (darker + 0.05);
};

export const expectContrast = (foreground: Rgba, background: Rgba, minimum: number): void => {
  expect(foreground.a, 'foreground alpha').to.equal(1);
  expect(background.a, 'background alpha').to.equal(1);
  expect(contrastRatio(foreground, background)).to.be.greaterThanOrEqual(minimum);
};

export const expectColorClose = (actual: Rgba, expected: Rgba, tolerance = 2): void => {
  expect(Math.abs(actual.r - expected.r), 'red channel').to.be.lessThanOrEqual(tolerance);
  expect(Math.abs(actual.g - expected.g), 'green channel').to.be.lessThanOrEqual(tolerance);
  expect(Math.abs(actual.b - expected.b), 'blue channel').to.be.lessThanOrEqual(tolerance);
  expect(Math.abs(actual.a - expected.a), 'alpha channel').to.be.lessThanOrEqual(0.01);
};

export const expectPseudoElementGenerated = (
  element: Element,
  pseudoElement: '::before' | '::after',
  label: string,
): void => {
  const style = getComputedStyle(element, pseudoElement);
  expect(style.content, `${label} content`).not.to.equal('none');
  expect(style.content, `${label} content`).not.to.equal('normal');
};

export const expectVisiblePseudoPaint = (
  element: Element,
  pseudoElement: '::before' | '::after',
  color: Rgba,
  label: string,
): void => {
  const style = getComputedStyle(element, pseudoElement);
  expectPseudoElementGenerated(element, pseudoElement, label);
  expect(style.display, `${label} display`).not.to.equal('none');
  expect(['hidden', 'collapse'], `${label} visibility`).not.to.include(style.visibility);
  expect(Number(style.opacity), `${label} opacity`).to.be.greaterThan(0);
  expect(color.a, `${label} raw alpha`).to.be.greaterThan(0);
  const hostRect = element.getBoundingClientRect();
  if (pseudoElement === '::before') {
    expect(hostRect.width, `${label} host width`).to.be.greaterThan(0);
    expect(hostRect.height, `${label} host height`).to.be.greaterThan(0);
    return;
  }
  const inlineSize = Number.parseFloat(style.inlineSize || style.width);
  if (Number.isFinite(inlineSize) && inlineSize > 0) {
    expect(hostRect.height, `${label} host height`).to.be.greaterThan(0);
    return;
  }
  expect(hostRect.height, `${label} host height fallback`).to.be.greaterThan(0);
};

export const expectVisibleElementPaint = (
  element: HTMLElement,
  color: Rgba,
  label: string,
): void => {
  const style = getComputedStyle(element);
  expect(style.display, `${label} display`).not.to.equal('none');
  expect(['hidden', 'collapse'], `${label} visibility`).not.to.include(style.visibility);
  expect(Number(style.opacity), `${label} opacity`).to.be.greaterThan(0);
  expect(color.a, `${label} raw alpha`).to.be.greaterThan(0);
  const rect = element.getBoundingClientRect();
  expect(rect.width, `${label} width`).to.be.greaterThan(0);
  expect(rect.height, `${label} height`).to.be.greaterThan(0);
};

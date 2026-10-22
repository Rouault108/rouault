import postcss, { type Declaration, type Rule } from 'postcss';
import selectorParser from 'postcss-selector-parser';

export interface CssSource {
  readonly file: string;
  readonly css: string;
}

export interface TokenReferenceLocation {
  readonly file: string;
  readonly selector: string;
  readonly property: string;
  readonly reference: string;
}

export interface TokenReferenceFinding extends TokenReferenceLocation {
  readonly kind: 'undefined' | 'unproven-scope' | 'cycle' | 'unsupported';
}

interface Reference {
  readonly name: string;
  readonly fallback: readonly Reference[] | undefined;
}

// 値全体の文法判定ではなく、文字列・コメント・括弧を保護して var の引数を読む。
const references = (value: string): Reference[] => {
  const result: Reference[] = [];
  let index = 0;
  while (index < value.length) {
    const char = value[index];
    if (char === '/' && value[index + 1] === '*') {
      const end = value.indexOf('*/', index + 2);
      if (end < 0) throw new Error('閉じていないコメント');
      index = end + 2;
    } else if (char === '"' || char === "'") {
      const quote = char;
      index++;
      while (index < value.length && value[index] !== quote) {
        index += value[index] === '\\' ? 2 : 1;
      }
      index++;
    } else if (char === '\\') {
      throw new Error('escaped identifier は未対応');
    } else if (/[a-zA-Z_-]/u.test(char ?? '')) {
      const start = index;
      while (/[a-zA-Z0-9_-]/u.test(value[index] ?? '')) index++;
      const name = value.slice(start, index);
      if (value[index] !== '(') continue;
      let depth = 1;
      const argumentStart = ++index;
      let comma: number | undefined;
      let quote: string | undefined;
      while (index < value.length && depth > 0) {
        const next = value[index];
        if (next === '\\') {
          index += 2;
          continue;
        }
        if (quote !== undefined) {
          if (next === quote) quote = undefined;
        } else if (next === '"' || next === "'") quote = next;
        else if (next === '/' && value[index + 1] === '*') {
          const end = value.indexOf('*/', index + 2);
          if (end < 0) throw new Error('閉じていないコメント');
          index = end + 2;
          continue;
        } else if (next === '(') depth++;
        else if (next === ')') depth--;
        else if (next === ',' && depth === 1 && comma === undefined) comma = index;
        if (depth > 0) index++;
      }
      if (depth !== 0) throw new Error('閉じていない関数');
      if (name.toLowerCase() === 'var') {
        const token = value
          .slice(argumentStart, comma ?? index)
          .replace(/\/\*[\s\S]*?\*\//gu, '')
          .trim();
        if (!/^--[a-zA-Z0-9_-]+$/u.test(token)) throw new Error('未対応の var 名');
        result.push({
          name: token,
          fallback: comma === undefined ? undefined : references(value.slice(comma + 1, index)),
        });
      } else result.push(...references(value.slice(argumentStart, index)));
      index++;
    } else index++;
  }
  return result;
};

interface Entry {
  readonly file: string;
  readonly selector: string;
  readonly conditions: readonly string[];
  readonly declaration: Declaration;
  readonly references: readonly Reference[];
}

const conditionsFor = (rule: Rule): string[] => {
  const result: string[] = [];
  let parent = rule.parent;
  while (parent && parent.type !== 'root') {
    if (
      parent.type !== 'atrule' ||
      ![
        'media',
        'supports',
        'layer',
        'container',
        'starting-style',
        'keyframes',
        '-webkit-keyframes',
      ].includes(parent.name)
    ) {
      result.push('unsupported ancestry');
    } else result.push(`@${parent.name} ${parent.params}`);
    parent = parent.parent;
  }
  return result.reverse();
};

// selector AST の compound prefix だけを扱う。兄弟、:is/:where の包含推論は行わない。
const inheritsFrom = (consumer: string, provider: string): boolean => {
  if (consumer === provider) return true;
  const provided = selectorParser().astSync(provider).nodes[0]?.nodes ?? [];
  const consumed = selectorParser().astSync(consumer).nodes[0]?.nodes ?? [];
  if (provided.some((node) => node.type === 'pseudo' && node.value.startsWith('::'))) return false;
  let lastCombinator = -1;
  provided.forEach((node, index) => {
    if (node.type === 'combinator') lastCombinator = index;
  });
  const prefix = provided.slice(0, lastCombinator + 1).map((node) => node.toString().trim());
  if (!prefix.every((node, index) => node === consumed[index]?.toString().trim())) return false;
  const remaining = consumed.slice(prefix.length);
  const nextCombinator = remaining.findIndex((node) => node.type === 'combinator');
  const subject = nextCombinator < 0 ? remaining : remaining.slice(0, nextCombinator);
  if (
    !provided
      .slice(prefix.length)
      .every((node) => subject.some((item) => item.toString() === node.toString()))
  )
    return false;
  return (
    nextCombinator < 0 ||
    ['', '>'].includes(remaining[nextCombinator]?.value?.trim() ?? 'unsupported')
  );
};

export interface TokenReferenceAudit extends TokenReferenceLocation {
  readonly category: 'public' | 'local' | 'runtime' | 'fallback' | 'unresolved';
}

export const auditTokenReferences = (
  sources: readonly CssSource[],
  runtime: readonly TokenReferenceLocation[] = [],
): { findings: TokenReferenceFinding[]; references: TokenReferenceAudit[] } => {
  const entries: Entry[] = [];
  const findings: TokenReferenceFinding[] = [];
  const audit: TokenReferenceAudit[] = [];
  for (const { file, css } of sources) {
    postcss.parse(css, { from: file }).walkDecls((declaration) => {
      const rule = declaration.parent;
      if (rule?.type !== 'rule') {
        if (declaration.value.includes('var('))
          findings.push({
            file,
            selector: rule?.type === 'atrule' ? `@${rule.name} ${rule.params}` : '<root>',
            property: declaration.prop,
            reference: declaration.value,
            kind: 'unsupported',
          });
        return;
      }
      const selectors = selectorParser()
        .astSync(rule.selector)
        .nodes.map((node) => node.toString().trim());
      for (const selector of selectors) {
        try {
          if (
            conditionsFor(rule).includes('unsupported ancestry') &&
            (declaration.prop.startsWith('--') || references(declaration.value).length > 0)
          )
            throw new Error('未対応の rule ancestry');
          entries.push({
            file,
            selector,
            conditions: conditionsFor(rule),
            declaration,
            references: references(declaration.value),
          });
        } catch {
          findings.push({
            file,
            selector,
            property: declaration.prop,
            reference: declaration.value,
            kind: 'unsupported',
          });
        }
      }
    });
  }
  const definitions = entries.filter((entry) => entry.declaration.prop.startsWith('--'));
  const publicNames = new Set(
    definitions
      .filter(
        (entry) =>
          entry.file === 'tokens.css' &&
          entry.selector === ':root' &&
          entry.conditions.length === 0,
      )
      .map((entry) => entry.declaration.prop),
  );
  const providers = (entry: Entry, name: string): Entry[] =>
    definitions.filter(
      (definition) =>
        definition.declaration.prop === name &&
        ((publicNames.has(name) &&
          definition.file === 'tokens.css' &&
          /^:root(?:\[data-theme=['"](?:light|dark|system)['"]\])?$/u.test(definition.selector)) ||
          (definition.file === entry.file &&
            inheritsFrom(entry.selector, definition.selector) &&
            definition.conditions.every((condition) => entry.conditions.includes(condition)))),
    );
  const location = (entry: Entry, reference: string): TokenReferenceLocation => ({
    file: entry.file,
    selector: entry.selector,
    property: entry.declaration.prop,
    reference,
  });
  const matchesRuntime = (entry: Entry, name: string): boolean =>
    runtime.some(
      (item) =>
        item.file === entry.file &&
        item.selector === entry.selector &&
        item.property === entry.declaration.prop &&
        item.reference === name,
    );
  const check = (entry: Entry, refs: readonly Reference[]): void => {
    for (const ref of refs) {
      const candidates = providers(entry, ref.name);
      const category =
        candidates.length > 0
          ? publicNames.has(ref.name)
            ? 'public'
            : 'local'
          : matchesRuntime(entry, ref.name)
            ? 'runtime'
            : ref.fallback !== undefined
              ? 'fallback'
              : 'unresolved';
      audit.push({ ...location(entry, ref.name), category });
      if (category === 'unresolved') {
        findings.push({
          ...location(entry, ref.name),
          kind: definitions.some((item) => item.declaration.prop === ref.name)
            ? 'unproven-scope'
            : 'undefined',
        });
      }
      // 使用されない fallback も検査し、上位 token の存在で typo を隠さない。
      if (ref.fallback !== undefined) check(entry, ref.fallback);
    }
  };
  const allReferences = (refs: readonly Reference[]): Reference[] =>
    refs.flatMap((ref) => [ref, ...allReferences(ref.fallback ?? [])]);
  const cycleFrom = (origin: Entry, entry: Entry, path: readonly Entry[]): boolean =>
    allReferences(entry.references).some((ref) =>
      providers(entry, ref.name).some(
        (candidate) =>
          candidate === origin ||
          (!path.includes(candidate) && cycleFrom(origin, candidate, [...path, candidate])),
      ),
    );
  for (const entry of entries) {
    check(entry, entry.references);
    if (entry.declaration.prop.startsWith('--') && cycleFrom(entry, entry, [entry])) {
      findings.push({ ...location(entry, entry.declaration.prop), kind: 'cycle' });
    }
  }
  return { findings, references: audit };
};

export const inspectTokenReferences = (
  sources: readonly CssSource[],
  runtime: readonly TokenReferenceLocation[] = [],
): TokenReferenceFinding[] => auditTokenReferences(sources, runtime).findings;

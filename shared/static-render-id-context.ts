export type StaticRenderIdKind =
  | 'copy-status'
  | 'copy-source'
  | 'code-block'
  | 'code-group'
  | 'code-group-tab'
  | 'code-group-panel'
  | 'score-description'
  | 'task-list-label'
  | 'image-caption'
  | 'lightbox'
  | 'article-header'
  | 'breadcrumb'
  | 'footnote'
  | 'search-dialog'
  | 'search-page'
  | 'footer';

export interface StaticRenderIdContext {
  readonly namespace: string;
  nextId(kind: StaticRenderIdKind): string;
  reserveId(kind: StaticRenderIdKind, preferred?: string): string;
}

const sanitizeIdPart = (value: string): string => {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._:-]+/gu, '-')
    .replace(/^-+|-+$/gu, '');
  return normalized.length > 0 ? normalized : 'static-render';
};

const hashNamespace = (namespace: string): string => {
  let hash = 2166136261;
  for (const character of namespace) {
    hash ^= character.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
};

export const createStaticRenderIdContext = (namespace: string): StaticRenderIdContext => {
  const normalizedNamespace = sanitizeIdPart(namespace);
  const namespaceId = `${normalizedNamespace}-${hashNamespace(namespace)}`;
  const counters = new Map<StaticRenderIdKind, number>();
  const reserved = new Set<string>();

  const reserveUnique = (base: string): string => {
    const normalizedBase = sanitizeIdPart(base);
    if (!reserved.has(normalizedBase)) {
      reserved.add(normalizedBase);
      return normalizedBase;
    }

    let index = 2;
    while (reserved.has(`${normalizedBase}-${String(index)}`)) {
      index += 1;
    }
    const id = `${normalizedBase}-${String(index)}`;
    reserved.add(id);
    return id;
  };

  return {
    namespace: normalizedNamespace,
    nextId(kind) {
      const next = (counters.get(kind) ?? 0) + 1;
      counters.set(kind, next);
      return reserveUnique(`${namespaceId}-${kind}-${String(next)}`);
    },
    reserveId(kind, preferred) {
      const base = preferred?.trim() || `${namespaceId}-${kind}`;
      return reserveUnique(base);
    },
  };
};

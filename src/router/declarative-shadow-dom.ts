const SHADOWROOT_MODE_ATTRIBUTE_NAMES = ['shadowrootmode', 'shadowroot'] as const;
const SHADOWROOT_DELEGATES_FOCUS_ATTRIBUTE = 'shadowrootdelegatesfocus';

const isElement = (value: Node | null | undefined): value is Element => value instanceof Element;

const readShadowRootMode = (template: HTMLTemplateElement): ShadowRootMode | null => {
  for (const attributeName of SHADOWROOT_MODE_ATTRIBUTE_NAMES) {
    const value = template.getAttribute(attributeName)?.trim();
    if (value === 'open' || value === 'closed') {
      return value;
    }
  }

  return null;
};

const readDelegatesFocus = (template: HTMLTemplateElement): boolean => {
  const value = template.getAttribute(SHADOWROOT_DELEGATES_FOCUS_ATTRIBUTE);
  if (value === null) {
    return false;
  }

  const normalized = value.trim().toLowerCase();
  return normalized === '' || normalized === 'true';
};

const getDirectShadowRootTemplates = (host: Element): HTMLTemplateElement[] => {
  return Array.from(host.children).filter((child): child is HTMLTemplateElement => {
    if (!(child instanceof HTMLTemplateElement)) {
      return false;
    }

    return readShadowRootMode(child) !== null;
  });
};

const promoteShadowRootTemplate = (host: Element): boolean => {
  const templates = getDirectShadowRootTemplates(host);
  if (templates.length === 0) {
    return false;
  }

  if (host.shadowRoot) {
    for (const template of templates) {
      template.remove();
    }
    return true;
  }

  const [primaryTemplate, ...duplicateTemplates] = templates;
  if (!primaryTemplate) {
    return false;
  }

  const mode = readShadowRootMode(primaryTemplate);
  if (mode === null) {
    return false;
  }

  const shadowRoot = host.attachShadow({
    mode,
    delegatesFocus: readDelegatesFocus(primaryTemplate),
  });
  shadowRoot.append(primaryTemplate.content);
  primaryTemplate.remove();

  for (const duplicateTemplate of duplicateTemplates) {
    duplicateTemplate.remove();
  }

  return true;
};

const collectElementRoots = (root: ParentNode): ParentNode[] => {
  const roots: ParentNode[] = [root];
  const elements = 'querySelectorAll' in root ? Array.from(root.querySelectorAll('*')) : [];

  for (const element of elements) {
    if (element.shadowRoot) {
      roots.push(element.shadowRoot);
    }
  }

  return roots;
};

export const promoteDeclarativeShadowRoots = (root: ParentNode): void => {
  const visitedRoots = new Set<ParentNode>();
  const queue: ParentNode[] = [root];

  while (queue.length > 0) {
    const currentRoot = queue.shift();
    if (!currentRoot || visitedRoots.has(currentRoot)) {
      continue;
    }

    visitedRoots.add(currentRoot);

    const rootsToScan = collectElementRoots(currentRoot);
    for (const candidateRoot of rootsToScan) {
      if (candidateRoot instanceof ShadowRoot && !visitedRoots.has(candidateRoot)) {
        queue.push(candidateRoot);
      }

      const elements: Element[] = [];
      if (isElement(candidateRoot)) {
        elements.push(candidateRoot);
      }
      if ('querySelectorAll' in candidateRoot) {
        elements.push(...Array.from(candidateRoot.querySelectorAll('*')));
      }

      for (const element of elements) {
        const promoted = promoteShadowRootTemplate(element);
        if (promoted && element.shadowRoot) {
          queue.push(element.shadowRoot);
        }
      }
    }
  }
};

export const createFragmentFromHtml = (
  html: string,
  ownerDocument: Document = document,
): DocumentFragment => {
  const template = ownerDocument.createElement('template');
  template.innerHTML = html;
  const fragment = template.content;
  promoteDeclarativeShadowRoots(fragment);
  return fragment;
};

export const replaceElementChildrenFromHtml = (
  element: Element,
  html: string,
  ownerDocument: Document = document,
): void => {
  const fragment = createFragmentFromHtml(html, ownerDocument);
  element.replaceChildren(fragment);
};
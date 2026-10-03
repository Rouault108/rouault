export const createFragmentFromHtml = (
  html: string,
  ownerDocument: Document = document,
): DocumentFragment => {
  const template = ownerDocument.createElement('template');
  template.innerHTML = html;
  const fragment = template.content;
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

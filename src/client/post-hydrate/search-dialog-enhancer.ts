export const enhanceSearchDialog = (
  root: ParentNode = document,
  signal?: AbortSignal,
): void => {
  const options = signal ? { signal } : undefined;
  for (const trigger of root.querySelectorAll<HTMLElement>('[data-search-dialog-trigger]')) {
    trigger.addEventListener(
      'click',
      () => {
        trigger.dispatchEvent(
          new CustomEvent('open-search-dialog', {
            bubbles: true,
            composed: true,
            detail: { trigger },
          }),
        );
      },
      options,
    );
  }
};

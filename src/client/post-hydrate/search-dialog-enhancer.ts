interface SearchDialogTriggerSession {
  readonly signal: AbortSignal | undefined;
}

const triggerSessions = new WeakMap<HTMLElement, SearchDialogTriggerSession>();

export const enhanceSearchDialog = (root: ParentNode = document, signal?: AbortSignal): void => {
  if (signal?.aborted === true) {
    return;
  }
  const options = signal ? { signal } : undefined;
  for (const trigger of root.querySelectorAll<HTMLElement>('[data-search-dialog-trigger]')) {
    const existing = triggerSessions.get(trigger);
    if (existing && existing.signal?.aborted !== true) {
      continue;
    }
    if (existing?.signal?.aborted === true) {
      triggerSessions.delete(trigger);
    }
    trigger.addEventListener(
      'click',
      () => {
        document.dispatchEvent(
          new CustomEvent('search-dialog:open-request', {
            detail: { trigger, modality: undefined },
            bubbles: false,
            composed: false,
            cancelable: false,
          }),
        );
      },
      options,
    );
    triggerSessions.set(trigger, { signal });
    signal?.addEventListener(
      'abort',
      () => {
        triggerSessions.delete(trigger);
      },
      { once: true },
    );
  }
};

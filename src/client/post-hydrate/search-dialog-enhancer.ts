export const enhanceSearchDialog = (root: ParentNode = document): void => {
  const dialog = root.querySelector<HTMLDialogElement>('[data-search-dialog-root]');
  if (!dialog) {
    return;
  }

  const openDialog = (trigger?: HTMLElement): void => {
    if (typeof dialog.showModal === 'function') {
      if (!dialog.open) {
        dialog.showModal();
      }
    } else {
      dialog.setAttribute('open', '');
    }
    for (const item of document.querySelectorAll<HTMLElement>('[data-search-dialog-trigger]')) {
      item.setAttribute('aria-expanded', 'true');
    }
    dialog.querySelector<HTMLInputElement>('[data-search-dialog-input]')?.focus();
    trigger?.setAttribute('aria-expanded', 'true');
  };

  const closeDialog = (): void => {
    if (typeof dialog.close === 'function') {
      dialog.close();
    } else {
      dialog.removeAttribute('open');
    }
    for (const item of document.querySelectorAll<HTMLElement>('[data-search-dialog-trigger]')) {
      item.setAttribute('aria-expanded', 'false');
    }
  };

  const controller = new AbortController();
  const { signal } = controller;

  document.addEventListener(
    'open-search-dialog',
    (event) => {
      const customEvent = event as CustomEvent<{ trigger?: HTMLElement | null }>;
      openDialog(customEvent.detail.trigger ?? undefined);
    },
    { signal },
  );
  document.addEventListener(
    'click',
    (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) {
        return;
      }
      const trigger = target.closest<HTMLElement>('[data-search-dialog-trigger]');
      if (trigger) {
        openDialog(trigger);
      }
    },
    { signal },
  );
  dialog.addEventListener(
    'click',
    (event) => {
      const target = event.target;
      if (target instanceof HTMLElement && target.closest('[data-search-dialog-close]')) {
        closeDialog();
      }
    },
    { signal },
  );
};

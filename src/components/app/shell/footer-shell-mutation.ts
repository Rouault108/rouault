const FOOTER_COPYRIGHT_SELECTOR = '[data-layout-footer] .ui-footer__copyright';

export interface PreparedFooterCopyrightMutation {
  commit(): void;
  rollback(): void;
}

const requireCopyrightElement = (): HTMLElement => {
  const element = document.querySelector<HTMLElement>(FOOTER_COPYRIGHT_SELECTOR);
  if (!(element instanceof HTMLElement)) {
    throw new Error(`current ${FOOTER_COPYRIGHT_SELECTOR} is required.`);
  }
  return element;
};

const requireCopyrightText = (value: string): string => {
  const normalized = value.trim();
  if (normalized.length === 0) {
    throw new Error('shell.footerCopyrightText must be non-empty.');
  }
  return normalized;
};

export const readLayoutFooterCopyrightText = (): string =>
  requireCopyrightText(requireCopyrightElement().textContent);

export const prepareFooterCopyrightMutation = (
  nextCopyrightText: string | undefined,
): PreparedFooterCopyrightMutation => {
  if (nextCopyrightText === undefined) {
    return {
      commit() {
        return undefined;
      },
      rollback() {
        return undefined;
      },
    };
  }
  const element = requireCopyrightElement();
  const previousCopyrightText = readLayoutFooterCopyrightText();
  const normalizedNextCopyrightText = requireCopyrightText(nextCopyrightText);
  return {
    commit() {
      element.textContent = normalizedNextCopyrightText;
    },
    rollback() {
      requireCopyrightElement().textContent = previousCopyrightText;
    },
  };
};

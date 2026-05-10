import { waitForStyleRecalc } from './wait-for-lit.js';

export const withDocumentTheme = async <T>(
  theme: 'light' | 'dark',
  run: () => Promise<T>,
): Promise<T> => {
  const root = document.documentElement;
  const previousTheme = root.getAttribute('data-theme');
  const previousColorScheme = root.style.colorScheme;

  root.setAttribute('data-theme', theme);
  root.style.colorScheme = theme;
  await waitForStyleRecalc();

  try {
    return await run();
  } finally {
    if (previousTheme === null) root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', previousTheme);
    root.style.colorScheme = previousColorScheme;
    await waitForStyleRecalc();
  }
};

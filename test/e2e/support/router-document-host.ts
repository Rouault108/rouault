import type { Page } from '@playwright/test';

export const waitForRouterDocumentHostReady = async (page: Page): Promise<void> => {
  await page.waitForFunction(() => {
    const router = document.querySelector('router-document-host');
    return (
      router instanceof HTMLElement &&
      typeof (router as { navigate?: unknown }).navigate === 'function' &&
      typeof (router as { whenReady?: unknown }).whenReady === 'function'
    );
  });
};

export const navigateWithRouterDocumentHost = async (page: Page, url: string): Promise<void> => {
  await waitForRouterDocumentHostReady(page);
  await page.evaluate(async (targetUrl) => {
    const router = document.querySelector('router-document-host') as
      | (HTMLElement & {
          navigate: (nextUrl: string) => Promise<unknown>;
          whenReady: () => Promise<void>;
        })
      | null;
    if (router === null) throw new Error('router-document-host is missing.');
    await router.whenReady();
    await router.navigate(targetUrl);
  }, url);
};

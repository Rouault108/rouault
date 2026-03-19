export interface NavigationOptions {
  assign?: (url: string) => void;
}

export async function navigateToUrl(url: string, options: NavigationOptions = {}): Promise<void> {
  const routerElement = document.querySelector<
    HTMLElement & { navigate?: (path: string) => Promise<void> }
  >('app-router');

  if (typeof routerElement?.navigate === 'function') {
    await routerElement.navigate(url);
    return;
  }

  const assign =
    options.assign ??
    ((target: string) => {
      window.location.assign(target);
    });
  assign(url);
}

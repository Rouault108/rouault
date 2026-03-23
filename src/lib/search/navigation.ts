export interface NavigationOptions {
  assign?: (url: string) => void;
  resolveRouter?: () => (HTMLElement & { navigate?: (path: string) => Promise<unknown> }) | null;
}

export async function navigateToUrl(url: string, options: NavigationOptions = {}): Promise<void> {
  const routerElement =
    options.resolveRouter?.() ??
    document.querySelector<HTMLElement & { navigate?: (path: string) => Promise<unknown> }>(
      'app-router',
    );

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

/**
 * Simple router implementation using View Transitions API
 */

export class Router {
    constructor(private outlet: HTMLElement) {
        this.init();
    }

    private init() {
        window.addEventListener('popstate', (e) => this.handleNavigation(window.location.pathname));
        document.addEventListener('click', (e) => this.handleAnchorClick(e));

        // Initial load
        this.handleNavigation(window.location.pathname);
    }

    private handleAnchorClick(e: MouseEvent) {
        const anchor = (e.target as HTMLElement).closest('a');
        if (!anchor) return;

        // Ignore external links or special targets
        if (anchor.target || anchor.hasAttribute('download') || anchor.getAttribute('rel') === 'external') return;

        const href = anchor.getAttribute('href');
        if (!href || href.startsWith('http') || href.startsWith('#')) return;

        e.preventDefault();
        window.history.pushState({}, '', href);
        this.handleNavigation(href);
    }

    private async handleNavigation(url: string) {
        // Fallback for browsers without View Transition support
        if (!document.startViewTransition) {
            await this.updateContent(url);
            return;
        }

        const transition = document.startViewTransition(async () => {
            await this.updateContent(url);
        });

        try {
            await transition.finished;
        } catch (e) {
            console.error('Transition failed', e);
        }
    }

    private async updateContent(url: string) {
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            const text = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(text, 'text/html');

            const newContent = doc.querySelector('main')?.innerHTML;
            if (!newContent) throw new Error('No main content found in response');

            // Update title
            document.title = doc.title;

            // Update main content
            if (this.outlet) {
                this.outlet.innerHTML = newContent;
            }

            // Re-initialize scripts or components if needed here

        } catch (err) {
            console.error('Navigation failed:', err);
            if (this.outlet) {
                this.outlet.innerHTML = '<h1>404 - Not Found</h1><p>Failed to load content.</p>';
            }
        }
    }
}

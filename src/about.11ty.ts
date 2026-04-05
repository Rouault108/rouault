import { serializeHtmlAttributes } from './layouts/html-output.js';

export class AboutPageTemplate {
  data() {
    return {
      layout: 'base',
      title: 'About',
      permalink: '/about/index.html',
    };
  }

  render() {
    return `<about-page${serializeHtmlAttributes([
      { name: 'data-hydration-scope', value: 'about-page' },
      { name: 'data-hydration-capability', value: 'interactive' },
      { name: 'data-hydration-trigger', value: 'initial' },
    ])}></about-page>`;
  }
}

export default AboutPageTemplate;

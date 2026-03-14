export class AboutPageTemplate {
  data() {
    return {
      layout: 'base',
      title: 'About',
      permalink: '/about/index.html',
    };
  }

  render() {
    return '<about-page></about-page>';
  }
}

export default AboutPageTemplate;

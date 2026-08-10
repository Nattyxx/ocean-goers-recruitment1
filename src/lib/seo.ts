import { useEffect } from 'react';

export const SITE_URL = 'https://oceangoers.org';
export const SITE_NAME = 'Ocean Goers';
export const SITE_TAGLINE = 'Cruise Ship Recruitment';

interface SEOConfig {
  title: string;
  description: string;
  path: string;
  type?: 'website' | 'article';
  noindex?: boolean;
  keywords?: string;
  jsonLd?: object;
  breadcrumbs?: { name: string; path: string }[];
}

const PUBLIC_PAGES: Record<string, SEOConfig> = {
  home: {
    title: 'Cruise Ship Jobs Worldwide | Apply for Cruise Jobs | Ocean Goers',
    description:
      'Apply for cruise ship jobs worldwide with Ocean Goers — the leading cruise recruitment agency connecting maritime professionals with top cruise lines in Dubai, Ethiopia, and across Africa. Start your cruise career today.',
    path: '',
    keywords:
      'cruise ship jobs, cruise ship jobs worldwide, cruise jobs, apply for cruise ship jobs, cruise recruitment agency, cruise ship recruitment',
  },
  about: {
    title: 'About Ocean Goers | Cruise Ship Recruitment Agency Since 2013',
    description:
      'Ocean Goers is a premier international cruise ship recruitment agency, connecting qualified maritime professionals with the world\u2019s leading cruise lines since 2013. Learn about our mission, values, and 18,500+ successful placements.',
    path: '/about',
    keywords:
      'cruise ship recruitment agency, cruise recruitment, Ocean Goers, maritime recruitment, cruise line jobs',
    breadcrumbs: [{ name: 'Home', path: '' }, { name: 'About', path: '/about' }],
  },
  services: {
    title: 'Cruise Recruitment Services | Cruise Ship Job Placement | Ocean Goers',
    description:
      'Complete cruise recruitment solutions: job placement, document processing, visa assistance, medical screening, STCW training, and deployment support. Apply for cruise ship jobs with Ocean Goers.',
    path: '/services',
    keywords:
      'cruise recruitment services, cruise ship job placement, cruise recruitment agency, apply for cruise ship jobs, STCW training, cruise ship visas',
    breadcrumbs: [{ name: 'Home', path: '' }, { name: 'Services', path: '/services' }],
  },
  blog: {
    title: 'Cruise Ship Career Resources & Guides | Ocean Goers Blog',
    description:
      'Expert tips, guides, and resources on cruise ship jobs, how to apply, required documents, visas, and training. Learn how to land cruise jobs and start your cruise career with Ocean Goers.',
    path: '/blog',
    keywords:
      'cruise ship jobs, cruise jobs, cruise ship career, how to apply for cruise ship jobs, cruise ship training, cruise recruitment agency',
    breadcrumbs: [{ name: 'Home', path: '' }, { name: 'Career Resources', path: '/blog' }],
  },
  contact: {
    title: 'Contact Ocean Goers | Cruise Ship Job Enquiries & Applications',
    description:
      'Contact Ocean Goers cruise recruitment agency in Dubai for cruise ship job applications, document processing, visa assistance, and career support. Call, email, or WhatsApp us to apply for cruise ship jobs.',
    path: '/contact',
    keywords:
      'contact cruise recruitment agency, cruise ship jobs, apply for cruise ship jobs, Ocean Goers contact, cruise jobs Dubai',
    breadcrumbs: [{ name: 'Home', path: '' }, { name: 'Contact', path: '/contact' }],
  },
  tracking: {
    title: 'Track Your Cruise Ship Job Application | Ocean Goers',
    description:
      'Check the status of your cruise ship job application with Ocean Goers. Track your cruise recruitment progress from submission to deployment in real time.',
    path: '/track',
    keywords:
      'track cruise ship job application, cruise recruitment status, Ocean Goers application tracking',
    breadcrumbs: [{ name: 'Home', path: '' }, { name: 'Track Application', path: '/track' }],
  },
  privacy: {
    title: 'Privacy Policy | Ocean Goers Cruise Ship Recruitment',
    description:
      'Read the Ocean Goers privacy policy to understand how we collect, use, and safeguard your personal information during the cruise ship recruitment process.',
    path: '/privacy',
    keywords: 'Ocean Goers privacy policy, cruise recruitment privacy, data protection',
  },
  terms: {
    title: 'Terms & Conditions | Ocean Goers Cruise Ship Recruitment',
    description:
      'Review the terms and conditions for using Ocean Goers cruise ship recruitment services, including eligibility, registration fees, and placement policies.',
    path: '/terms',
    keywords: 'Ocean Goers terms, cruise recruitment terms, cruise ship job terms and conditions',
  },
};

const PRIVATE_PAGES = new Set([
  'dashboard', 'documents', 'notifications', 'payment', 'interview',
  'messages', 'support', 'settings', 'resources', 'admin', 'blog-admin',
  'notification-center', 'reset-password',
]);

function setMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function setCanonical(url: string) {
  let el = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', 'canonical');
    document.head.appendChild(el);
  }
  el.setAttribute('href', url);
}

function setRobots(noindex: boolean) {
  let el = document.querySelector('meta[name="robots"]') as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute('name', 'robots');
    document.head.appendChild(el);
  }
  el.setAttribute('content', noindex ? 'noindex, nofollow' : 'index, follow');
}

function setJsonLd(id: string, data: object | null) {
  let script = document.getElementById(id) as HTMLScriptElement | null;
  if (!data) {
    if (script) script.remove();
    return;
  }
  if (!script) {
    script = document.createElement('script');
    script.id = id;
    script.setAttribute('type', 'application/ld+json');
    document.head.appendChild(script);
  }
  script.textContent = JSON.stringify(data);
}

const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'EmploymentAgency',
  name: 'Ocean Goers',
  alternateName: 'Ocean Goers Recruitment',
  url: 'https://oceangoers.org',
  logo: 'https://oceangoers.org/og-image.png',
  image: 'https://oceangoers.org/og-image.png',
  description:
    'Premier international cruise ship recruitment agency connecting qualified maritime professionals with the world\u2019s leading cruise lines. Apply for cruise ship jobs worldwide.',
  email: 'info@oceangoers.com',
  telephone: '+971588576150',
  foundingDate: '2013',
  address: {
    '@type': 'PostalAddress',
    streetAddress: 'Office 1208, Marina Plaza Tower, Dubai Marina',
    addressLocality: 'Dubai',
    addressRegion: 'Dubai',
    addressCountry: 'AE',
  },
  areaServed: [
    { '@type': 'Place', name: 'Dubai' },
    { '@type': 'Place', name: 'Ethiopia' },
    { '@type': 'Place', name: 'Africa' },
    { '@type': 'Place', name: 'Worldwide' },
  ],
  knowsAbout: [
    'cruise ship jobs',
    'cruise ship recruitment',
    'cruise recruitment agency',
    'maritime employment',
    'STCW training',
    'cruise line careers',
  ],
  sameAs: [
    'https://www.facebook.com/oceangoers',
    'https://www.instagram.com/oceangoers',
    'https://www.linkedin.com/company/oceangoers',
  ],
};

const websiteJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'Ocean Goers',
  url: 'https://oceangoers.org',
  description:
    'Apply for cruise ship jobs worldwide with Ocean Goers, the leading cruise recruitment agency in Dubai and Africa.',
  publisher: { '@type': 'Organization', name: 'Ocean Goers', url: 'https://oceangoers.org' },
  potentialAction: {
    '@type': 'SearchAction',
    target: 'https://oceangoers.org/blog?q={search_term_string}',
    'query-input': 'required name=search_term_string',
  },
};

function buildBreadcrumbJsonLd(crumbs: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      item: `${SITE_URL}${c.path}`,
    })),
  };
}

export function useSEO(page: string) {
  useEffect(() => {
    const isPrivate = PrivatePages(page);
    const config = PUBLIC_PAGES[page];

    if (isPrivate) {
      setRobots(true);
      setCanonical(`${SITE_URL}/${page}`);
      setJsonLd('page-jsonld', null);
      return;
    }

    if (!config) {
      setRobots(true);
      setCanonical(SITE_URL);
      return;
    }

    const fullUrl = `${SITE_URL}${config.path}`;
    const title = config.title;
    const desc = config.description;

    document.title = title;
    setMeta('name', 'description', desc);
    if (config.keywords) setMeta('name', 'keywords', config.keywords);
    setRobots(false);
    setCanonical(fullUrl);

    setMeta('property', 'og:title', title);
    setMeta('property', 'og:description', desc);
    setMeta('property', 'og:type', config.type ?? 'website');
    setMeta('property', 'og:url', fullUrl);
    setMeta('property', 'og:site_name', SITE_NAME);
    setMeta('property', 'og:image', `${SITE_URL}/og-image.png`);
    setMeta('property', 'og:image:alt', `${SITE_NAME} — ${SITE_TAGLINE}`);
    setMeta('property', 'og:locale', 'en_US');

    setMeta('name', 'twitter:card', 'summary_large_image');
    setMeta('name', 'twitter:title', title);
    setMeta('name', 'twitter:description', desc);
    setMeta('name', 'twitter:image', `${SITE_URL}/og-image.png`);
    setMeta('name', 'twitter:image:alt', `${SITE_NAME} — ${SITE_TAGLINE}`);

    const jsonLdObjects: object[] = [organizationJsonLd, websiteJsonLd];
    if (config.breadcrumbs) jsonLdObjects.push(buildBreadcrumbJsonLd(config.breadcrumbs));
    if (config.jsonLd) jsonLdObjects.push(config.jsonLd);

    setJsonLd('page-jsonld', { '@graph': jsonLdObjects });
  }, [page]);
}

function PrivatePages(page: string): boolean {
  return PRIVATE_PAGES.has(page);
}

export function getFAQJsonLd(faqs: { q: string; a: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };
}

export function buildJobPostingJsonLd(opts: {
  title: string;
  description: string;
  department?: string;
  employmentType?: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title: opts.title,
    description: opts.description,
    hiringOrganization: {
      '@type': 'Organization',
      name: 'Ocean Goers',
      sameAs: 'https://oceangoers.org',
    },
    jobLocation: {
      '@type': 'Place',
      address: {
        '@type': 'PostalAddress',
        addressLocality: 'Dubai',
        addressCountry: 'AE',
      },
    },
    employmentType: opts.employmentType ?? 'FULL_TIME',
    industry: 'Maritime / Cruise Lines',
    occupationalCategory: opts.department ?? 'Maritime',
    datePosted: new Date().toISOString().split('T')[0],
    validThrough: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  };
}

// GEO / SEO 辅助：站点地址、页面标题、结构化数据（schema.org JSON-LD）。
// 身份文案全部取自 content.js 的 id.* 键（后台「页面内容 → 身份（GEO）」可改），这里不另写一套。
const { raw, lines } = require('./content');

const SITE_URL = (process.env.SITE_URL || 'https://geopro.cc').replace(/\/+$/, '');
const PERSON_ID = `${SITE_URL}/about#person`;

// 页面标题：「页面名 · Alan · 制造业AI应用专家」
const brand = () => `${raw('id.name')} · ${raw('id.title')}`;
const pageTitle = name => (name ? `${name} · ${brand()}` : brand());

function person() {
  const p = {
    '@type': 'Person',
    '@id': PERSON_ID,
    name: raw('id.name'),
    jobTitle: raw('id.title'),
    description: raw('id.oneliner'),
    url: `${SITE_URL}/about`,
    knowsAbout: lines('id.knows_about'),
  };
  const img = raw('site.portrait');
  if (/^\/(uploads|assets)\//.test(img)) p.image = SITE_URL + img;
  const sameAs = lines('id.same_as').filter(u => /^https?:\/\//.test(u));
  if (sameAs.length) p.sameAs = sameAs;
  return p;
}

function siteGraph() {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      person(),
      { '@type': 'WebSite', '@id': `${SITE_URL}/#website`, url: `${SITE_URL}/`, name: brand(), inLanguage: 'zh-CN', publisher: { '@id': PERSON_ID } },
    ],
  };
}

function articleLd(post) {
  const date = d => (d ? String(d).slice(0, 10) : undefined);
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.excerpt || undefined,
    articleSection: post.category,
    inLanguage: 'zh-CN',
    datePublished: date(post.published_at),
    dateModified: date(post.updated_at) || date(post.published_at),
    mainEntityOfPage: `${SITE_URL}/article/${encodeURIComponent(post.slug)}`,
    author: { '@id': PERSON_ID, '@type': 'Person', name: raw('id.name'), jobTitle: raw('id.title') },
    publisher: { '@id': PERSON_ID },
  };
}

// 安全嵌入 <script type="application/ld+json">：转义 < 防止提前闭合 script
const jsonLd = obj => JSON.stringify(obj).replace(/</g, '\\u003c');

module.exports = { SITE_URL, PERSON_ID, brand, pageTitle, person, siteGraph, articleLd, jsonLd };

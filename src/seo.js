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

// 公开页面清单：sitemap 与批量提交脚本共用
const PUBLIC_PAGES = ['/', '/about', '/services', '/tools', '/cases', '/industry', '/courses', '/blog', '/diagnosis', '/privacy'];
function publicUrls(db) {
  const day = s => (s ? String(s).slice(0, 10) : null);
  const posts = db.prepare("SELECT slug, published_at, updated_at FROM posts WHERE status='published' ORDER BY published_at DESC").all();
  const latest = posts.length ? day(posts[0].updated_at) || day(posts[0].published_at) : null;
  return [
    ...PUBLIC_PAGES.map(p => ({ loc: SITE_URL + p, lastmod: p === '/' || p === '/blog' ? latest : null })),
    ...posts.map(p => ({ loc: `${SITE_URL}/article/${encodeURIComponent(p.slug)}`, lastmod: day(p.updated_at) || day(p.published_at) })),
    // v2.0 案例详情页（登记库同步来的、未归档的）
    ...db.prepare("SELECT slug, synced_at FROM cases WHERE archived=0 AND slug<>''").all()
      .map(c => ({ loc: `${SITE_URL}/cases/${encodeURIComponent(c.slug)}`, lastmod: day(c.synced_at) })),
    // v2.1 行业案例库
    ...(db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='industry_cases'").get()
      ? db.prepare('SELECT slug, published_at FROM industry_cases WHERE archived=0').all()
        .map(c => ({ loc: `${SITE_URL}/industry/${encodeURIComponent(c.slug)}`, lastmod: day(c.published_at) })) : []),
  ];
}

// 站长平台验证标签（后台「SEO 收录 → 站点验证」）：每行一条，可直接粘贴平台给的 <meta> 标签，
// 也可写成「名称=验证码」。只取 name/content 两个值、校验字符集后再转义输出，不原样插入 HTML。
function verifyMetas() {
  const out = [];
  for (const line of lines('seo.verify_meta')) {
    let name, content;
    const tag = line.match(/name\s*=\s*["']([^"']+)["'][^>]*content\s*=\s*["']([^"']+)["']/i);
    if (tag) [, name, content] = tag;
    else {
      const kv = line.match(/^([\w.-]+)\s*[=:]\s*(\S+)$/);
      if (kv) [, name, content] = kv;
    }
    if (name && content && /^[\w.-]{2,64}$/.test(name) && /^[\w.\-=+/:]{1,200}$/.test(content)) out.push({ name, content });
  }
  return out;
}

// 安全嵌入 <script type="application/ld+json">：转义 < 防止提前闭合 script
const jsonLd = obj => JSON.stringify(obj).replace(/</g, '\\u003c');

module.exports = { SITE_URL, PERSON_ID, brand, pageTitle, person, siteGraph, articleLd, jsonLd, PUBLIC_PAGES, publicUrls, verifyMetas };

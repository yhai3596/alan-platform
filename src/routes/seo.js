// robots.txt 与 sitemap.xml：让搜索引擎与 AI 爬虫（Bytespider、Baiduspider、各家联网搜索）发现全部公开页面
const express = require('express');
const { db } = require('../db');
const { SITE_URL } = require('../seo');

const router = express.Router();

const PUBLIC_PAGES = ['/', '/about', '/services', '/tools', '/cases', '/courses', '/blog', '/diagnosis'];

router.get('/robots.txt', (req, res) => {
  res.type('text/plain').send([
    'User-agent: *',
    'Allow: /',
    'Disallow: /admin',
    'Disallow: /api/',
    'Disallow: /login',
    'Disallow: /docs/',
    '',
    `Sitemap: ${SITE_URL}/sitemap.xml`,
    '',
  ].join('\n'));
});

router.get('/sitemap.xml', (req, res) => {
  const esc = s => String(s).replace(/[<>&'"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]));
  const day = s => (s ? String(s).slice(0, 10) : null);
  const posts = db.prepare("SELECT slug, published_at, updated_at FROM posts WHERE status='published' ORDER BY published_at DESC").all();
  const latest = posts.length ? day(posts[0].updated_at) || day(posts[0].published_at) : null;
  const urls = [
    ...PUBLIC_PAGES.map(p => ({ loc: SITE_URL + p, lastmod: p === '/' || p === '/blog' ? latest : null })),
    ...posts.map(p => ({ loc: `${SITE_URL}/article/${encodeURIComponent(p.slug)}`, lastmod: day(p.updated_at) || day(p.published_at) })),
  ];
  const body = urls.map(u => `  <url><loc>${esc(u.loc)}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}</url>`).join('\n');
  res.type('application/xml').send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`);
});

module.exports = router;

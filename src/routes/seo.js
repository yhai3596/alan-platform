// robots.txt 与 sitemap.xml：让搜索引擎与 AI 爬虫（Bytespider、Baiduspider、各家联网搜索）发现全部公开页面
const express = require('express');
const { db } = require('../db');
const { SITE_URL, publicUrls } = require('../seo');
const { indexnowKey } = require('../indexing');

const router = express.Router();


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
  const urls = publicUrls(db);
  const body = urls.map(u => `  <url><loc>${esc(u.loc)}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}</url>`).join('\n');
  res.type('application/xml').send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`);
});

// IndexNow 密钥文件：搜索引擎用它确认通知来自站点所有者
router.get('/:key.txt', (req, res, next) => {
  const key = indexnowKey();
  if (!key || req.params.key !== key) return next();
  res.type('text/plain').send(key);
});

module.exports = router;

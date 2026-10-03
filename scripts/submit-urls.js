// 一次性把全站公开 URL 提交给已配置的收录通道（IndexNow / 百度）。
// 用法（服务器上，项目根目录）：node scripts/submit-urls.js [--dry-run]
// 首次接入站长平台后跑一次即可；之后文章发布会自动通知。
require('../src/load-env');
const { db } = require('../src/db');
const { publicUrls } = require('../src/seo');
const indexing = require('../src/indexing');

(async () => {
  const urls = publicUrls(db).map(u => u.loc);
  const chans = indexing.channels().map(c => c.name);
  console.log(`共 ${urls.length} 个 URL；已配置通道：${chans.join('、') || '无（在 .env 配 INDEXNOW_KEY / BAIDU_PUSH_TOKEN）'}`);
  if (process.argv.includes('--dry-run') || !chans.length) return console.log(urls.join('\n'));
  for (const r of await indexing.notifyUrls(urls, { actor: 'script' })) {
    console.log(`${r.ok ? '✓' : '✖'} ${r.channel} ${r.status ?? ''} ${r.body ?? r.error ?? ''}`);
  }
})();

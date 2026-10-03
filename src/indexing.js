// 收录通知：文章发布后主动告诉搜索引擎有新页面，不必等爬虫自己发现。
// - IndexNow（Bing 等支持该协议的搜索引擎共享）：需在 .env 配 INDEXNOW_KEY，密钥文件由 /<key>.txt 提供
// - 百度普通收录 API：需在 .env 配 BAIDU_PUSH_TOKEN（百度搜索资源平台 → 普通收录 → API 提交）
// 未配置的通道自动跳过；通知失败只记日志，不影响发布。
const { SITE_URL } = require('./seo');
const { logActivity } = require('./config');

const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/indexnow';
const BAIDU_ENDPOINT = 'http://data.zz.baidu.com/urls';

function indexnowKey() {
  const k = process.env.INDEXNOW_KEY || '';
  return /^[a-zA-Z0-9-]{8,128}$/.test(k) ? k : '';
}

function indexnowRequest(urls, key) {
  return {
    url: INDEXNOW_ENDPOINT,
    init: {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ host: new URL(SITE_URL).host, key, keyLocation: `${SITE_URL}/${key}.txt`, urlList: urls }),
    },
  };
}

function baiduRequest(urls, token) {
  return {
    url: `${BAIDU_ENDPOINT}?site=${encodeURIComponent(SITE_URL)}&token=${encodeURIComponent(token)}`,
    init: { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: urls.join('\n') },
  };
}

function channels() {
  const list = [];
  const key = indexnowKey();
  if (key) list.push({ name: 'IndexNow', build: urls => indexnowRequest(urls, key) });
  if (process.env.BAIDU_PUSH_TOKEN) list.push({ name: '百度', build: urls => baiduRequest(urls, process.env.BAIDU_PUSH_TOKEN) });
  return list;
}

// 通知一批 URL；返回每个通道的结果，从不抛错
async function notifyUrls(urls, { fetchFn = fetch, actor = 'system' } = {}) {
  const results = [];
  for (const ch of channels()) {
    const { url, init } = ch.build(urls);
    try {
      const res = await fetchFn(url, init);
      const body = (await res.text()).slice(0, 200);
      results.push({ channel: ch.name, ok: res.ok, status: res.status, body });
      logActivity(actor, 'index_notify', ch.name, `${res.status} · ${urls.length} 个 URL · ${body}`, res.ok);
    } catch (e) {
      results.push({ channel: ch.name, ok: false, error: e.message });
      logActivity(actor, 'index_notify', ch.name, `失败：${e.message}`, false);
    }
  }
  return results;
}

// 文章发布后要通知的页面：文章本身 + 列表页 + 首页
const postUrls = slug => [`${SITE_URL}/article/${encodeURIComponent(slug)}`, `${SITE_URL}/blog`, `${SITE_URL}/`];

// 发布路径里调用：异步执行，不阻塞响应
function notifyPostPublished(slug, actor) {
  if (!channels().length) return;
  setImmediate(() => { notifyUrls(postUrls(slug), { actor }).catch(() => {}); });
}

module.exports = { indexnowKey, indexnowRequest, baiduRequest, notifyUrls, postUrls, notifyPostPublished, channels };

// 收录通知与站点验证标签的单元测试：node scripts/test-indexing.js
const os = require('os');
const path = require('path');
const fs = require('fs');
process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'alan-idx-'));
process.env.INDEXNOW_KEY = 'abcdef0123456789';
process.env.BAIDU_PUSH_TOKEN = 'tok123';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const content = require('../src/content');
const seo = require('../src/seo');
const indexing = require('../src/indexing');

test('站点验证标签：支持粘贴 <meta> 与「名称=验证码」，拒绝可注入内容', () => {
  content.save('seo.verify_meta', [
    '<meta name="google-site-verification" content="AbC_123-xyz" />',
    'baidu-site-verification=codeva-Q1w2E3',
    'msvalidate.01: 0123ABCD',
    '<meta name="evil" content="x"><script>alert(1)</script>">',
    'bad name=ok',
  ].join('\n'));
  assert.deepEqual(seo.verifyMetas(), [
    { name: 'google-site-verification', content: 'AbC_123-xyz' },
    { name: 'baidu-site-verification', content: 'codeva-Q1w2E3' },
    { name: 'msvalidate.01', content: '0123ABCD' },
    { name: 'evil', content: 'x' },
  ]);
  content.save('seo.verify_meta', '');
});

test('IndexNow 请求：host、key、keyLocation、urlList', () => {
  const { url, init } = indexing.indexnowRequest(['https://geopro.cc/a'], 'abcdef0123456789');
  assert.equal(url, 'https://api.indexnow.org/indexnow');
  assert.deepEqual(JSON.parse(init.body), {
    host: 'geopro.cc', key: 'abcdef0123456789', keyLocation: 'https://geopro.cc/abcdef0123456789.txt', urlList: ['https://geopro.cc/a'],
  });
});

test('百度请求：site 与 token 进查询串，正文每行一个 URL', () => {
  const { url, init } = indexing.baiduRequest(['https://geopro.cc/a', 'https://geopro.cc/b'], 'tok123');
  assert.equal(url, 'http://data.zz.baidu.com/urls?site=https%3A%2F%2Fgeopro.cc&token=tok123');
  assert.equal(init.body, 'https://geopro.cc/a\nhttps://geopro.cc/b');
});

test('notifyUrls：逐通道发送，失败不抛错', async () => {
  const seen = [];
  const fetchFn = async url => {
    seen.push(url);
    if (url.includes('baidu')) throw new Error('timeout');
    return new Response('', { status: 202 });
  };
  const r = await indexing.notifyUrls(indexing.postUrls('my-post'), { fetchFn });
  assert.equal(seen.length, 2);
  assert.deepEqual(r.map(x => [x.channel, x.ok]), [['IndexNow', true], ['百度', false]]);
});

test('未配置时跳过；密钥格式不合法视为未配置', () => {
  const saved = { k: process.env.INDEXNOW_KEY, t: process.env.BAIDU_PUSH_TOKEN };
  process.env.INDEXNOW_KEY = 'bad key!';
  delete process.env.BAIDU_PUSH_TOKEN;
  assert.equal(indexing.channels().length, 0);
  process.env.INDEXNOW_KEY = saved.k;
  process.env.BAIDU_PUSH_TOKEN = saved.t;
});

test('postUrls：文章、列表页、首页', () => {
  assert.deepEqual(indexing.postUrls('a b'), ['https://geopro.cc/article/a%20b', 'https://geopro.cc/blog', 'https://geopro.cc/']);
});

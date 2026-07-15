// 管理后台：数据看板 / 内容管理 / 用户管理（仅 admin 角色）
const express = require('express');
const { db, getSetting, setSetting } = require('../db');
const analytics = require('../analytics');
const agent = require('../agent');
const mailer = require('../mailer');
const llm = require('../llm');

const router = express.Router();

function requireAdmin(req, res, next) {
  const u = req.session.user;
  if (!u) return res.redirect('/login?next=/admin');
  if (u.role !== 'admin') return res.status(403).render('404', { title: '无权访问', active: '', message: '该页面仅管理员可见。' });
  next();
}
function requireAdminApi(req, res, next) {
  const u = req.session.user;
  if (!u || u.role !== 'admin') return res.status(403).json({ error: '仅管理员可操作' });
  next();
}

router.get('/admin', requireAdmin, (req, res) => {
  const range = ['7', '30', 'all'].includes(req.query.range) ? req.query.range : '30';
  const days = range === 'all' ? 0 : Number(range);
  const dash = analytics.dashboard(days);

  const posts = db.prepare('SELECT * FROM posts ORDER BY COALESCE(published_at, updated_at) DESC').all();
  const courses = db.prepare('SELECT * FROM courses ORDER BY no').all();
  const tools = db.prepare('SELECT * FROM tools ORDER BY no').all();
  const users = analytics.usersList();
  const submissions = db.prepare('SELECT * FROM diagnosis_submissions ORDER BY created_at DESC LIMIT 20').all();
  const counts = {
    subscribers: db.prepare('SELECT COUNT(*) c FROM subscribers').get().c,
    messages: db.prepare('SELECT COUNT(*) c FROM messages').get().c,
    submissions: db.prepare('SELECT COUNT(*) c FROM diagnosis_submissions').get().c,
  };
  const messages = db.prepare('SELECT * FROM messages ORDER BY created_at DESC LIMIT 10').all();

  res.render('admin', {
    title: '管理后台 · Alan',
    active: '',
    range, dash,
    pvPoints: analytics.trendPoints(dash.trend, 'pv'),
    uvPoints: analytics.trendPoints(dash.trend, 'uv'),
    posts, courses, tools, users, submissions, messages, counts,
    agentStatus: agent.agentStatus(),
    mailerEnabled: mailer.enabled(),
    llmEnabled: llm.enabled(),
  });
});

// —— 内容管理 API ——
router.post('/admin/api/post', requireAdminApi, (req, res) => {
  const { id, title = '', category = '行业观察', excerpt = '', content_md = '', read_minutes = 5, status = 'draft' } = req.body || {};
  const t = String(title).trim();
  if (!t) return res.status(400).json({ error: '请填写标题' });
  const st = status === 'published' ? 'published' : 'draft';
  const rm = Math.max(1, Math.min(120, Number(read_minutes) || 5));

  if (id) {
    const old = db.prepare('SELECT * FROM posts WHERE id=?').get(Number(id));
    if (!old) return res.status(404).json({ error: '文章不存在' });
    const publishedAt = old.published_at || (st === 'published' ? db.prepare("SELECT date('now','+8 hours') d").get().d : null);
    db.prepare(`UPDATE posts SET title=?, category=?, excerpt=?, content_md=?, read_minutes=?, status=?, published_at=?, updated_at=datetime('now') WHERE id=?`)
      .run(t, String(category).trim() || '行业观察', String(excerpt).trim(), String(content_md), rm, st, publishedAt, old.id);
    return res.json({ ok: true, id: old.id });
  }
  const slug = `post-${Date.now().toString(36)}`;
  const publishedAt = st === 'published' ? db.prepare("SELECT date('now','+8 hours') d").get().d : null;
  const r = db.prepare(`INSERT INTO posts(slug,title,category,excerpt,content_md,read_minutes,status,published_at)
    VALUES (?,?,?,?,?,?,?,?)`)
    .run(slug, t, String(category).trim() || '行业观察', String(excerpt).trim(), String(content_md), rm, st, publishedAt);
  res.json({ ok: true, id: r.lastInsertRowid });
});

router.post('/admin/api/course', requireAdminApi, (req, res) => {
  const { id, title = '', description = '', lectures, price_yuan, status = 'live', tag = '', kicker = '' } = req.body || {};
  const t = String(title).trim();
  if (!t) return res.status(400).json({ error: '请填写课程名称' });
  const st = ['live', 'coming'].includes(status) ? status : 'live';
  const lec = lectures ? Math.max(1, Number(lectures)) : null;
  const price = price_yuan !== '' && price_yuan != null ? Math.round(Number(price_yuan) * 100) : null;
  const kick = String(kicker).trim() || (st === 'live' ? `已上线${lec ? ` · ${lec} 讲` : ''}` : '筹备中');

  if (id) {
    const old = db.prepare('SELECT id FROM courses WHERE id=?').get(Number(id));
    if (!old) return res.status(404).json({ error: '课程不存在' });
    db.prepare(`UPDATE courses SET title=?, description=?, lectures=?, price_cents=?, status=?, tag=?, kicker=?, updated_at=datetime('now') WHERE id=?`)
      .run(t, String(description).trim(), lec, price, st, String(tag).trim(), kick, old.id);
    return res.json({ ok: true, id: old.id });
  }
  const no = (db.prepare('SELECT MAX(no) m FROM courses').get().m || 0) + 1;
  const r = db.prepare('INSERT INTO courses(no,title,description,lectures,price_cents,status,tag,kicker) VALUES (?,?,?,?,?,?,?,?)')
    .run(no, t, String(description).trim(), lec, price, st, String(tag).trim(), kick);
  res.json({ ok: true, id: r.lastInsertRowid });
});

router.post('/admin/api/tool', requireAdminApi, (req, res) => {
  const { id, name = '', description = '', status = 'live', url = '' } = req.body || {};
  const t = String(name).trim();
  if (!t) return res.status(400).json({ error: '请填写工具名称' });
  const st = ['live', 'coming'].includes(status) ? status : 'live';
  const u = String(url).trim();
  if (u && !/^https?:\/\//.test(u)) return res.status(400).json({ error: '工具链接需以 http(s):// 开头' });

  if (id) {
    const old = db.prepare('SELECT id FROM tools WHERE id=?').get(Number(id));
    if (!old) return res.status(404).json({ error: '工具不存在' });
    db.prepare(`UPDATE tools SET name=?, description=?, status=?, url=?, updated_at=datetime('now') WHERE id=?`)
      .run(t, String(description).trim(), st, u, old.id);
    return res.json({ ok: true, id: old.id });
  }
  const no = (db.prepare('SELECT MAX(no) m FROM tools').get().m || 0) + 1;
  const r = db.prepare('INSERT INTO tools(no,name,description,status,url) VALUES (?,?,?,?,?)')
    .run(no, t, String(description).trim(), st, u);
  res.json({ ok: true, id: r.lastInsertRowid });
});

router.post('/admin/api/agent', requireAdminApi, (req, res) => {
  const on = (req.body || {}).autoreply ? '1' : '0';
  setSetting('agent_autoreply', on);
  res.json({ ok: true, autoreply: on === '1' });
});

module.exports = router;

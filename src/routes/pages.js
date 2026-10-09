// 前台页面渲染
const express = require('express');
const { marked } = require('marked');
const { db } = require('../db');
const { QUESTIONS } = require('../report');
const mailer = require('../mailer');
const { pageTitle, articleLd } = require('../seo');
const { raw } = require('../content');

const router = express.Router();

// v2.0 案例：related_json 解析 + 卡片一句话（取问题的第一句，去掉括号里的出处注释；"待补"不上卡片）
function caseView(c) {
  let related = [];
  try { related = JSON.parse(c.related_json || '[]'); } catch (_) { /* 坏数据按无关联处理 */ }
  const first = String(c.problem || c.description || '').split('\n')[0].replace(/^-\s*/, '')
    .replace(/[（(][^）)]*[）)]/g, '').split(/[。；;]/)[0].trim();
  return { ...c, related, hook: first.startsWith('待补') ? '' : first };
}
const liveCases = () => db.prepare('SELECT * FROM cases WHERE archived=0 ORDER BY in_use DESC, sort, id').all().map(caseView);

router.get('/', (req, res) => {
  const cases = liveCases();
  const tools = db.prepare("SELECT * FROM tools WHERE archived=0 AND status='live' AND url<>'' ORDER BY no LIMIT 5").all();
  const inUse = cases.filter(c => c.in_use).length;
  res.render('home', { title: `${pageTitle()} — 懂工厂的人，把 AI 落进业务`, active: '首页', cases, tools, inUse });
});

router.get('/about', (req, res) => {
  res.render('about', { title: pageTitle('关于'), active: '关于', description: `${raw('id.oneliner')} 联系方式与留言。` });
});

router.get('/services', (req, res) => {
  res.render('services', { title: pageTitle('企业 AI 服务'), active: '企业AI服务', description: `${raw('id.name')}（${raw('id.title')}）的企业 AI 服务：免费 AI 现状诊断、AI 落地咨询、企业内训，帮暖通与制造企业找到 AI 结合点和推进路径。` });
});

router.get('/tools', (req, res) => {
  const tools = db.prepare('SELECT * FROM tools WHERE archived=0 ORDER BY no').all();
  res.render('tools', { title: pageTitle('工具集'), active: '工具集', tools, description: `${raw('id.name')}（${raw('id.title')}）为暖通行业打造的在线 AI 工具：${tools.map(t => t.name).join('、')}。` });
});

router.get('/blog', (req, res) => {
  const cat = (req.query.cat || '').slice(0, 20);
  const cats = db.prepare("SELECT DISTINCT category FROM posts WHERE status='published'").all().map(r => r.category);
  const posts = cat
    ? db.prepare("SELECT * FROM posts WHERE status='published' AND category=? ORDER BY published_at DESC").all(cat)
    : db.prepare("SELECT * FROM posts WHERE status='published' ORDER BY published_at DESC").all();
  res.render('blog', { title: pageTitle('AI 资讯'), active: 'AI资讯', posts, cats, cat, description: `${raw('id.name')}（${raw('id.title')}）的行业观察与工作笔记：暖通与制造企业 AI 落地的方法、工具与案例。` });
});

router.get('/article/:slug', (req, res) => {
  const post = db.prepare("SELECT * FROM posts WHERE slug=? AND status='published'").get(req.params.slug);
  if (!post) return res.status(404).render('404', { title: '页面不存在', active: '', noindex: true });
  db.prepare('UPDATE posts SET views = views + 1 WHERE id=?').run(post.id);
  post.views += 1;

  const all = db.prepare('SELECT * FROM comments WHERE post_id=? ORDER BY created_at, id').all(post.id);
  const comments = all.filter(c => !c.parent_id).map(c => ({ ...c, replies: all.filter(r => r.parent_id === c.id) }));

  res.render('article', {
    title: pageTitle(post.title),
    description: post.excerpt || undefined,
    articleLd: articleLd(post),
    active: 'AI资讯',
    post,
    contentHtml: marked.parse(post.content_md || ''),
    comments,
    commentCount: all.filter(c => !c.parent_id).length,
  });
});

router.get('/cases', (req, res) => {
  const cases = db.prepare('SELECT * FROM cases WHERE archived=0 ORDER BY sort').all();
  res.render('cases', { title: pageTitle('案例与培训'), active: '案例·培训', cases, description: `${raw('id.name')}（${raw('id.title')}）的企业 AI 落地项目与培训记录。` });
});

router.get('/courses', (req, res) => {
  const courses = db.prepare('SELECT * FROM courses WHERE archived=0 ORDER BY no').all();
  res.render('courses', { title: pageTitle('AI 课程'), active: 'AI课程', courses, description: `${raw('id.name')}（${raw('id.title')}）面向暖通与制造业从业者的 AI 实战课程。` });
});

router.get('/diagnosis', (req, res) => {
  res.render('diagnosis', { title: pageTitle('企业 AI 诊断'), active: '企业AI服务', questions: QUESTIONS, mailerOn: mailer.enabled(), description: '约 10 分钟问卷，生成企业 AI 诊断报告：AI 成熟度、业务中的 AI 结合点、分阶段推进路径。' });
});

router.get('/login', (req, res) => {
  if (res.locals.user) return res.redirect(req.query.next || '/');
  res.render('login', { title: pageTitle('登录'), active: '', next: req.query.next || '/', noindex: true });
});

// Agent API 文档（管理员，渲染 docs/AGENT_API.md）
router.get('/docs/agent-api', (req, res) => {
  if (!req.session.user || req.session.user.role !== 'admin') return res.redirect('/login?next=/docs/agent-api');
  const fs = require('fs');
  const path = require('path');
  let html = '<p>文档缺失。</p>';
  try { html = marked.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'docs', 'AGENT_API.md'), 'utf8')); } catch (e) { /* noop */ }
  res.render('doc', { title: 'Agent API 文档 · Alan', active: '', contentHtml: html, noindex: true });
});

module.exports = router;

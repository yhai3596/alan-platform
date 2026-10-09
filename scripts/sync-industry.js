// 幂等同步：把 WorkBuddy 企业应用案例雷达里的公开行业案例写进 industry_cases（行业案例库）。
// 用法（服务器上每日定时跑，也可手动）：
//   node scripts/sync-industry.js                       # 默认读两个雷达实例的 cases.json
//   RADAR_FILES=a.json,b.json node scripts/sync-industry.js
//   加 --dry-run 只打印将要做的事，不写库
//
// 公开规则（Alan 2026-10-09 定）：真实使用案例（USE_CASE）+ 证据 E1 及以上 + 没被忽略/归档（REJECTED/ARCHIVED）
//   + 没打「未验证想法」标记。只公开事实、来源、流程拆解和复制评估；AI 推断与内部建议不公开。
// 幂等键：规范化后的原文链接（两个实例重复的案例只留一条，信息更全的优先）。
// 不再符合规则的案例只归档，不删除。写库前自动备份。输出 BEFORE / ACTIONS / AFTER 计数作为证据。
// 零副作用：不 require('../src/db')，路径口径与 src/db.js:8 一致。
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const Database = require('better-sqlite3');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'app.db');
const FILES = (process.env.RADAR_FILES || '/opt/wbc-radar/data/cases.json,/opt/case-radar/data/cases.json').split(',').filter(Boolean);
const DRY = process.argv.includes('--dry-run');
const die = (code, msg) => { console.error(`[拒绝] ${msg}`); process.exit(code); };

if (!fs.existsSync(DB_PATH)) die(2, `找不到数据库：${DB_PATH}`);
const db = new Database(DB_PATH);
const hasTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='industry_cases'").get();
if (!hasTable) die(5, 'industry_cases 表不存在——先启动一次新版应用完成迁移');
if (db.prepare('SELECT COUNT(*) c FROM settings').get().c < 1) die(6, 'settings 表为空——大概率打开了错误/未初始化的库');

const EVIDENCE_OK = new Set(['E1', 'E2', 'E3']);
const SKIP_STATUS = new Set(['REJECTED', 'ARCHIVED']);
const RISKY = /(?<!\d)1[3-9]\d{9}(?!\d)|[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}|ecoer|宜所/i; // 手机号、邮箱、雇主品牌
const norm = u => String(u || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/[?#].*$/, '').replace(/\/+$/, '');
const richness = c => JSON.stringify(c).length;
// wb 实例的 facts / inference 是多行文本，wbc 是数组：统一成数组
const toList = v => Array.isArray(v) ? v : String(v || '').split(/\n+/).map(x => x.replace(/^\s*(?:[-*•]|\d+[.、)])\s*/, '').trim()).filter(Boolean);

// 读入并合并
const seen = new Map();
let total = 0, skipped = { type: 0, evidence: 0, status: 0, flag: 0, risky: 0 };
for (const f of FILES) {
  if (!fs.existsSync(f)) { console.log(`（跳过：找不到 ${f}）`); continue; }
  const raw = JSON.parse(fs.readFileSync(f, 'utf8'));
  const items = Array.isArray(raw) ? raw : (raw.cases || []);
  const inst = path.basename(path.dirname(path.dirname(f)));
  for (const c of items) {
    total++;
    if (c.content_type !== 'USE_CASE') { skipped.type++; continue; }
    if (!EVIDENCE_OK.has(c.evidence_level)) { skipped.evidence++; continue; }
    if (SKIP_STATUS.has(c.status)) { skipped.status++; continue; }
    if ((c.flags || []).includes('UNVERIFIED_IDEA')) { skipped.flag++; continue; }
    const pub = [c.title, c.summary, c.enterprise_problem, ...toList(c.facts)].join('\n');
    if (RISKY.test(pub)) { skipped.risky++; continue; }
    const key = norm(c.canonical_url || c.url);
    if (!key) continue;
    const prev = seen.get(key);
    if (!prev || richness(c) > richness(prev.c)) seen.set(key, { c, inst });
  }
}

const slugOf = (c, inst) => `${inst.replace(/[^a-z0-9]+/gi, '').slice(0, 6)}-${String(c.case_id || '').toLowerCase().replace(/[^a-z0-9]+/g, '-')}`.replace(/-+$/, '');
const rows = [...seen.entries()].map(([key, { c, inst }]) => {
  const tx = c.taxonomy || {};
  const rep = c.replication || {};
  const repl = c.replicability || {};
  return {
    ext_id: key, slug: slugOf(c, inst), title: String(c.title || '').slice(0, 200), url: c.url || '',
    published_at: String(c.published_at || '').slice(0, 10), summary: c.summary || '', problem: c.enterprise_problem || '',
    industry: tx.industry || '', func: tx.function || '', pattern: tx.workflow_pattern || '', pattern_label: tx.pattern_label || '',
    evidence_level: c.evidence_level || '', evidence_notes: c.evidence_notes || '',
    rep_level: repl.level || '', rep_label: repl.level_label || '', is_workbuddy: c.is_workbuddy_case ? 1 : 0,
    facts_json: JSON.stringify(toList(c.facts)), tools_json: JSON.stringify(toList(c.original_tools)),
    sources_json: JSON.stringify((c.sources || []).filter(s => s && s.url).map(s => ({ name: s.name || '', url: s.url, tier: s.tier || '' }))),
    decomposition_json: JSON.stringify(c.decomposition || {}),
    // 复制评估只取对外有意义的部分；内部用的分值、团队备注不带
    replication_json: JSON.stringify({ route: rep.route || '', difficulty: rep.difficulty || '', gaps: rep.gaps || [],
      skills_needed: rep.skills_needed || [], connectors_needed: rep.connectors_needed || [], manual_steps: rep.manual_steps || [],
      risks: rep.risks || [], maturity_statement: rep.maturity_statement || '' }),
  };
});

const count = () => db.prepare('SELECT COUNT(*) c, SUM(archived=0) live FROM industry_cases').get();
console.log(`DB = ${DB_PATH}\n雷达 = ${FILES.join(' , ')}`);
console.log(`读入 ${total} 条 → 符合公开规则 ${rows.length} 条（去重后）；未收：类型 ${skipped.type} · 证据 ${skipped.evidence} · 已忽略/归档 ${skipped.status} · 未验证想法 ${skipped.flag} · 含敏感信息 ${skipped.risky}`);
console.log('=== BEFORE ===', count());
if (DRY) { console.log('=== DRY-RUN：不写库 ==='); process.exit(0); }

console.log('=== 先备份 ===');
execFileSync(process.execPath, [path.join(__dirname, 'backup-db.js')], { stdio: 'inherit', env: process.env });

const cols = Object.keys(rows[0] || { ext_id: '' });
const upsert = db.prepare(`INSERT INTO industry_cases (${cols.join(',')}, archived, synced_at) VALUES (${cols.map(c => '@' + c).join(',')}, 0, datetime('now'))
  ON CONFLICT(ext_id) DO UPDATE SET ${cols.filter(c => c !== 'ext_id' && c !== 'slug').map(c => `${c}=excluded.${c}`).join(', ')}, archived=0, synced_at=datetime('now')`);
const act = { added: 0, updated: 0, archived: 0 };
db.transaction(() => {
  const existing = new Set(db.prepare('SELECT ext_id FROM industry_cases').all().map(r => r.ext_id));
  const keep = new Set();
  for (const r of rows) { upsert.run(r); keep.add(r.ext_id); existing.has(r.ext_id) ? act.updated++ : act.added++; }
  const arch = db.prepare("UPDATE industry_cases SET archived=1, synced_at=datetime('now') WHERE ext_id=? AND archived=0");
  for (const id of existing) if (!keep.has(id)) act.archived += arch.run(id).changes;
})();
console.log('=== ACTIONS ===', act);
console.log('=== AFTER ===', count());

// 幂等同步：把 DemoWall 资产登记库导出的案例（enterprise-cases.json）写进 cases 表。
// 用法（务必先备份，脚本会自动先跑一次 backup-db.js）：
//   node scripts/sync-registry.js <enterprise-cases.json>                 # 正式：只接受过了闸门的导出
//   node scripts/sync-registry.js <preview/enterprise-cases.json> --allow-preview   # 仅本机开发
//   加 --dry-run 只打印将要做的事，不写库
//
// 规则：
//   - 以 source（登记库案例 id）为幂等键：已有则原地更新，没有则新增；重复运行不会产生重复行。
//   - 导出里不再出现的、由登记库同步来的案例（source 非空）→ 归档（archived=1），不物理删除。
//   - 后台手工建的案例（source 为空）一律不碰。
//   - 打印 BEFORE / ACTIONS / AFTER 作为证据（05 册铁律 L5）。
// 零副作用：不 require('../src/db')（会触发建表/迁移/种子），路径口径与 src/db.js:8 一致。
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const Database = require('better-sqlite3');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'app.db');
const args = process.argv.slice(2);
const file = args.find(a => !a.startsWith('--'));
const DRY = args.includes('--dry-run');

const die = (code, msg) => { console.error(`[拒绝] ${msg}`); process.exit(code); };
if (!file || !fs.existsSync(file)) die(1, `找不到导出文件：${file || '(未指定)'}`);
if (!fs.existsSync(DB_PATH)) die(2, `找不到数据库：${DB_PATH}（数据目录非默认时用 DATA_DIR=/path）`);

const payload = JSON.parse(fs.readFileSync(file, 'utf8'));
if (!payload.meta || !Array.isArray(payload.items)) die(3, '导出文件格式不对：缺 meta 或 items');
if (payload.meta.preview && !args.includes('--allow-preview')) die(4, '这是预览导出（含未过闸门的内容），只能本机开发用；确认是本机请加 --allow-preview');

const db = new Database(DB_PATH);
const cols = db.prepare('PRAGMA table_info(cases)').all().map(c => c.name);
if (!cols.includes('source') || !cols.includes('related_json')) die(5, 'cases 表还没有 v2.0 新列——先启动一次新版应用完成迁移');
if (db.prepare('SELECT COUNT(*) c FROM settings').get().c < 1) die(6, 'settings 表为空——大概率打开了错误/未初始化的库');

const list = () => db.prepare("SELECT id, source, title, archived, in_use FROM cases ORDER BY sort, id").all();
const show = rows => rows.forEach(r => console.log(`  id=${r.id} | ${r.source || '(手工)'} | ${r.archived ? '已归档' : '展示中'} | ${r.in_use ? '在用' : '  '} | ${r.title}`));

console.log(`DB = ${DB_PATH}\n导出 = ${file}（${payload.meta.generated}${payload.meta.preview ? '，预览' : ''}，${payload.items.length} 个案例）`);
console.log('=== BEFORE ===');
show(list());

if (!DRY) {
  console.log('=== 先备份 ===');
  execFileSync(process.execPath, [path.join(__dirname, 'backup-db.js')], { stdio: 'inherit', env: process.env });
}

const FIELDS = ['slug', 'title', 'scene', 'industry', 'client_desc', 'problem', 'why_this', 'approach', 'results',
  'my_role', 'period', 'lessons', 'tools_used', 'replicable_for'];
const actions = [];
const find = db.prepare('SELECT id FROM cases WHERE source=?');
const upd = db.prepare(`UPDATE cases SET ${FIELDS.map(f => `${f}=@${f}`).join(', ')}, org=@client_desc,
  description=@problem, in_use=@in_use, related_json=@related_json, sort=@sort, archived=0, synced_at=datetime('now') WHERE id=@id`);
const ins = db.prepare(`INSERT INTO cases (source, org, description, in_use, related_json, sort, synced_at, ${FIELDS.join(', ')})
  VALUES (@source, @client_desc, @problem, @in_use, @related_json, @sort, datetime('now'), ${FIELDS.map(f => '@' + f).join(', ')})`);
const archive = db.prepare("UPDATE cases SET archived=1, synced_at=datetime('now') WHERE id=?");

const run = db.transaction(() => {
  const seen = new Set();
  for (const it of payload.items) {
    const row = { source: it.slug, in_use: it.in_use ? 1 : 0, related_json: JSON.stringify(it.related || []), sort: it.sort || 0 };
    for (const f of FIELDS) row[f] = String(it[f] ?? '');
    seen.add(it.slug);
    const hit = find.get(it.slug);
    if (hit) { upd.run({ ...row, id: hit.id }); actions.push(`更新 ${it.slug}`); }
    else { ins.run(row); actions.push(`新增 ${it.slug}`); }
  }
  for (const r of db.prepare("SELECT id, source FROM cases WHERE source<>'' AND archived=0").all()) {
    if (!seen.has(r.source)) { archive.run(r.id); actions.push(`归档 ${r.source}（导出里已没有）`); }
  }
});

if (DRY) {
  console.log('=== DRY-RUN：不写库 ===');
  payload.items.forEach(it => console.log(`  ${find.get(it.slug) ? '将更新' : '将新增'} ${it.slug}`));
} else {
  run();
  console.log('=== ACTIONS ===');
  actions.forEach(a => console.log('  ' + a));
  console.log('=== AFTER ===');
  show(list());
}

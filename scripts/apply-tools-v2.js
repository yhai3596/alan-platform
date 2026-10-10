// 一次性·幂等：v2.2 工具集（首页「在线可试」）。可重复运行，不会产生重复卡，不删除任何工具。
//   按链接域名（无链接的按名称）匹配已有工具：有则原地更新，没有则新增；排序号按下面列表重排。
// 用法（脚本会先自动备份）：
//   cd /var/www/alan && node scripts/apply-tools-v2.js [--dry-run]
// 零副作用：不 require('../src/db')；路径口径与 src/db.js:8 一致。只认已存在、已初始化、已有 v2.2 列的库。
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const Database = require('better-sqlite3');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'app.db');
const DRY = process.argv.includes('--dry-run');
if (!fs.existsSync(DB_PATH)) { console.error(`[拒绝] 找不到数据库：${DB_PATH}`); process.exit(2); }
const db = new Database(DB_PATH);
const cols = db.prepare('PRAGMA table_info(tools)').all().map(c => c.name);
if (!['thumb', 'access', 'note'].every(c => cols.includes(c))) { console.error('[拒绝] tools 表还没有 v2.2 列——先启动一次新版应用'); process.exit(5); }
if (db.prepare('SELECT COUNT(*) c FROM tools').get().c < 1) { console.error('[拒绝] tools 表为空——大概率打开了错误的库'); process.exit(3); }

// 顺序即首页顺序。access：open 公开可用 / demo 公开演示账号 / login 需登录 / contact 联系获取试用账号
const LIST = [
  { name: '变频空调控制仿真台', url: 'https://hvac.geopro.top', access: 'open', note: '暖通 · 研发', thumb: '/assets/v2/tools/hvac-sim.jpg',
    description: '打开就在跑：负荷预测、耗电、室温误差、除湿量，用来评估控制逻辑。' },
  { name: 'HVAC 工程计算工具集', url: 'https://hvac.geopro.cc', access: 'open', note: '暖通 · 工程', thumb: '/assets/v2/tools/hvactool.jpg',
    description: '热泵仿真、冷媒物性、焓湿、水力、风管、全年能耗电费等 9 个在线计算器。' },
  { name: 'CAD 图纸解析', url: 'https://cad-ai.lovable.app', access: 'open', note: '制造 · 工艺', thumb: '/assets/v2/tools/cad-ai.jpg',
    description: '上传图纸，自动算出钣金展开尺寸和物料清单，可以导出表格。' },
  { name: 'AI 声学诊断', url: 'https://ss-ai.lovable.app', access: 'open', note: '制造 · 品质', thumb: '/assets/v2/tools/ss-ai.jpg',
    description: '空调运行录音和运行数据按设备、时间对齐，做声学分析和异常判定。演示环境为模拟数据。' },
  { name: 'AHRI 竞品分析', url: 'https://ahri.geopro.cc', access: 'open', note: '暖通 · 市场', thumb: '/assets/v2/tools/ahri.jpg',
    description: '基于 AHRI 认证数据的竞品数据查询与竞品动态跟踪。' },
  { name: '企业 FDE 实施专家 · 交付物看板', url: 'https://fde.geopro.top', access: 'open', note: '企业 AI 落地 · 方法', thumb: '/assets/v2/tools/fde.jpg',
    description: '从需求发现到试点复盘：5 个工具包、26 份标准交付物的演示看板。' },
  { name: 'HVAC 技师行话速查', url: 'https://slang.geopro.top', access: 'open', note: '暖通 · 售后与培训', thumb: '/assets/v2/tools/slang.jpg',
    description: '北美一线技师的口语、俚语，对照标准术语和中文解释，附真实论坛例句，还能自测。' },
  { name: '企业内容创作工作台', url: 'https://workbench.geopro.cc', access: 'demo', note: '内容 · 营销', thumb: '/assets/v2/tools/workbench.jpg',
    description: '基于企业知识库生成多平台文案，带审核流程和广告法质检。' },
  { name: '专利 AI 辅助助手', url: 'https://aipatent.lovable.app', access: 'contact', note: '研发 · 知识产权', thumb: '',
    description: '5 步引导研发人员写出专利交底书，支持多种素材输入、自动评分和一键导出。' },
  { name: '企业财报解读', url: 'https://finstar.geopro.cc', access: 'demo', note: '经营 · 投资', thumb: '/assets/v2/tools/finstar.jpg',
    description: '上市公司经营质量评估与投资避坑训练。' },
];

const host = u => String(u || '').replace(/^https?:\/\//, '').replace(/\/.*$/, '').toLowerCase();
const all = () => db.prepare('SELECT id,no,name,url,access,archived FROM tools ORDER BY no').all();
const show = rows => rows.forEach(t => console.log(`  no=${t.no} | ${t.name} | ${t.url || '(无链接)'} | ${t.access}${t.archived ? ' | 已归档' : ''}`));
console.log(`DB = ${DB_PATH}\n=== BEFORE ===`); show(all());
if (DRY) { console.log('=== DRY-RUN：不写库 ==='); process.exit(0); }
console.log('=== 先备份 ===');
execFileSync(process.execPath, [path.join(__dirname, 'backup-db.js')], { stdio: 'inherit', env: process.env });

const actions = [];
db.transaction(() => {
  const rows = db.prepare('SELECT * FROM tools').all();
  const keep = new Set();
  LIST.forEach((t, i) => {
    const hit = rows.find(r => t.url && host(r.url) === host(t.url)) || rows.find(r => r.name === t.name);
    const v = { ...t, no: i + 1, status: 'live' };
    if (hit) {
      db.prepare(`UPDATE tools SET no=@no, name=@name, description=@description, status=@status, url=@url, thumb=@thumb, access=@access, note=@note,
        archived=0, updated_at=datetime('now') WHERE id=@id`).run({ ...v, id: hit.id });
      keep.add(hit.id); actions.push(`更新 ${t.name}`);
    } else {
      const r = db.prepare(`INSERT INTO tools(no,name,description,status,url,thumb,access,note) VALUES (@no,@name,@description,@status,@url,@thumb,@access,@note)`).run(v);
      keep.add(Number(r.lastInsertRowid)); actions.push(`新增 ${t.name}`);
    }
  });
  // 列表之外的工具不删不改状态，只把排序号挪到后面
  let n = LIST.length;
  for (const r of rows.filter(r => !keep.has(r.id)).sort((a, b) => a.no - b.no)) {
    db.prepare('UPDATE tools SET no=? WHERE id=?').run(++n, r.id); actions.push(`保留（排到后面）${r.name}`);
  }
})();
console.log('=== ACTIONS ==='); actions.forEach(a => console.log('  ' + a));
console.log('=== AFTER ==='); show(all());

# Alan 个人IP与AI工具平台（HVAC × AI）

Alan 的个人品牌综合平台：个人 IP、企业 AI 服务（B2B）、AI 工具集、AI 课程、案例培训展示与博客，
配套管理后台（内容管理、Agent 自动化、数据看板、用户管理）。

- 线上：https://geopro.cc
- 设计来源：`E:\AICoding\websites\个人IP与AI工具网站规划\design_handoff_alan_platform`（Classical 设计系统高保真稿，1:1 重实现）

## 技术栈

| 层 | 选型 | 说明 |
|---|---|---|
| 服务端 | Node.js 20+ / Express 4 | 服务端渲染（EJS），监听 127.0.0.1:8201，nginx 反代 |
| 数据库 | SQLite（better-sqlite3, WAL） | 单文件 `data/app.db`，零运维；会话同库 |
| 前端 | 原生 JS + Classical 设计系统 CSS | 无构建步骤；字体自托管（Cormorant Garamond / Lora / Noto Serif SC，国内可达） |
| AI | 内置模板与 FAQ；可选 GLM 增强 | 配 `Z_AI_API_KEY` 后诊断报告/助手/评论自动回复升级为 LLM 生成，失败自动回退 |
| 邮件 | 可选 SMTP（nodemailer） | 配好后诊断报告自动送达；未配置则入库待查 |

## 功能

- **前台 11 页**：首页 / 关于 / 企业AI服务 / 工具集 / AI课程 / 案例·培训 / AI资讯（博客+文章详情）/ 企业AI诊断 / 登录注册 / 404
- **企业 AI 诊断**：5 题问卷 → 企业信息 → Hermes Agent 生成报告（成熟度 L1–L5、按痛点定制的 AI 结合点清单、三阶段路径），入库 + 可选邮件
- **评论 + Agent 自动回复**：登录后评论；常见问题由「小龙虾」即时回复并标注，其余转人工；后台可开关
- **智能客户助手**：全站悬浮组件，快捷问题 + 自由问答（FAQ/LLM），内含主题切换
- **主题**：鎏金纸本 / 黛青石墨 / 赭墨陶土 / 极简银白·Apple 风，localStorage 全站同步
- **埋点与看板**：PV/UV/趋势/来源（会话首触归因）/工具排行/注册漏斗/文章完读率
- **管理后台**（仅 admin）：数据看板、内容管理（文章/课程/工具 CRUD + Agent 开关）、用户管理、诊断提交与留言查看

## 本地开发

```bash
npm install          # postinstall 自动复制自托管字体到 public/vendor
npm run dev          # SEED_DEMO=1 启动（注入演示数据），http://127.0.0.1:8201
npm start            # 生产模式启动（无演示数据）
npm run smoke        # 冒烟测试（需服务运行中）
```

管理员：首次启动自动生成，见 `data/admin-credentials.txt`（或用 `ADMIN_EMAIL`/`ADMIN_PASSWORD` 环境变量指定）。

## 部署（新加坡服务器，与 hvac.geopro.cc 同机同模式）

首次部署：腾讯云控制台网页终端（root）执行

```bash
curl -fsSL https://raw.githubusercontent.com/yhai3596/alan-platform/main/deploy/deploy-alan-sg.sh | bash
```

脚本自动完成：DNS A 记录（GoDaddy API）→ Node 安装 → 克隆 → 依赖 → .env → systemd(alan.service) → acme.sh 证书 → nginx vhost → autopull 定时器。

日常更新：本机 `git push` 后 1 分钟内服务器自动拉取并重启（`/var/log/alan-autopull.log`）。
**前提：本仓库保持 public**（服务器匿名 https pull）。

详细运维手册见 [docs/DEPLOY.md](docs/DEPLOY.md)。

## 目录结构

```
server.js            入口（Express 装配）
src/
  db.js              schema + 内容种子（含 SEED_DEMO 演示数据）
  report.js          诊断报告生成器（规则模板 + 可选 LLM 增强）
  agent.js           助手应答 / 评论自动回复（FAQ + 可选 LLM）
  analytics.js       埋点写入与看板聚合
  mailer.js          可选 SMTP 报告邮件
  llm.js             GLM 客户端（未配置即禁用）
  routes/            pages(前台) / api(JSON) / admin(后台)
views/               EJS 模板（partials + 12 页）
public/              ds.css(设计系统原样) site.css(页面层) js/ assets/ vendor/(字体,构建产物)
deploy/              deploy-alan-sg.sh(一键部署) autopull-alan.sh
scripts/             copy-fonts.js(postinstall) smoke.js
```

## 环境变量

见 [.env.example](.env.example)。关键项：`SESSION_SECRET`（必配）、`Z_AI_API_KEY`（可选 LLM）、`SMTP_*`（可选邮件）。

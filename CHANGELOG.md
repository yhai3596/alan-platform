# CHANGELOG

## v1.0.1 — 2026-07-15

部署目标从 alan.geopro.cc 改为**主域名 geopro.cc**（用户指示：替换该域名下的旧站——Vercel 托管的默认 Next.js 页）。

- deploy-alan-sg.sh：DNS 改写 `@`(apex) A 记录 + `www` CNAME→`@`（替换原 Vercel 指向）；证书含 www SAN；
  nginx www→apex 规范 301；幂等停用本机其他占用主域名的旧 server 块（不碰 hvac.geopro.cc）
- 应用侧：SITE_URL/SITE_HOST 默认与来源归因白名单改为 geopro.cc/www.geopro.cc
- 文档同步（README / DEPLOY.md / .claude）；hvac.geopro.cc 子域完全不受影响

## v1.0.0 — 2026-07-15

首个完整版本：按设计交付包（design_handoff_alan_platform，Classical 设计系统）1:1 重实现并补齐真实后端。

### 新增
- **前台 11 页**：Home / About / Services / Tools / Blog / Article / Cases / Courses / Diagnosis / Login / 404，共享导航与页脚，字体全部自托管（国内可达）
- **企业 AI 诊断**：5 题问卷状态机（进度 n/6、选中态、可回退）→ 企业信息 → 报告（成熟度 L1–L5 按 Q2 定级、结合点清单按 Q3 痛点域从知识库取 5+Q1+Q4 条、三阶段路径关联 Q5 目标）；提交入库，SMTP 配置后自动邮件
- **Agent 能力**（设计稿中的小龙虾/Hermes 职责）：
  - 评论自动回复：FAQ 关键词匹配即时回复并标注「AI 自动回复 · via 小龙虾」，其余转人工；后台可开关
  - 智能客户助手：全站悬浮，3 个快捷问题走设计稿标准答案，自由问答 FAQ 兜底
  - 可选 LLM 增强：配 `Z_AI_API_KEY` 后报告摘要/助手/自动回复升级为 GLM 生成（超时/失败自动回退模板，回答约束在站内知识）
- **主题系统**：4 套配色（鎏金纸本/黛青石墨/赭墨陶土/极简银白·Apple风）localStorage 全站同步，助手面板内切换，head 同步应用防闪烁
- **认证**：邮箱+密码注册登录（bcrypt、会话 SQLite 存储、限流），admin/member 角色
- **埋点与看板**：pageview/tool_click/漏斗事件/文章完读（IntersectionObserver 哨兵），管理后台真实聚合：PV/UV+环比、每日趋势 SVG 双折线、来源会话首触归因、工具排行、注册转化漏斗、文章 Top5 完读率
- **管理后台**：三页签（数据看板/内容管理/用户管理），文章/课程/工具的新建与编辑（对话框表单）、Agent 自动化状态与开关、诊断提交记录、站内留言、用户列表与搜索
- **部署包**：deploy-alan-sg.sh（DNS→Node→克隆→env→systemd→acme 证书→nginx→autopull 一键完成，幂等）、autopull-alan.sh（每分钟拉取，deps 变更自动 npm ci）
- **测试**：scripts/smoke.js 冒烟（9 页 + 4 API + 权限跳转 + 404）

### 技术决策
- Express + EJS 服务端渲染而非 SPA：设计稿为纯 HTML，1:1 移植保真度最高；SQLite 替代 PostgreSQL：单机零运维（见 .claude/DECISIONS.md D1/D2）
- 字体不走 Google Fonts（国内不可达），fontsource 按 unicode-range 分片自托管，仅保留 CSS 引用的 400/600 分片（6.1MB）
- 生产不注入演示数据；本地 `SEED_DEMO=1` 提供全套演示内容

### 已知边界（v1 有意为之）
- 课程支付、微信登录、密码找回：界面就位、后端预留（点击有明确提示），待接入支付/OAuth 后开通
- 文章草稿生成（小龙虾 CLI）：后台显示「预留接口」
- AHRI/北美竞品/专利三个工具：登录后显示"接入中"，待工具服务就绪后在后台填入 URL 即可上线（HVAC Tool 已链接 hvac.geopro.cc）

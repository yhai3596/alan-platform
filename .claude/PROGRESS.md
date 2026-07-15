# 进度

**整体进度：开发 100%（v1.0.0）· 部署 90%（待用户在服务器控制台执行一条引导命令）**

## 已完成
- [x] 设计交付包 12 个 .dc.html 全量解读（README/设计系统/交互规格）
- [x] 项目骨架 + 字体自托管（fontsource 按需分片，6.1MB）
- [x] 后端：SQLite schema+种子、认证（bcrypt+会话+限流）、诊断报告生成器（规则模板+可选GLM）、
      评论自动回复引擎、悬浮助手 API、埋点聚合、可选 SMTP
- [x] 前台 11 页 1:1 重实现 + 主题系统（4 套配色 localStorage 同步）+ 诊断问卷状态机
- [x] 管理后台三页签（真实数据看板/内容 CRUD/用户管理 + 诊断提交 + 留言）
- [x] 本地端到端验证：9 页面 200、API 冒烟全过、浏览器走查（问卷全流程/评论自动回复/主题/后台）
- [x] 部署包：deploy-alan-sg.sh（DNS+Node+证书+nginx+systemd+autopull 幂等一键）+ DEPLOY.md 运维手册
- [x] GitHub 仓库创建并推送（当前 private；部署前需设为 public，见 DEPLOY.md 步骤 0）

## 待办
- [ ] **用户动作 ①**：仓库设为 public（`gh repo edit yhai3596/alan-platform --visibility public --accept-visibility-change-consequences`）
- [ ] **用户动作 ②**：腾讯云控制台网页终端执行部署命令（见 docs/DEPLOY.md 第一节）——将自动把 geopro.cc 从旧 Vercel 站切到新平台；完成后按验收清单过一遍
- [ ] （可选清理）Vercel 后台解绑/删除旧 geopro.cc 项目（域名切走后旧站已断流，不清理也无影响）
- [ ] （可选）服务器 .env 填 Z_AI_API_KEY → LLM 生成报告/助手/自动回复
- [ ] （可选）服务器 .env 填 SMTP → 诊断报告邮件送达
- [ ] 替换 About 页联系方式占位（微信/LinkedIn/公众号）与课程封面/培训照片
- [ ] 后续：AHRI/北美竞品/专利三个工具就绪后在后台填 URL 上线；课程支付与微信登录接入

## 下一步建议
部署验收通过后：把 About 联系方式换成真实信息（views/about.ejs），并发第一篇真实文章替换占位正文。

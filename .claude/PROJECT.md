# 项目：Alan 个人IP与AI工具平台（alan-platform）

## 基本信息
- **类型**: website（全栈多页站点 + 管理后台）
- **路径**: `E:\AICoding\websites\alan-platform`
- **线上**: https://alan.geopro.cc （腾讯云新加坡 43.156.58.154，与 hvac.geopro.cc 同机）
- **仓库**: https://github.com/yhai3596/alan-platform （public，autopull 部署要求）
- **创建**: 2026-07-15

## 目标
将设计交付包 `E:\AICoding\websites\个人IP与AI工具网站规划\design_handoff_alan_platform`
（Classical 设计系统，12 个高保真 .dc.html）重实现为可上线的生产站点：
个人 IP + 企业 AI 服务（免费诊断引流）+ 工具集 + 课程 + 案例 + 博客 + 管理后台。
目标用户：暖通/制造业企业主与从业者。

## 技术栈
Node 20+/Express 4 + EJS 服务端渲染 + SQLite(better-sqlite3) + 原生 JS；
字体自托管；可选 GLM（Z_AI_API_KEY）与 SMTP 增强；nginx 反代 + systemd + GitHub autopull。

## 关键约定
- 设计系统 CSS（public/css/ds.css）为原样拷贝，**不改 token**；页面层样式进 site.css
- 生产不注入演示数据；本地验证用 `SEED_DEMO=1`
- 服务器 SSH 被拦，运维一律走腾讯云控制台网页终端；日常更新靠 git push + autopull
- 仓库保持 public；密钥只进服务器 .env，不进仓库

## 设置
- auto_update: true

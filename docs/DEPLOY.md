# 部署与运维手册（alan.geopro.cc）

目标机：腾讯云新加坡 `43.156.58.154`（OpenCloudOS 9.6，与 hvac.geopro.cc 同机）。
**该机对外 SSH 被网络路径拦截（详见 hvac 运维记录），一切服务器操作走腾讯云控制台网页终端。**

## 一、首次部署（一条命令）

控制台网页终端（root）执行：

```bash
curl -fsSL https://raw.githubusercontent.com/yhai3596/alan-platform/main/deploy/deploy-alan-sg.sh | bash
```

脚本步骤（幂等，可重复执行）：
1. **DNS**：读取服务器上 acme.sh 已存的 GoDaddy 凭据，PUT A 记录 `alan.geopro.cc -> 服务器IP`（TTL 600）
2. **Node**：dnf module nodejs:22（回退 :20）
3. **代码**：clone/pull 到 `/var/www/alan`
4. **依赖**：`npm ci`（postinstall 自动生成 `public/vendor` 字体）
5. **.env**：生成随机 `SESSION_SECRET`（已存在则不动）
6. **systemd**：`alan.service`（127.0.0.1:8201，Restart=always），启动并健康检查
7. **证书**：acme.sh DNS-01（dns_gd）签发 + 安装到 `/etc/ssl/alan/`，自动续期由 acme.sh cron 负责；失败则先出 HTTP 站，重跑脚本重试
8. **nginx**：`/etc/nginx/conf.d/alan.conf`（80→301→443，反代 8201，转发 X-Forwarded-Proto）
9. **autopull**：`alan-autopull.timer` 每分钟 `git pull`，代码变更自动重启（deps 变更先 `npm ci`）

结束时打印**管理员初始密码**（`/var/www/alan/data/admin-credentials.txt`）——请立即登录 `/admin` 验证并妥善保存。

## 二、日常更新

本机改代码 → `git push` → 服务器 1 分钟内自动生效。
- 日志：`tail -f /var/log/alan-autopull.log`（`[UPD]`/`[WARN]` 行）
- **仓库必须保持 public**（匿名 https pull；改 private 会静默失败）
- `deploy/autopull-alan.sh` 本身改动不会自动应用运行副本，需控制台重新执行：
  `install -m 0755 /var/www/alan/deploy/autopull-alan.sh /usr/local/bin/alan-autopull.sh`

## 三、可选增强（改 `/var/www/alan/.env` 后 `systemctl restart alan`）

| 能力 | 配置 | 效果 |
|---|---|---|
| LLM 生成 | `Z_AI_API_KEY=…`（Z.AI/智谱 GLM Key；国内版加 `LLM_BASE_URL=https://open.bigmodel.cn/api/paas/v4`） | 诊断报告摘要、助手问答、评论自动回复升级为 LLM 生成（站内知识约束，失败自动回退模板/FAQ） |
| 报告邮件 | `SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS` | 诊断报告自动发送到填写邮箱；诊断页文案自动切换为"发送至邮箱" |
| 管理员 | `ADMIN_EMAIL` / `ADMIN_PASSWORD` | 覆盖默认管理员（仅首次建库时生效；改密码需删库重建或直接改表） |

## 四、常用运维

```bash
systemctl status alan            # 状态
journalctl -u alan -f            # 应用日志
node /var/www/alan/scripts/smoke.js http://127.0.0.1:8201   # 冒烟回归
sqlite3 /var/www/alan/data/app.db '.tables'                 # 查库（只读谨慎）
cp /var/www/alan/data/app.db /root/backup/app-$(date +%F).db  # 备份（单文件即全量）
```

- 数据全在 `/var/www/alan/data/`（app.db + admin-credentials.txt），**不在 git 内**；重装前先备份
- 回滚：`cd /var/www/alan && git reset --hard <旧commit> && systemctl restart alan`（autopull 下次 pull 会 ff-only 失败并告警，届时再 `git pull` 恢复跟踪）
- 证书：acme.sh 自动续期（`~/.acme.sh/` cron），与 hvac 证书同机制，无需人工

## 五、验收清单（部署后逐项过）

- [ ] https://alan.geopro.cc 首页正常（鎏金纸本主题、字体为衬线）
- [ ] 诊断问卷全流程 → 报告卡出现，后台「用户管理→诊断提交记录」有记录
- [ ] 注册一个会员账号 → 文章页发评论（含"AHRI/热泵"字样）→ 收到「AI 自动回复 · via 小龙虾」
- [ ] 助手 3 个快捷问题回答正常；主题切换 4 套并刷新后保持
- [ ] /admin 用初始密码登录 → 看板有数据、内容可编辑保存
- [ ] `node scripts/smoke.js` 全绿

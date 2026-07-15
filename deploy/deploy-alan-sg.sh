#!/usr/bin/env bash
# ============================================================================
# Alan Platform 一键部署（新加坡服务器 43.156.58.154 · OpenCloudOS 9.6）
#
# 在腾讯云控制台网页终端以 root 执行（与 hvac 站相同的部署方式）：
#   curl -fsSL https://raw.githubusercontent.com/yhai3596/alan-platform/main/deploy/deploy-alan-sg.sh | bash
#
# 幂等：可重复执行。完成后站点在 https://alan.geopro.cc
# 前置：本机已具备 nginx、acme.sh（GoDaddy DNS-01 凭据在 ~/.acme.sh/account.conf）
# ============================================================================
set -uo pipefail

DOMAIN="alan.geopro.cc"
ZONE="geopro.cc"
SUB="alan"
APP_DIR="/var/www/alan"
REPO="https://github.com/yhai3596/alan-platform.git"
PORT=8201
CERT_DIR="/etc/ssl/alan"
SERVER_IP="$(curl -s --max-time 8 ifconfig.me || echo 43.156.58.154)"

log() { echo -e "\n\033[1;33m==> $*\033[0m"; }

# ---------------------------------------------------------------- 1. DNS
log "1/8 确保 DNS A 记录 ${DOMAIN} -> ${SERVER_IP}"
GD_KEY=$(grep -oP "SAVED_GD_Key='?\K[^'\"]+" ~/.acme.sh/account.conf 2>/dev/null | head -1 || true)
GD_SECRET=$(grep -oP "SAVED_GD_Secret='?\K[^'\"]+" ~/.acme.sh/account.conf 2>/dev/null | head -1 || true)
if [ -n "${GD_KEY}" ] && [ -n "${GD_SECRET}" ]; then
  HTTP=$(curl -s -o /tmp/gd.out -w '%{http_code}' -X PUT \
    "https://api.godaddy.com/v1/domains/${ZONE}/records/A/${SUB}" \
    -H "Authorization: sso-key ${GD_KEY}:${GD_SECRET}" \
    -H "Content-Type: application/json" \
    -d "[{\"data\":\"${SERVER_IP}\",\"ttl\":600}]")
  if [ "$HTTP" = "200" ]; then echo "DNS 记录已就绪"; else echo "[WARN] GoDaddy API 返回 $HTTP：$(cat /tmp/gd.out)（可在 GoDaddy 后台手动添加 A 记录 ${SUB} -> ${SERVER_IP}）"; fi
else
  echo "[WARN] 未在 ~/.acme.sh/account.conf 找到 GoDaddy 凭据，请手动添加 A 记录 ${SUB}.${ZONE} -> ${SERVER_IP}"
fi

# ---------------------------------------------------------------- 2. Node.js
log "2/8 安装 Node.js（>=20）"
if ! command -v node >/dev/null 2>&1 || [ "$(node -v | grep -oP '\d+' | head -1)" -lt 20 ]; then
  dnf -y module reset nodejs >/dev/null 2>&1 || true
  dnf -y module enable nodejs:22 >/dev/null 2>&1 || dnf -y module enable nodejs:20 >/dev/null 2>&1 || true
  dnf -y install nodejs npm || { echo "[ERROR] Node 安装失败"; exit 1; }
fi
echo "node $(node -v) / npm $(npm -v)"

# ---------------------------------------------------------------- 3. 代码
log "3/8 拉取代码到 ${APP_DIR}"
if [ -d "${APP_DIR}/.git" ]; then
  git -C "${APP_DIR}" pull --ff-only
else
  git clone --depth 1 "${REPO}" "${APP_DIR}"
fi

log "4/8 安装依赖（含字体自托管 postinstall）"
cd "${APP_DIR}"
npm ci --no-audit --no-fund || npm install --no-audit --no-fund || { echo "[ERROR] npm 依赖安装失败"; exit 1; }

# ---------------------------------------------------------------- 5. .env
log "5/8 生成 .env（已存在则保留）"
if [ ! -f "${APP_DIR}/.env" ]; then
  cat > "${APP_DIR}/.env" <<EOF
NODE_ENV=production
PORT=${PORT}
HOST=127.0.0.1
SITE_URL=https://${DOMAIN}
SITE_HOST=${DOMAIN}
SESSION_SECRET=$(openssl rand -hex 32)
ADMIN_EMAIL=admin@alan-ai.local
# 可选增强（填好后 systemctl restart alan 生效）：
# Z_AI_API_KEY=      # 智谱 GLM Key（诊断报告/助手/评论自动回复升级为 LLM 生成）
# LLM_BASE_URL=https://api.z.ai/api/paas/v4
# LLM_MODEL=glm-4.5-flash
# SMTP_HOST=         # SMTP 配好后诊断报告自动邮件送达
# SMTP_PORT=465
# SMTP_USER=
# SMTP_PASS=
EOF
  echo ".env 已生成（SESSION_SECRET 随机）"
else
  echo ".env 已存在，保留"
fi

# ---------------------------------------------------------------- 6. systemd
log "6/8 配置 systemd 服务 alan.service"
cat > /etc/systemd/system/alan.service <<EOF
[Unit]
Description=Alan Platform (HVAC x AI personal brand site)
After=network.target

[Service]
Type=simple
WorkingDirectory=${APP_DIR}
ExecStart=/usr/bin/node ${APP_DIR}/server.js
Restart=always
RestartSec=3
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
systemctl enable --now alan
sleep 2
systemctl restart alan
sleep 2
if curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:${PORT}/" | grep -q 200; then
  echo "应用已监听 127.0.0.1:${PORT}"
else
  echo "[ERROR] 应用未正常启动：journalctl -u alan -n 50"; journalctl -u alan -n 30 --no-pager; exit 1
fi

# ---------------------------------------------------------------- 7. 证书 + nginx
log "7/8 签发证书并配置 nginx"
mkdir -p "${CERT_DIR}"
HAS_CERT=0
if [ -s "${CERT_DIR}/alan.cer" ]; then
  HAS_CERT=1
  echo "证书已存在"
else
  ~/.acme.sh/acme.sh --issue --dns dns_gd -d "${DOMAIN}" --server letsencrypt && \
  ~/.acme.sh/acme.sh --install-cert -d "${DOMAIN}" \
    --fullchain-file "${CERT_DIR}/alan.cer" \
    --key-file "${CERT_DIR}/alan.key" \
    --reloadcmd "nginx -s reload" && HAS_CERT=1
  [ "$HAS_CERT" = "1" ] || echo "[WARN] 证书签发失败，先以 HTTP 提供服务；稍后重跑本脚本重试"
fi

if [ "$HAS_CERT" = "1" ]; then
  cat > /etc/nginx/conf.d/alan.conf <<EOF
server {
    listen 80;
    server_name ${DOMAIN};
    return 301 https://\$host\$request_uri;
}
server {
    listen 443 ssl;
    http2 on;
    server_name ${DOMAIN};
    ssl_certificate ${CERT_DIR}/alan.cer;
    ssl_certificate_key ${CERT_DIR}/alan.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    client_max_body_size 2m;
    location / {
        proxy_pass http://127.0.0.1:${PORT};
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF
else
  cat > /etc/nginx/conf.d/alan.conf <<EOF
server {
    listen 80;
    server_name ${DOMAIN};
    client_max_body_size 2m;
    location / {
        proxy_pass http://127.0.0.1:${PORT};
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF
fi
nginx -t && nginx -s reload && echo "nginx 已加载 ${DOMAIN} 站点"

# ---------------------------------------------------------------- 8. autopull
log "8/8 安装 autopull（每分钟自动拉取，代码变更自动重启）"
install -m 0755 "${APP_DIR}/deploy/autopull-alan.sh" /usr/local/bin/alan-autopull.sh
cat > /etc/systemd/system/alan-autopull.service <<EOF
[Unit]
Description=Alan platform auto git pull

[Service]
Type=oneshot
ExecStart=/usr/local/bin/alan-autopull.sh
EOF
cat > /etc/systemd/system/alan-autopull.timer <<EOF
[Unit]
Description=Run alan-autopull every minute

[Timer]
OnCalendar=*-*-* *:*:00
Persistent=false

[Install]
WantedBy=timers.target
EOF
systemctl daemon-reload
systemctl enable --now alan-autopull.timer

# ---------------------------------------------------------------- 完成
log "部署完成"
echo "站点：$([ "$HAS_CERT" = "1" ] && echo https || echo http)://${DOMAIN}"
echo "服务：systemctl status alan | 日志：journalctl -u alan -f"
echo "自动更新：本地 git push 后 1 分钟内生效（日志 /var/log/alan-autopull.log）"
if [ -f "${APP_DIR}/data/admin-credentials.txt" ]; then
  echo; echo "★ 管理员初始账号（请登录后妥善保存）："
  cat "${APP_DIR}/data/admin-credentials.txt"
fi

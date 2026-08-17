#!/usr/bin/env bash
# deploy-pilot 服务器探测（只读：不装任何东西、不改任何配置、不打印任何密钥）
# 用法：整段贴到目标服务器终端执行，跑完把【全部输出】贴回给 Claude
set -u
export BASHRCSOURCED=1 PROMPT_COMMAND="" 2>/dev/null || true
echo "===== DEPLOY-PILOT PROBE BEGIN ====="
echo "--- [1] 系统"
head -5 /etc/os-release 2>/dev/null
echo "arch=$(uname -m) cpu=$(nproc 2>/dev/null)核"
free -h 2>/dev/null | head -2
df -h / 2>/dev/null | tail -1
echo "--- [2] 公网出口"
echo "公网IP: $(curl -s --max-time 8 ifconfig.me || echo '(出境不通/超时)')"
echo "--- [3] 已装工具链"
for c in dnf apt yum nginx node npm python3 pip3 git certbot; do
  command -v $c >/dev/null 2>&1 && echo "$c: $($c --version 2>&1 | head -1)" || echo "$c: 无"
done
echo "--- [4] nginx 配置"
nginx -t 2>&1 || echo "(nginx 不可用)"
echo "conf.d: $(ls /etc/nginx/conf.d/ 2>/dev/null | tr '\n' ' ')"
echo "sites-enabled: $(ls /etc/nginx/sites-enabled/ 2>/dev/null | tr '\n' ' ')"
grep -rhE "^\s*(server_name|listen|proxy_pass|root)\s" /etc/nginx/conf.d/ /etc/nginx/sites-enabled/ 2>/dev/null | sed 's/^\s*//' | sort -u
echo "--- [5] 监听端口"
ss -ltnp 2>/dev/null || netstat -ltnp 2>/dev/null || echo "(ss/netstat 均无)"
echo "--- [6] 运行中的业务服务（滤掉系统服务）"
systemctl list-units --type=service --state=running --no-pager --no-legend 2>/dev/null | \
  grep -vE "systemd|dbus|sshd|chronyd|crond|rsyslog|NetworkManager|polkit|getty|auditd|irqbalance|tuned|firewalld|atd|serial" || echo "(无)"
echo "--- [7] 定时器"
systemctl list-timers --no-pager --no-legend 2>/dev/null | head -15
echo "--- [8] 站点目录"
ls -la /var/www/ 2>/dev/null || echo "/var/www 不存在"
echo "--- [9] 证书（只列路径与到期日）"
for f in /etc/ssl/*/*.cer /etc/ssl/*/*.crt /etc/letsencrypt/live/*/fullchain.pem; do
  [ -s "$f" ] && echo "$f | $(openssl x509 -in "$f" -noout -enddate -subject 2>/dev/null | tr '\n' ' ')"
done 2>/dev/null
if [ -d ~/.acme.sh ]; then
  echo "acme.sh: 已装；GoDaddy 凭据条数: $(grep -c 'SAVED_GD_Key' ~/.acme.sh/account.conf 2>/dev/null || echo 0)（仅计数，不显示内容）"
else
  echo "acme.sh: 未装"
fi
echo "--- [10] 防火墙/SELinux"
command -v firewall-cmd >/dev/null 2>&1 && echo "firewalld services: $(firewall-cmd --list-services 2>/dev/null)"
command -v ufw >/dev/null 2>&1 && ufw status 2>/dev/null | head -3
command -v getenforce >/dev/null 2>&1 && echo "SELinux: $(getenforce 2>/dev/null)" || echo "SELinux: 无"
echo "--- [11] cron"
crontab -l 2>/dev/null | grep -v '^#' | head -10 || echo "(root crontab 空)"
tail -5 /etc/crontab 2>/dev/null
echo "===== DEPLOY-PILOT PROBE END（请把全部输出贴回）====="

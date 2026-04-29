#!/usr/bin/env bash
set -euo pipefail

DOMAIN="${DOMAIN:-postishai.com}"
APP_ROOT="${APP_ROOT:-/opt/postishai}"
DEPLOY_USER="${DEPLOY_USER:-deploy}"
NODE_MAJOR="${NODE_MAJOR:-22}"

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run this script as root." >&2
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive

install_base_packages() {
  apt-get update
  apt-get install -y ca-certificates curl debian-keyring debian-archive-keyring gnupg git ufw
}

install_docker() {
  install -m 0755 -d /etc/apt/keyrings
  if [[ ! -f /etc/apt/keyrings/docker.asc ]]; then
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
    chmod a+r /etc/apt/keyrings/docker.asc
  fi

  local codename
  codename="$(
    . /etc/os-release
    echo "${VERSION_CODENAME}"
  )"

  cat >/etc/apt/sources.list.d/docker.list <<EOF
deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu ${codename} stable
EOF

  apt-get update
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  systemctl enable --now docker
}

install_caddy() {
  curl -fsSL https://dl.cloudsmith.io/public/caddy/stable/gpg.key \
    | gpg --dearmor --yes -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -fsSL https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt \
    | tee /etc/apt/sources.list.d/caddy-stable.list >/dev/null

  apt-get update
  apt-get install -y caddy
}

install_node() {
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash -
  apt-get install -y nodejs
  npm install -g tsx
}

configure_firewall() {
  ufw allow OpenSSH
  ufw allow 80/tcp
  ufw allow 443/tcp
  ufw --force enable
}

configure_deploy_user() {
  if ! id "${DEPLOY_USER}" >/dev/null 2>&1; then
    useradd --create-home --shell /bin/bash "${DEPLOY_USER}"
  fi

  usermod -aG docker "${DEPLOY_USER}"

  install -d -m 0700 -o "${DEPLOY_USER}" -g "${DEPLOY_USER}" "/home/${DEPLOY_USER}/.ssh"
  if [[ -f /root/.ssh/authorized_keys ]]; then
    install -m 0600 -o "${DEPLOY_USER}" -g "${DEPLOY_USER}" \
      /root/.ssh/authorized_keys "/home/${DEPLOY_USER}/.ssh/authorized_keys"
  elif [[ ! -f "/home/${DEPLOY_USER}/.ssh/authorized_keys" ]]; then
    touch "/home/${DEPLOY_USER}/.ssh/authorized_keys"
    chown "${DEPLOY_USER}:${DEPLOY_USER}" "/home/${DEPLOY_USER}/.ssh/authorized_keys"
    chmod 0600 "/home/${DEPLOY_USER}/.ssh/authorized_keys"
  fi
}

configure_app_directories() {
  install -d -o "${DEPLOY_USER}" -g "${DEPLOY_USER}" "${APP_ROOT}"
  install -d -o "${DEPLOY_USER}" -g "${DEPLOY_USER}" "${APP_ROOT}/logs"
  install -d "${APP_ROOT}/storage"
  chown -R 1000:1000 "${APP_ROOT}/storage"
}

configure_caddy() {
  cat >/etc/caddy/Caddyfile <<EOF
${DOMAIN} {
    reverse_proxy 127.0.0.1:3000
}
EOF

  systemctl enable --now caddy
  systemctl reload caddy
}

configure_backup_timer() {
  cat >/etc/systemd/system/postishai-backup.service <<EOF
[Unit]
Description=PostishAI PostgreSQL Backup to S3
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
User=${DEPLOY_USER}
WorkingDirectory=${APP_ROOT}
EnvironmentFile=${APP_ROOT}/.env
ExecStart=/usr/bin/npm run backup:db
TimeoutStartSec=300
EOF

  cat >/etc/systemd/system/postishai-backup.timer <<'EOF'
[Unit]
Description=Run PostishAI DB backup twice daily

[Timer]
OnCalendar=*-*-* 03:00:00
OnCalendar=*-*-* 15:00:00
Persistent=true

[Install]
WantedBy=timers.target
EOF

  systemctl daemon-reload
  systemctl enable --now postishai-backup.timer
}

install_host_dependencies_if_repo_exists() {
  if [[ -f "${APP_ROOT}/package-lock.json" ]]; then
    runuser -u "${DEPLOY_USER}" -- bash -lc "cd '${APP_ROOT}' && npm ci --omit=dev --ignore-scripts"
  fi
}

main() {
  install_base_packages
  install_docker
  install_caddy
  install_node
  configure_firewall
  configure_deploy_user
  configure_app_directories
  configure_caddy
  configure_backup_timer
  install_host_dependencies_if_repo_exists

  echo "Provisioning complete. Deploy the app into ${APP_ROOT} as ${DEPLOY_USER}."
}

main "$@"

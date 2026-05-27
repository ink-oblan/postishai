#!/usr/bin/env sh
set -eu

mode="${1:-app}"
lock_hash_file="node_modules/.postishai-package-lock.sha256"

ensure_dependencies() {
  if [ ! -d node_modules ] || [ ! -f "${lock_hash_file}" ] || ! sha256sum -c "${lock_hash_file}" >/dev/null 2>&1; then
    echo "Installing npm dependencies for current package-lock.json..."
    npm ci
    sha256sum package-lock.json > "${lock_hash_file}"
    return
  fi

  echo "npm dependencies match package-lock.json; skipping npm ci."
}

ensure_dependencies

case "${mode}" in
  app)
    npx prisma migrate deploy
    npm run app:dev:docker
    ;;
  worker)
    npx prisma generate
    npm run worker:dev
    ;;
  *)
    echo "Unknown dev start mode: ${mode}" >&2
    exit 2
    ;;
esac

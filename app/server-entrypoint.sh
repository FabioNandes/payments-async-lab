#!/bin/sh
# Entrypoint do processo `server`. O worker não passa por aqui: ele só sobe depois que o server
# respondeu no healthcheck, então nunca encontra o banco sem migrations.
set -eu

medusa db:migrate

# Idempotente: a segunda subida encontra o admin já criado e segue em frente. Qualquer outro
# erro interrompe o boot.
if ! output=$(medusa user -e "$MEDUSA_ADMIN_EMAIL" -p "$MEDUSA_ADMIN_PASSWORD" 2>&1); then
  if echo "$output" | grep -qi 'already exists'; then
    echo "Admin $MEDUSA_ADMIN_EMAIL já existe."
  else
    echo "$output" >&2
    exit 1
  fi
fi

exec medusa start

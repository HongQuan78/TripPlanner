#!/usr/bin/env bash
set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/HongQuan78/TripPlanner.git}"
BRANCH="${BRANCH:-master}"
APP_DIR="${APP_DIR:-$HOME/TripPlanner}"
DEPLOY_PUBLIC_KEY="${DEPLOY_PUBLIC_KEY:-}"
BACKUP_DIR="${BACKUP_DIR:-$HOME/backups}"
BACKUP_KEEP_DAYS="${BACKUP_KEEP_DAYS:-7}"

PUBLIC_IP=""

say() { printf '\n\033[1;36m==> %s\033[0m\n' "$*"; }
warn() { printf '\033[1;33m    ! %s\033[0m\n' "$*"; }
ok() { printf '\033[0;32m    v %s\033[0m\n' "$*"; }
die() { printf '\033[1;31mERROR: %s\033[0m\n' "$*" >&2; exit 1; }

randstr() { LC_ALL=C tr -dc 'A-Za-z0-9' </dev/urandom | head -c "$1"; }

preflight() {
  [ "$(uname -s)" = "Linux" ] || die "this script targets a Linux EC2 instance"
  command -v curl >/dev/null 2>&1 || die "curl is required"
  sudo -n true 2>/dev/null || die "passwordless sudo is required (run as the instance's default user)"

  if ! command -v git >/dev/null 2>&1; then
    say "git"
    sudo apt-get update -qq
    sudo apt-get install -y -qq git
    command -v git >/dev/null 2>&1 || die "git installation failed"
    ok "installed"
  fi
}

resolve_public_ip() {
  local token=""
  token=$(curl -fsS -m 3 -X PUT "http://169.254.169.254/latest/api/token" \
    -H "X-aws-ec2-metadata-token-ttl-seconds: 300" 2>/dev/null || true)
  if [ -n "$token" ]; then
    PUBLIC_IP=$(curl -fsS -m 3 -H "X-aws-ec2-metadata-token: $token" \
      "http://169.254.169.254/latest/meta-data/public-ipv4" 2>/dev/null || true)
  fi
  if [ -z "$PUBLIC_IP" ]; then
    PUBLIC_IP=$(curl -fsS -m 5 https://checkip.amazonaws.com 2>/dev/null | tr -d '[:space:]' || true)
  fi
}

install_docker() {
  say "Docker"
  if command -v docker >/dev/null 2>&1; then
    ok "already installed ($(docker --version))"
  else
    curl -fsSL https://get.docker.com | sudo sh
    ok "installed"
  fi

  sudo docker compose version >/dev/null 2>&1 \
    || die "the Docker Compose plugin is missing - install docker-compose-plugin"

  if id -nG "$USER" | tr ' ' '\n' | grep -qx docker; then
    ok "$USER already in the docker group"
  else
    sudo usermod -aG docker "$USER"
    warn "$USER added to the docker group - log out and back in to use docker without sudo"
  fi

  sudo systemctl enable --now docker >/dev/null 2>&1 || true
  ok "docker service enabled on boot"
}

configure_log_rotation() {
  say "Docker log rotation"
  if [ -f /etc/docker/daemon.json ]; then
    warn "/etc/docker/daemon.json exists - left untouched"
    warn "verify it caps log size or container logs will fill the disk"
    return
  fi
  sudo mkdir -p /etc/docker
  sudo tee /etc/docker/daemon.json >/dev/null <<'JSON'
{
  "log-driver": "json-file",
  "log-opts": { "max-size": "10m", "max-file": "3" }
}
JSON
  sudo systemctl restart docker
  ok "capped at 10m x 3 per container"
}

configure_swap() {
  say "Swap"
  local mem_kb swap_kb
  mem_kb=$(awk '/MemTotal/ {print $2}' /proc/meminfo)
  swap_kb=$(awk '/SwapTotal/ {print $2}' /proc/meminfo)

  if [ "$swap_kb" -gt 0 ]; then
    ok "already present ($((swap_kb / 1024)) MiB)"
    return
  fi
  if [ "$mem_kb" -ge 3900000 ]; then
    ok "$((mem_kb / 1024)) MiB RAM - not needed"
    return
  fi

  sudo fallocate -l 2G /swapfile
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile >/dev/null
  sudo swapon /swapfile
  grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab >/dev/null
  ok "2 GiB created ($((mem_kb / 1024)) MiB RAM detected)"
}

install_deploy_key() {
  [ -n "$DEPLOY_PUBLIC_KEY" ] || return 0
  say "Deploy public key"
  install -m 700 -d "$HOME/.ssh"
  touch "$HOME/.ssh/authorized_keys"
  chmod 600 "$HOME/.ssh/authorized_keys"
  if grep -qF "$DEPLOY_PUBLIC_KEY" "$HOME/.ssh/authorized_keys"; then
    ok "already authorized"
  else
    printf '%s\n' "$DEPLOY_PUBLIC_KEY" >> "$HOME/.ssh/authorized_keys"
    ok "appended to authorized_keys"
  fi
}

clone_repo() {
  say "Repository"
  if [ -d "$APP_DIR/.git" ]; then
    git -C "$APP_DIR" fetch origin --prune
    git -C "$APP_DIR" checkout "$BRANCH"
    git -C "$APP_DIR" reset --hard "origin/$BRANCH"
    ok "updated $APP_DIR to origin/$BRANCH"
  else
    git clone --branch "$BRANCH" "$REPO_URL" "$APP_DIR"
    ok "cloned into $APP_DIR"
  fi
}

write_env() {
  say "Environment file"
  local env_file="$APP_DIR/.env"

  if [ -f "$env_file" ]; then
    ok ".env exists - left untouched so existing secrets survive"
    return
  fi

  [ -f "$APP_DIR/.env.production.example" ] || die ".env.production.example missing in $APP_DIR"
  cp "$APP_DIR/.env.production.example" "$env_file"
  chmod 600 "$env_file"

  local base_url
  if [ -n "$PUBLIC_IP" ]; then
    base_url="http://$PUBLIC_IP/verify-email"
    ok "public IP detected: $PUBLIC_IP"
  else
    base_url="http://REPLACE_WITH_PUBLIC_HOST/verify-email"
    warn "public IP not detected - EmailSettings__VerificationUrlBase needs editing by hand"
  fi

  local pg_pass jwt_key
  pg_pass=$(randstr 40)
  jwt_key=$(randstr 64)

  sed -i -E \
    -e "s|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=${pg_pass}|" \
    -e "s|^JwtSettings__SecretKey=.*|JwtSettings__SecretKey=${jwt_key}|" \
    -e "s|^EmailSettings__VerificationUrlBase=.*|EmailSettings__VerificationUrlBase=${base_url}|" \
    "$env_file"

  grep -q "^POSTGRES_PASSWORD=${pg_pass}$" "$env_file" || die "failed to write POSTGRES_PASSWORD"
  grep -q "^JwtSettings__SecretKey=${jwt_key}$" "$env_file" || die "failed to write JwtSettings__SecretKey"

  ok "generated POSTGRES_PASSWORD (40 chars) and JwtSettings__SecretKey (64 chars)"
  ok "set EmailSettings__VerificationUrlBase=$base_url"
  warn "POSTGRES_PASSWORD is honored only while the pgdata volume is empty - do not edit it later"
}

install_backup_cron() {
  say "Database backup"
  local script="$HOME/backup-db.sh"
  mkdir -p "$BACKUP_DIR"

  cat > "$script" <<SCRIPT
#!/usr/bin/env bash
set -euo pipefail
cd "$APP_DIR"
PGUSER=\$(grep -E '^POSTGRES_USER=' .env | cut -d= -f2-)
PGDB=\$(grep -E '^POSTGRES_DB=' .env | cut -d= -f2-)
mkdir -p "$BACKUP_DIR"
docker compose exec -T db pg_dump -U "\$PGUSER" "\$PGDB" \\
  | gzip > "$BACKUP_DIR/db-\$(date +%F-%H%M).sql.gz"
find "$BACKUP_DIR" -name 'db-*.sql.gz' -mtime +$BACKUP_KEEP_DAYS -delete
SCRIPT
  chmod +x "$script"
  ok "wrote $script"

  if crontab -l 2>/dev/null | grep -qF "$script"; then
    ok "cron entry already present"
  else
    (crontab -l 2>/dev/null || true; echo "0 19 * * * $script >> $HOME/backup-db.log 2>&1") | crontab -
    ok "scheduled nightly 19:00 UTC, keeping $BACKUP_KEEP_DAYS days"
  fi
  warn "backups sit on this instance only - ship $BACKUP_DIR to S3 for real durability"
}

summary() {
  local env_file="$APP_DIR/.env" missing=0 key value provider
  say "Values you still have to fill in"

  provider=$(grep -E '^EmailSettings__Provider=' "$env_file" 2>/dev/null | cut -d= -f2- || true)
  local required="OpenTripMapSettings__ApiKey"
  case "${provider,,}" in
    google) required="$required GoogleSmtpSettings__Username GoogleSmtpSettings__AppPassword" ;;
    *) required="$required ResendSettings__ApiKey" ;;
  esac
  ok "email provider: ${provider:-Resend}"

  for key in $required; do
    value=$(grep -E "^${key}=" "$env_file" 2>/dev/null | cut -d= -f2- || true)
    case "$value" in
      ''|your-opentripmap-api-key|change-me*)
        printf '    [ ] %s\n' "$key"
        missing=1
        ;;
      *) ok "$key is set" ;;
    esac
  done

  [ "$missing" -eq 0 ] || printf '\n    Edit with: nano %s\n' "$env_file"

  cat <<INFO

    GitHub > Settings > Secrets and variables > Actions
      EC2_HOST     = ${PUBLIC_IP:-<public ip>}
      EC2_USER     = $USER
      EC2_APP_DIR  = $APP_DIR
      EC2_SSH_KEY  = full contents of the .pem this instance was launched with

    Then: Actions > Deploy > Run workflow

    Security group: 22 from your IP only, 80 from anywhere.
    Never expose 5432 or 6379.

INFO

  id -nG "$USER" | tr ' ' '\n' | grep -qx docker \
    || warn "log out and back in so the docker group takes effect"
}

main() {
  say "Bootstrapping $APP_DIR from $REPO_URL ($BRANCH)"
  preflight
  resolve_public_ip
  install_docker
  configure_log_rotation
  configure_swap
  install_deploy_key
  clone_repo
  write_env
  install_backup_cron
  summary
  say "Done"
}

main "$@"

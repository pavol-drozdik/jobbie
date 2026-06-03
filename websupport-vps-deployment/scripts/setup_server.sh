#!/usr/bin/env bash
set -euo pipefail

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run as root: sudo bash scripts/setup_server.sh"
  exit 1
fi

if [[ -r /etc/os-release ]]; then
  . /etc/os-release
else
  echo "Cannot read /etc/os-release"
  exit 1
fi

if [[ "${ID}" != "ubuntu" || "${VERSION_ID}" != "24.04" ]]; then
  echo "This script is intended for Ubuntu 24.04 LTS. Detected: ${PRETTY_NAME:-unknown}"
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive

apt-get update
apt-get install -y \
  age \
  ca-certificates \
  curl \
  gnupg \
  lsb-release \
  python3 \
  python3-pip \
  python3-venv \
  ufw \
  unattended-upgrades

install -m 0755 -d /etc/apt/keyrings
if [[ ! -f /etc/apt/keyrings/docker.asc ]]; then
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc
fi

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu ${VERSION_CODENAME} stable" \
  > /etc/apt/sources.list.d/docker.list

apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

systemctl enable --now docker
dpkg-reconfigure -f noninteractive unattended-upgrades

ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

install -d -m 0750 /srv/nestjs-typesense
install -d -m 0750 /srv/nestjs-typesense/data/typesense
install -d -m 0750 /srv/nestjs-typesense/data/typesense-snapshots
install -d -m 0750 /etc/nestjs-typesense

python3 -m venv /opt/nestjs-typesense-backup-venv
/opt/nestjs-typesense-backup-venv/bin/pip install --upgrade pip
/opt/nestjs-typesense-backup-venv/bin/pip install boto3 requests

echo
echo "Server bootstrap complete."
echo "Next steps:"
echo "1. Copy deployment files into /srv/nestjs-typesense."
echo "2. Create /srv/nestjs-typesense/.env and .env.backend from examples."
echo "3. Create /etc/nestjs-typesense/backup.env from backup.env.example."
echo "4. Do not disable SSH password/root login until key-based login is verified in a second terminal."

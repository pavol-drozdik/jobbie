# JOBBIE Websupport VPS Deployment

This folder is an isolated production deployment bundle for the existing `backend-ts` NestJS API. It intentionally does not self-host Supabase and does not expose Typesense publicly.

**End-to-end manual (Git branches, GitHub CI/CD, staging + prod VPS):** [`docs/staging-production-manual.md`](../docs/staging-production-manual.md).

Recommended VPS:

```text
Ubuntu 24.04 LTS
4 vCPU
8 GB RAM
50-60 GB total SSD
```

## DNS

Create a DNS record:

```text
api.example.com -> VPS_PUBLIC_IPV4
```

Add AAAA only after IPv6 is verified. Caddy will provision HTTPS automatically after DNS and ports `80/443` work.

## SSH Setup And Hardening

Create an Ed25519 key on your workstation:

```bash
ssh-keygen -t ed25519 -C "websupport-jobbie"
```

On the VPS, create a non-root sudo user and add the public key:

```bash
adduser deploy
usermod -aG sudo deploy
install -d -m 700 -o deploy -g deploy /home/deploy/.ssh
nano /home/deploy/.ssh/authorized_keys
chmod 600 /home/deploy/.ssh/authorized_keys
chown deploy:deploy /home/deploy/.ssh/authorized_keys
```

Verify login in a second terminal before hardening:

```bash
ssh deploy@YOUR_VPS_IP
sudo whoami
```

Only after that succeeds, disable password and direct root login:

```bash
sudo tee /etc/ssh/sshd_config.d/99-jobbie-hardening.conf >/dev/null <<'EOF'
PasswordAuthentication no
KbdInteractiveAuthentication no
PermitRootLogin no
PubkeyAuthentication yes
EOF
sudo sshd -t
sudo systemctl reload ssh
```

Do not close your current SSH session until a fresh key-based login works.

## Server Bootstrap

Copy this folder to the VPS:

```bash
scp -r websupport-vps-deployment deploy@YOUR_VPS_IP:/tmp/
ssh deploy@YOUR_VPS_IP
sudo mkdir -p /srv/nestjs-typesense
sudo cp -a /tmp/websupport-vps-deployment/. /srv/nestjs-typesense/
sudo chown -R root:root /srv/nestjs-typesense
cd /srv/nestjs-typesense
sudo bash scripts/setup_server.sh
```

The bootstrap installs Docker Engine from Docker's official Ubuntu repository, Docker Compose plugin, Python venv with `boto3` and `requests`, `age`, `ufw`, and unattended security upgrades. It only allows OpenSSH, `80/tcp`, and `443/tcp`.

It does not install Supabase CLI. If you enable Supabase logical dumps, install the CLI from an official Supabase source and verify `supabase --version`.

## Cloudflare R2

Create a private bucket, for example `jobbie-private-backups`.

Create a bucket-scoped R2 token with Object Read and Write for that bucket only. Do not use an account-wide token.

Add lifecycle rules:

```text
typesense/ -> expire after 35 days
supabase/  -> expire after 90 days
```

## Backup Encryption

Generate the age key pair on a trusted workstation:

```bash
age-keygen -o jobbie-backup-age-key.txt
```

Put only the public recipient (`age1...`) in `/etc/nestjs-typesense/backup.env`. Keep the private identity offline and copy it to the VPS only during restore.

## Environment Files

On the VPS:

```bash
cd /srv/nestjs-typesense
sudo cp .env.example .env
sudo cp .env.backend.example .env.backend
sudo chmod 600 .env .env.backend
sudo nano .env
sudo nano .env.backend
```

Generate the Typesense admin key:

```bash
openssl rand -hex 32
```

Use the same value in `.env`, `.env.backend`, and `/etc/nestjs-typesense/backup.env`. Never expose this key to frontend code.

Prepare backup env:

```bash
sudo cp /srv/nestjs-typesense/backup.env.example /etc/nestjs-typesense/backup.env
sudo chmod 600 /etc/nestjs-typesense/backup.env
sudo nano /etc/nestjs-typesense/backup.env
```

Supabase Storage caveat: the optional Supabase dump is a Postgres logical dump. It does not include Supabase Storage objects such as uploaded images, chat media, or generated PDFs. Back up Storage separately.

## Build And Push To GHCR

GHCR images are **multi-arch** (`linux/amd64` + `linux/arm64`). Staging (ARM VPS) and production (x86 VPS) pull the same version tag; Docker selects the matching manifest automatically.

The `backend-ghcr` GitHub Action publishes both platforms (QEMU + Buildx on amd64 runners). For a manual build from the repository root (not `backend-ts`):

```bash
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -f websupport-vps-deployment/Dockerfile \
  -t ghcr.io/GITHUB_USERNAME/jobbie-backend:VERSION \
  -t ghcr.io/GITHUB_USERNAME/jobbie-backend:latest \
  --push \
  .
```

Use a versioned tag for every rollout. `latest` may be added as a convenience tag, but do not rely on it for rollback.

For a private image, authenticate on the VPS:

```bash
echo 'GHCR_READ_TOKEN' | sudo docker login ghcr.io -u GITHUB_USERNAME --password-stdin
```

Use a token with package read permissions only.

## Branch-based deploy (staging + production)

`backend-ghcr` builds a multi-arch image and deploys by **git branch**:

| Trigger | Image tag (auto) | Deploy target |
|---------|------------------|---------------|
| Push to **`staging`** | `staging-YYYY.MM.DD-<sha7>` | Staging VPS (`deploy-staging` job) |
| Push to **`main`** | `YYYY.MM.DD-<sha7>` (+ `:latest`) | Production VPS (`deploy-production` job) |
| Push tag **`backend-v*`** | tag suffix after `backend-v` | Staging VPS |
| **Run workflow** (manual) | optional input, else date-SHA | Staging if run from `staging` / tag; production if run from `main` |

Path filter: `backend-ts/**`, `websupport-vps-deployment/**`, or this workflow file.

**Typical flow:** feature PR → merge **`staging`** → test on staging API → PR **`staging` → `main`** → production deploy (optionally gated; see below).

Redeploy an existing tag without rebuilding: workflows **deploy-staging** or **deploy-production**.

### One-time GitHub setup — staging

1. **Deploy SSH key** (Ed25519, no passphrase recommended for CI):

   ```bash
   ssh-keygen -t ed25519 -C "github-actions-staging" -f ~/.ssh/jobbie-staging-deploy -N ""
   ```

   Append `jobbie-staging-deploy.pub` to the staging VPS user’s `~/.ssh/authorized_keys` (e.g. `ubuntu`).

2. **GHCR read token** — classic PAT or fine-grained token with **`read:packages`** on this repository’s `jobbie-backend` package.

3. **Repository secrets** (Settings → Secrets and variables → Actions):

   | Secret | Example / notes |
   |--------|-----------------|
   | `STAGING_SSH_HOST` | Staging VPS public IP or hostname |
   | `STAGING_SSH_USER` | `ubuntu` |
   | `STAGING_SSH_KEY` | Private key contents (`jobbie-staging-deploy`) |
   | `STAGING_GHCR_TOKEN` | PAT with `read:packages` |
   | `STAGING_GHCR_USER` | Optional; defaults to lowercase GitHub org/user |

4. **Optional variable** `STAGING_HEALTH_URL` — defaults to `https://api.cocreate.cz/health`.

5. **Environment** `staging` — created on first deploy; optional protection rules.

6. On the staging VPS, create `.env` / `.env.backend` and run **`docker compose up -d` once** before the first auto-deploy.

### One-time GitHub setup — production

Use a **separate** deploy key and VPS (recommended). Mirror staging secrets with `PROD_` prefix:

| Secret | Notes |
|--------|--------|
| `PROD_SSH_HOST` | Production VPS |
| `PROD_SSH_USER` | e.g. `ubuntu` |
| `PROD_SSH_KEY` | Production deploy private key |
| `PROD_GHCR_TOKEN` | `read:packages` PAT (may reuse staging token) |
| `PROD_GHCR_USER` | Optional |

**Optional variable** `PROD_HEALTH_URL` — defaults to `https://api.jobbie.sk/health`.

**Environment** `production` — in GitHub → Settings → Environments → **production**, enable **Required reviewers** so `main` merges build the image but you approve before SSH deploy.

Bootstrap the production VPS the same way as staging (`setup_server.sh`, prod `.env.backend`, `docker compose up -d`).

### Create the `staging` branch

```bash
git checkout main && git pull
git checkout -b staging && git push -u origin staging
```

Point feature PRs at **`staging`** first; promote to **`main`** after QA.

### Skip deploy on a manual build

When running **backend-ghcr** manually, check **Skip VPS deploy after build**.

### Manual redeploy only

- Staging: Actions → **deploy-staging** → image tag (e.g. `staging-2026.06.12-a1b2c3d`)
- Production: Actions → **deploy-production** → image tag (e.g. `2026.06.12-a1b2c3d`)

### Docker access on the VPS

The deploy script needs non-interactive Docker. After bootstrap, either:

```bash
sudo usermod -aG docker ubuntu
# log out and back in
```

or allow passwordless `sudo` for `docker` (e.g. `/etc/sudoers.d/jobbie-docker`). The GitHub SSH step still uses `sudo` only to install the script under `/srv/nestjs-typesense/scripts/`.

## First Docker Deployment

```bash
cd /srv/nestjs-typesense
sudo docker compose pull
sudo docker compose up -d
sudo docker compose ps
```

Check health:

```bash
curl -fsS https://api.example.com/health
curl -fsS http://127.0.0.1:8108/health
sudo docker compose ps
```

Only public ports should be Caddy:

```bash
sudo ss -tulpn | grep -E ':80|:443|:8000|:8108'
```

Expected: `80` and `443` on public interfaces, `8108` bound to `127.0.0.1`, and no public `8000`.

## Manual Backup Test

```bash
sudo bash -c '
  set -a
  source /etc/nestjs-typesense/backup.env
  set +a
  /opt/nestjs-typesense-backup-venv/bin/python \
    /srv/nestjs-typesense/scripts/backup_manager.py backup-all
'
```

List backups:

```bash
sudo bash -c '
  set -a
  source /etc/nestjs-typesense/backup.env
  set +a
  /opt/nestjs-typesense-backup-venv/bin/python \
    /srv/nestjs-typesense/scripts/backup_manager.py list-backups
'
```

Verify objects appear in Cloudflare R2 under `typesense/` and, if enabled, `supabase/`.

## Nightly Timer

```bash
sudo cp /srv/nestjs-typesense/systemd/nestjs-typesense-backup.service /etc/systemd/system/
sudo cp /srv/nestjs-typesense/systemd/nestjs-typesense-backup.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now nestjs-typesense-backup.timer
systemctl list-timers --all | grep nestjs-typesense
```

Logs:

```bash
sudo journalctl -u nestjs-typesense-backup.service -n 200 --no-pager
sudo journalctl -u nestjs-typesense-backup.service --since today
```

## Routine Operations

```bash
cd /srv/nestjs-typesense
sudo docker compose logs --tail=200 backend
sudo docker compose logs --tail=200 typesense
sudo docker compose logs --tail=200 caddy
df -h /
free -h
sudo apt-get update
sudo apt-get upgrade
```

Before major upgrades, confirm a recent R2 backup exists and take a Websupport VPS snapshot.

## Deploy Backend Update

**Preferred:** push a `backend-v*` tag or run **backend-ghcr** in GitHub Actions (staging auto-deploy when secrets are set).

**Manual** (same steps as `scripts/deploy_backend.sh`):

```bash
cd /srv/nestjs-typesense
export BACKEND_VERSION=2026.06.12-1
export GHCR_IMAGE=ghcr.io/GITHUB_USERNAME/jobbie-backend
export GHCR_USER=GITHUB_USERNAME
export GHCR_TOKEN=...   # read:packages PAT for private image
sudo -E bash scripts/deploy_backend.sh
```

Or without the script:

```bash
cd /srv/nestjs-typesense
sudo docker compose pull backend
sudo docker compose up -d backend
sudo docker compose logs --tail=100 backend
curl -fsS https://api.example.com/health
```

## Rollback

Edit `/srv/nestjs-typesense/.env` and set `BACKEND_IMAGE` to the previous versioned tag, then:

```bash
cd /srv/nestjs-typesense
sudo docker compose pull backend
sudo docker compose up -d backend
sudo docker compose logs --tail=100 backend
```

## Restore Typesense On A Replacement VPS

Provision and bootstrap the new VPS, deploy the compose stack, and temporarily install the private age identity:

```bash
sudo install -m 600 /path/to/jobbie-backup-age-key.txt /root/jobbie-backup-age-key.txt
sudo nano /etc/nestjs-typesense/backup.env
```

Set:

```text
AGE_IDENTITY_FILE=/root/jobbie-backup-age-key.txt
```

Restore:

```bash
sudo bash -c '
  set -a
  source /etc/nestjs-typesense/backup.env
  set +a
  /opt/nestjs-typesense-backup-venv/bin/python \
    /srv/nestjs-typesense/scripts/backup_manager.py restore-typesense-latest --force
'
```

After search verification, remove the private key:

```bash
sudo rm /root/jobbie-backup-age-key.txt
sudo sed -i 's#^AGE_IDENTITY_FILE=.*#AGE_IDENTITY_FILE=#' /etc/nestjs-typesense/backup.env
```

## Supabase Dump Download

```bash
sudo install -d -m 700 /root/supabase-restore
sudo bash -c '
  set -a
  source /etc/nestjs-typesense/backup.env
  set +a
  /opt/nestjs-typesense-backup-venv/bin/python \
    /srv/nestjs-typesense/scripts/backup_manager.py \
    download-supabase-latest --output-dir /root/supabase-restore
'
```

Do not automatically overwrite a live Supabase production database. Follow Supabase's current restore/migration guidance.

## Typesense Full Reindex Fallback

The backend already has an application-specific reindex process. In the production container, run the built JS script:

```bash
cd /srv/nestjs-typesense
sudo docker compose exec backend node dist/scripts/backfill-typesense.js
```

Targeted variants:

```bash
sudo docker compose exec backend node dist/scripts/backfill-typesense.js --jobs-only
sudo docker compose exec backend node dist/scripts/backfill-typesense.js --profiles-only
sudo docker compose exec backend node dist/scripts/backfill-typesense.js --schools-only
```

Important limitation: the existing `backfill-typesense.ts` fetches IDs in pages but accumulates all job/profile IDs in memory before indexing. That is acceptable only while table sizes are moderate. For large production datasets, replace it with a streaming page-by-page implementation before relying on it as the primary disaster fallback.

## Security Notes

Typesense is bound to `127.0.0.1:8108` on the VPS and is reachable to containers through Docker networking. It is not public.

The backend is not published directly. Caddy is the only public ingress.

The Docker network is not marked `internal` because the backend must reach hosted Supabase and other outbound APIs. The security boundary is port publishing plus UFW, not a fully internal Docker network.

Supabase remains the source of truth. Typesense is replaceable derived state.

Review and rotate any credentials that may have appeared in committed `.env` files.

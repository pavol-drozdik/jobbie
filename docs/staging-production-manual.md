# JOBBIE staging & production manual

End-to-end guide: **Git/GitHub branching**, **CI/CD**, **staging VPS**, **production VPS**, **Supabase**, and **day-to-day releases**.

**Related docs**

| Doc | Use for |
|-----|---------|
| [deployment.md](./deployment.md) | Local dev, env var tables, PWA build |
| [websupport-vps-deployment/README-DEPLOYMENT.md](../websupport-vps-deployment/README-DEPLOYMENT.md) | VPS bootstrap, backups, Typesense restore |
| [websupport-vps-deployment/OPS-DISCORD-ALERTING.md](../websupport-vps-deployment/OPS-DISCORD-ALERTING.md) | Operator Discord alerts (Sentry, reports, Netdata) |
| [database-operations-runbook.md](./database-operations-runbook.md) | DB backups, secret rotation |
| [SECURITY.md](./SECURITY.md) | BFF cookies, CSRF, secrets |
| [payments-credits.md](./payments-credits.md) | Stripe webhooks, catalog |

---

## Table of contents

1. [Architecture](#1-architecture)
2. [Environments](#2-environments)
3. [Git branches & GitHub](#3-git-branches--github)
4. [Daily development workflow](#4-daily-development-workflow)
5. [CI/CD workflows](#5-cicd-workflows)
6. [One-time GitHub setup](#6-one-time-github-setup)
7. [VPS common bootstrap](#7-vps-common-bootstrap)
8. [Staging VPS setup](#8-staging-vps-setup)
9. [Production VPS setup](#9-production-vps-setup)
10. [Environment files on the VPS](#10-environment-files-on-the-vps)
11. [First stack start](#11-first-stack-start)
12. [Supabase migrations](#12-supabase-migrations)
13. [PWA (frontend) deploy](#13-pwa-frontend-deploy)
14. [Stripe & webhooks per environment](#14-stripe--webhooks-per-environment)
15. [Releasing: step-by-step checklist](#15-releasing-step-by-step-checklist)
16. [Manual deploy & rollback](#16-manual-deploy--rollback)
17. [Routine operations](#17-routine-operations)
18. [Troubleshooting](#18-troubleshooting)
19. [Security reminders](#19-security-reminders)

---

## 1. Architecture

```text
Developers
    │
    ▼
GitHub (staging / main branches)
    │
    ├─ backend-ci          → tests on every PR/push (no deploy)
    │
    └─ backend-ghcr        → build Docker image → GHCR
            │
            ├─ push staging  → deploy-staging job → SSH → Staging VPS
            └─ push main     → deploy-production job → SSH → Prod VPS

Each VPS (/srv/nestjs-typesense/):
    Internet :443
        → Caddy (TLS, APP_DOMAIN)
        → backend container (Nest API, GHCR image)
        → typesense container (127.0.0.1:8108 only)

Hosted (not on VPS):
    Supabase     — Postgres, Auth, Storage
    Stripe       — payments
    Cloudflare   — PWA (jobbie.sk), optional R2 backups
```

**What the VPS does not host:** Supabase, the PWA, or Redis (unless you add `REDIS_URL` pointing to a managed Redis).

**Image registry:** private GitHub Container Registry (GHCR)  
`ghcr.io/<github-owner>/jobbie-backend:<tag>`

Images are **multi-arch** (`linux/amd64` + `linux/arm64`). Staging (ARM) and production (x86) pull the **same tag**; Docker picks the correct manifest.

---

## 2. Environments

| | Local | Staging | Production |
|--|-------|---------|------------|
| **Purpose** | Development | QA, integration test | Live users |
| **Git branch** | `feature/*` | **`staging`** | **`main`** |
| **API URL** | `http://localhost:8000` | e.g. `https://api.cocreate.cz` | e.g. `https://api.jobbie.sk` |
| **PWA URL** | `http://localhost:3001` | staging preview / test host | `https://jobbie.sk` |
| **Supabase** | dev project | **staging** project | **production** project |
| **Stripe** | test mode | test mode (typical) | **live** mode |
| **Backend deploy** | `npm run start:dev` | auto on push to `staging` | auto on push to `main` (optional approval) |
| **Typesense** | local Docker or omitted | on staging VPS | on prod VPS |

Keep **secrets separate** per row. Never point staging API at production Supabase or Stripe live keys.

---

## 3. Git branches & GitHub

### Branch model (Option 2 — recommended)

| Branch | Role |
|--------|------|
| **`staging`** | Integration / dev default; deploys to staging VPS |
| **`main`** | Production; deploys to production VPS |
| **`feature/…`** | Short-lived; merge into `staging` via PR |

### Create `staging` (once)

```bash
git checkout main
git pull origin main
git checkout -b staging
git push -u origin staging
```

### Set default branch to `staging` (GitHub UI)

1. Repo → **Settings** → **General**
2. **Default branch** → switch from `main` to **`staging`**
3. Confirm

Effects:

- New PRs default to base **`staging`**
- Fresh clones check out **`staging`** by default
- **`main`** remains production; you promote via **`staging` → `main`** PR

### Branch protection (recommended)

**Settings** → **Rules** → **Rulesets** (or classic branch protection):

**`staging`**

- Require pull request before merge
- Require status check: `backend-ci` jobs (or required checks group)

**`main`**

- Require pull request before merge
- Restrict direct pushes
- Require status checks
- Optional: only allow merges from `staging` (document in team process)

### GitHub Environments

| Environment | Used by | Suggested setting |
|-------------|---------|-------------------|
| **`staging`** | `deploy-staging` job | No approval (fast iteration) |
| **`production`** | `deploy-production` job | **Required reviewers** (approve before SSH deploy) |

Create **production**: Settings → Environments → New → name `production` → enable **Required reviewers**.

---

## 4. Daily development workflow

### A. Feature work → staging

```bash
git checkout staging
git pull origin staging
git checkout -b feature/my-change

# edit, commit
git push -u origin feature/my-change
```

**GitHub:** New pull request

- **base:** `staging`
- **compare:** `feature/my-change`

Wait for **backend-ci** (and fix failures). **Merge** the PR.

After merge, if you changed `backend-ts/**` or `websupport-vps-deployment/**`:

- **backend-ghcr** runs automatically
- Image tag: `staging-YYYY.MM.DD-<sha7>`
- **deploy-staging** updates the staging VPS

Test on staging API (and staging PWA if configured).

### B. Promote staging → production

When staging is good:

**GitHub:** New pull request

- **base:** `main`
- **compare:** `staging`

Review diff, merge.

After merge (backend path changes):

- **backend-ghcr** builds `YYYY.MM.DD-<sha7>` (+ `:latest`)
- **deploy-production** runs (after approval if configured)

Then run **production** Supabase migrations (if any) and deploy **PWA** to `jobbie.sk` if frontend changed.

### C. Keep branches aligned

After a release, `staging` and `main` should match. If you hotfix **`main`** only, merge **`main` → `staging`** so they do not diverge.

### D. Local git habits

```bash
# Always branch from staging
git checkout staging && git pull

# See what's on staging but not main (before release PR)
git log main..staging --oneline
```

---

## 5. CI/CD workflows

Workflow files: `.github/workflows/`

| Workflow | Triggers | What it does |
|----------|----------|--------------|
| **backend-ci** | PR + push to any branch (path filter) | Unit tests, PWA build smoke test, npm audit, security grep. **No deploy.** |
| **pwa-bundle-budget** | PR on `app-pwa/**` | Bundle analyzer + soft chunk budget. **No deploy.** |
| **pwa-pages** | Push `staging` / `main` on `app-pwa/**`; manual | Test, `build:cloudflare`, deploy to Cloudflare Pages |
| **deploy-pwa-staging** / **deploy-pwa-production** | Manual only | Rebuild + redeploy PWA (optional `git_ref`) |
| **backend-ghcr** | Push `staging` / `main`; tag `backend-v*`; manual | Test, build multi-arch image, push GHCR, deploy to matching VPS |
| **deploy-staging** | Manual only | Redeploy an **existing** image tag to staging (no rebuild) |
| **deploy-production** | Manual only | Redeploy an **existing** image tag to production |

### backend-ghcr triggers & tags

| Trigger | Image tag | Deploy |
|---------|-----------|--------|
| Push **`staging`** | `staging-YYYY.MM.DD-<sha7>` | Staging VPS |
| Push **`main`** | `YYYY.MM.DD-<sha7>` + `:latest` | Production VPS |
| Tag **`backend-v1.2.3`** | `1.2.3` | Staging VPS |
| Manual (from `staging`) | optional input or auto | Staging |
| Manual (from `main`) | optional input or auto | Production |
| Manual + **Skip VPS deploy** | builds only | none |

Path filter (branch pushes): `backend-ts/**`, `websupport-vps-deployment/**`, `.github/workflows/backend-ghcr.yml`.

PWA-only changes do **not** trigger backend deploy (by design). Backend-only changes do **not** trigger PWA deploy.

### pwa-pages triggers

| Trigger | GitHub environment | Pages target |
|---------|-------------------|--------------|
| Push **`staging`** (`app-pwa/**`) | `staging` | `PWA_PAGES_PROJECT` + `PWA_PAGES_BRANCH` vars |
| Push **`main`** | `production` | same vars on **production** environment |
| Manual + **Skip deploy** | — | build/test only |

Path filter: `app-pwa/**`, `.github/workflows/pwa-pages.yml`, `.github/workflows/pwa-cloudflare-deploy.yml`.

Redeploy without a new merge: **deploy-pwa-staging** or **deploy-pwa-production** (optional `git_ref`).

**PWA host / project** are not hardcoded in YAML — set **Environment variables** on `staging` and `production` (see [§13](#13-pwa-frontend-deploy)).

### What deploy does on the VPS

Script: `websupport-vps-deployment/scripts/deploy_backend.sh` (shared staging + prod)

1. `docker login ghcr.io` (CI passes token)
2. Set `BACKEND_IMAGE=ghcr.io/owner/jobbie-backend:<tag>` in `.env`
3. `docker compose pull backend && docker compose up -d backend`
4. `curl` health URL

It does **not** update `docker-compose.yml` or Caddy — sync those manually when the repo changes.

---

## 6. One-time GitHub setup

### 6.1 GHCR package

Images publish to `ghcr.io/<owner>/jobbie-backend` on first successful **backend-ghcr** run.

For a **private** package, the VPS needs `read:packages` to pull.

### 6.2 Personal access token (GHCR read)

Create a classic PAT or fine-grained token with **`read:packages`** on the `jobbie-backend` package.

Use the same token value for `STAGING_GHCR_TOKEN` and `PROD_GHCR_TOKEN` if you prefer (still store as separate secrets).

### 6.3 Deploy SSH keys

Use **separate** keys per environment (recommended).

**Staging key:**

```bash
ssh-keygen -t ed25519 -C "github-actions-staging" -f ~/.ssh/jobbie-staging-deploy -N ""
```

Append `jobbie-staging-deploy.pub` to staging VPS:  
`~/.ssh/authorized_keys` for user `ubuntu` (or your deploy user).

**Production key:** repeat with a different filename and prod VPS.

### 6.4 Repository secrets

**Settings** → **Secrets and variables** → **Actions** → **Secrets**

| Secret | Staging | Production |
|--------|---------|------------|
| SSH host | `STAGING_SSH_HOST` | `PROD_SSH_HOST` |
| SSH user | `STAGING_SSH_USER` | `PROD_SSH_USER` |
| SSH private key | `STAGING_SSH_KEY` | `PROD_SSH_KEY` |
| GHCR PAT | `STAGING_GHCR_TOKEN` | `PROD_GHCR_TOKEN` |
| GHCR username (optional) | `STAGING_GHCR_USER` | `PROD_GHCR_USER` |

**Variables** (optional):

| Variable | Default |
|----------|---------|
| `STAGING_HEALTH_URL` | Optional override; default `https://{APP_DOMAIN}/health` from VPS `.env`. Single line, no trailing newline (e.g. `https://api.cocreate.cz/health`). |
| `PROD_HEALTH_URL` | `https://api.jobbie.sk/health` (single line) |

**Cloudflare (PWA deploy)** — repository **Secrets** (or per-environment if you prefer):

| Secret | Purpose |
|--------|---------|
| `CLOUDFLARE_API_TOKEN` | Pages deploy via Wrangler (`Account` → **Cloudflare Pages: Edit**) |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account ID |

**PWA deploy target** — **Environment variables** on `staging` and `production` (names are fixed in the workflow):

| Variable | Purpose |
|----------|---------|
| `PWA_PAGES_PROJECT` | Cloudflare Pages project name (default `jobbie-pwa` if unset) |
| `PWA_PAGES_BRANCH` | Optional Wrangler `--branch=…` (empty = production deployment on that project) |
| `NUXT_PUBLIC_SITE_URL` | Public PWA origin for canonical/OG (no trailing slash) |

Custom domains (`jobbie.sk`, `staging.jobbie.sk`) are attached in the **Cloudflare Pages** dashboard to the matching project — not in GitHub.

**PWA build variables** — same environments; names match `app-pwa/.env.example` (`NUXT_PUBLIC_*`). Minimum per environment:

| Variable | Staging example | Production example |
|----------|-----------------|-------------------|
| `NUXT_PUBLIC_API_BASE_URL` | `https://api.cocreate.cz` | `https://api.jobbie.sk` |
| `NUXT_PUBLIC_SITE_URL` | `https://jobbie.sk` (see [§13](#13-pwa-frontend-deploy) phases) | `https://jobbie.sk` |
| `NUXT_PUBLIC_SUPABASE_URL` | staging Supabase URL | prod Supabase URL |
| `NUXT_PUBLIC_SUPABASE_ANON_KEY` | staging anon key | prod anon key |
| `NUXT_PUBLIC_SITE_URL` | staging PWA URL (no trailing slash) | `https://jobbie.sk` |
| `NUXT_PUBLIC_ALLOW_INDEXING` | `0` or empty | `1` |
| `NUXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe **test** publishable | Stripe **live** publishable |
| `NUXT_PUBLIC_TURNSTILE_SITE_KEY` | Turnstile site key (test OK) | production site key |

Optional: Sentry, PostHog, GTM, CDN URLs, SEO verification keys — see [deployment.md](./deployment.md). The workflow passes every `NUXT_PUBLIC_*` from the environment; leave unused ones empty.

`NUXT_PUBLIC_API_BASE_URL` is the **API origin only** (e.g. `https://api.cocreate.cz`), not `…/api` — the PWA appends `/api/...` on each request (`app-pwa/utils/api-base-url.ts`).

### 6.5 Verify CI secrets before first auto-deploy

1. Merge workflow files to `main` (and `staging` after branch exists)
2. Set all `STAGING_*` secrets and Cloudflare + `staging` environment `NUXT_PUBLIC_*` variables
3. Complete [VPS staging setup](#8-staging-vps-setup) through [first stack start](#11-first-stack-start)
4. Create Cloudflare Pages project `jobbie-pwa`; set **staging** environment vars (Phase 1 in [§13](#13-pwa-frontend-deploy))
5. Push a small change to `staging` or run **backend-ghcr** / **pwa-pages** manually from `staging`

---

## 7. VPS common bootstrap

Applies to **both** staging and production unless noted.

### 7.1 Recommended VPS size

```text
Ubuntu 24.04 LTS
4 vCPU, 8 GB RAM, 50–60 GB SSD
```

Staging may run on ARM (Oracle Ampere); production may be x86 — both work with multi-arch images.

### 7.2 DNS

Create an **A record**:

```text
api.your-domain.example  →  VPS_PUBLIC_IPV4
```

Examples:

- Staging: `api.cocreate.cz`
- Production: `api.jobbie.sk`

Caddy obtains HTTPS automatically once DNS propagates and ports **80/443** are open.

### 7.3 SSH access

On your workstation:

```bash
ssh-keygen -t ed25519 -C "websupport-jobbie"
```

On the VPS, create a sudo user and install your **human** public key (separate from the GitHub deploy key):

```bash
adduser ubuntu   # or use cloud image default user
usermod -aG sudo ubuntu
# install ~/.ssh/authorized_keys for ubuntu
```

Harden SSH (verify key login in a second terminal first):

```bash
sudo tee /etc/ssh/sshd_config.d/99-jobbie-hardening.conf >/dev/null <<'EOF'
PasswordAuthentication no
KbdInteractiveAuthentication no
PermitRootLogin no
PubkeyAuthentication yes
EOF
sudo sshd -t && sudo systemctl reload ssh
```

### 7.4 Copy deployment bundle

From your dev machine (repo root):

```bash
scp -r websupport-vps-deployment ubuntu@YOUR_VPS_IP:/tmp/
ssh ubuntu@YOUR_VPS_IP
sudo mkdir -p /srv/nestjs-typesense
sudo cp -a /tmp/websupport-vps-deployment/. /srv/nestjs-typesense/
cd /srv/nestjs-typesense
sudo bash scripts/setup_server.sh
```

`setup_server.sh` installs Docker, UFW (22/80/443), Python backup venv, `age`, unattended upgrades.

### 7.5 Docker access for deploy user

GitHub Actions SSH uses `sudo` for the deploy script. For manual operations:

```bash
sudo usermod -aG docker ubuntu
# log out and back in
```

### 7.6 Data directories

Typesense persists under:

```text
/srv/nestjs-typesense/data/typesense
/srv/nestjs-typesense/data/typesense-snapshots
```

Created on first `docker compose up`.

---

## 8. Staging VPS setup

Use your **staging** Supabase project, Stripe **test** keys, and staging domains in CORS/PWA config.

### Checklist

- [ ] VPS provisioned (e.g. Oracle ARM Ubuntu, user `ubuntu`)
- [ ] DNS `api.cocreate.cz` → staging IP
- [ ] [Common bootstrap](#7-vps-common-bootstrap) completed
- [ ] `.env` and `.env.backend` filled ([section 10](#10-environment-files-on-the-vps))
- [ ] `docker compose up -d` once — all services healthy
- [ ] GitHub `STAGING_*` secrets set
- [ ] GitHub deploy key in `authorized_keys`
- [ ] `staging` branch exists; default branch = `staging`
- [ ] Test push to `staging` or manual **backend-ghcr**

### Staging-specific `.env` highlights

```bash
# /srv/nestjs-typesense/.env
APP_DOMAIN=api.cocreate.cz
BACKEND_IMAGE=ghcr.io/pr3vesttheduck/jobbie-backend:staging-2026.06.12-abcdef0
TYPESENSE_API_KEY=<openssl rand -hex 32>
```

```bash
# /srv/nestjs-typesense/.env.backend (excerpt — full list: backend-ts/.env.example)
PUBLIC_API_URL=https://api.cocreate.cz
CORS_ORIGINS=http://localhost:3001,http://localhost:3000,https://www.jobbie.sk,https://jobbie.sk
# + staging Supabase, Stripe test, SESSION_COOKIE_SECRET, AUDIT_CHAIN_SECRET, etc.
```

`TYPESENSE_HOST` in compose is overridden to `typesense` — do not point at localhost in `.env.backend` for Docker deploy.

### Verify staging

```bash
curl -fsS https://api.cocreate.cz/health
cd /srv/nestjs-typesense && sudo docker compose ps
```

All services should be **healthy**.

---

## 9. Production VPS setup

Mirror staging with **production** values:

| Item | Production |
|------|------------|
| VPS | Separate host (recommended) |
| DNS | `api.jobbie.sk` |
| Supabase | Production project |
| Stripe | **Live** keys + live webhook endpoint |
| `CORS_ORIGINS` | `https://jobbie.sk`, `https://www.jobbie.sk` |
| `SESSION_COOKIE_DOMAIN` | `.jobbie.sk` if PWA and API are subdomains |
| GitHub secrets | `PROD_*` |
| Environment | `production` with required reviewers |

Complete bootstrap and first `docker compose up -d` **before** merging to `main` with auto-deploy enabled, or the first **deploy-production** job will fail SSH/pull.

After the stack is healthy, set up operator Discord notifications (Sentry bridge, content reports, Netdata): [OPS-DISCORD-ALERTING.md](../websupport-vps-deployment/OPS-DISCORD-ALERTING.md).

---

## 10. Environment files on the VPS

Location: `/srv/nestjs-typesense/`

| File | Purpose |
|------|---------|
| `.env` | Compose: `APP_DOMAIN`, `BACKEND_IMAGE`, `TYPESENSE_API_KEY` |
| `.env.backend` | Nest secrets (loaded into backend container) |
| `/etc/nestjs-typesense/backup.env` | R2 backups (optional) |

### Create files

```bash
cd /srv/nestjs-typesense
sudo cp .env.example .env
sudo chmod 600 .env

# Backend secrets: copy from backend-ts/.env.example as a template
sudo nano .env.backend
sudo chmod 600 .env.backend
```

Generate Typesense key (same value in all three places that reference it):

```bash
openssl rand -hex 32
```

Put it in `.env`, `.env.backend` (`TYPESENSE_API_KEY`), and `backup.env` if backups enabled.

### Minimum production backend variables

See [deployment.md](./deployment.md) and [`backend-ts/.env.example`](../backend-ts/.env.example). At minimum for a working API:

- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`
- `CORS_ORIGINS` (must include your PWA origins)
- `SESSION_COOKIE_SECRET`, `AUDIT_CHAIN_SECRET`
- `PUBLIC_API_URL`, `PUBLIC_APP_URL`
- Stripe keys + `STRIPE_WEBHOOK_SECRET` (if billing enabled)
- `TYPESENSE_API_KEY` (must match `.env`)

Copy **staging** `.env.backend` to prod only as a **structure** reference — replace every URL, key, and secret.

---

## 11. First stack start

```bash
cd /srv/nestjs-typesense

# If using private GHCR, login once (human or deploy token):
echo 'YOUR_READ_PACKAGES_PAT' | sudo docker login ghcr.io -u YOUR_GITHUB_USER --password-stdin

# Set BACKEND_IMAGE in .env to a tag that exists on GHCR
sudo docker compose pull
sudo docker compose up -d
sudo docker compose ps
```

Health checks:

```bash
curl -fsS https://YOUR_API_DOMAIN/health
curl -fsS http://127.0.0.1:8108/health   # on VPS only; Typesense local bind
```

Port sanity:

```bash
sudo ss -tulpn | grep -E ':80|:443|:8000|:8108'
```

Expected: **80/443** public (Caddy), **8108** on `127.0.0.1` only, backend **not** published on host port 8000.

### Typesense reindex (after empty Typesense data)

```bash
sudo docker compose exec backend node dist/scripts/backfill-typesense.js
```

---

## 12. Supabase migrations

Migrations live in `supabase/migrations/` (timestamp order).

**Order:** always **staging Supabase first**, then **production** after the release is approved.

Apply via:

- Supabase Dashboard → SQL (single migration), or
- Supabase CLI `db push` if configured locally

**Not automated** by `backend-ghcr`. When a release includes migrations:

1. Merge to `staging` → apply migrations on **staging** DB → test
2. Merge `staging` → `main` → deploy API → apply migrations on **prod** DB

See [database-schema-conventions.md](./database-schema-conventions.md).

---

## 13. PWA (frontend) deploy

The PWA is deployed separately from the backend VPS: **GitHub Actions** → **Cloudflare Pages** (`pwa-pages` on branch push; **deploy-pwa-*** for manual redeploy).

Build command in CI: `npm run build:cloudflare` (output `app-pwa/dist/`). PRs use `backend-ci` + `pwa-bundle-budget` only — no deploy until merge to `staging` or `main`.

### Host & project configuration (GitHub Environment variables)

Workflow reads **`PWA_PAGES_PROJECT`**, **`PWA_PAGES_BRANCH`**, and **`NUXT_PUBLIC_SITE_URL`** from the GitHub **Environment** (`staging` or `production`). Change these when you split hosts — no workflow edit required.

#### Phase 1 — now (staging frontend on `jobbie.sk`)

Use one Cloudflare Pages project until production goes live.

| GitHub **staging** variable | Value |
|----------------------------|--------|
| `PWA_PAGES_PROJECT` | `jobbie-pwa` |
| `PWA_PAGES_BRANCH` | *(leave empty)* |
| `NUXT_PUBLIC_SITE_URL` | `https://jobbie.sk` |
| `NUXT_PUBLIC_API_BASE_URL` | `https://api.cocreate.cz` |
| `NUXT_PUBLIC_MEDIA_CDN_URL` | `/media` |
| `NUXT_PUBLIC_ALLOW_INDEXING` | `0` or empty |

**Cloudflare dashboard** (project `jobbie-pwa`):

1. **Custom domains** → add `jobbie.sk` (and `www` if used)
2. **Settings** → **Production branch** = **`staging`** (so pushes from git `staging` update `jobbie.sk`)
3. Do **not** run **pwa-pages** from `main` until Phase 2 (or use **Skip deploy**)

API staging remains `api.cocreate.cz`; ensure `CORS_ORIGINS` on the staging API includes `https://jobbie.sk`.

#### Phase 2 — split hosts (recommended before prod launch)

| | **staging** environment | **production** environment |
|--|-------------------------|----------------------------|
| `PWA_PAGES_PROJECT` | `jobbie-pwa-staging` | `jobbie-pwa` |
| `PWA_PAGES_BRANCH` | `staging` | *(empty)* |
| `NUXT_PUBLIC_SITE_URL` | `https://staging.jobbie.sk` | `https://jobbie.sk` |
| `NUXT_PUBLIC_API_BASE_URL` | `https://api.cocreate.cz` | `https://api.jobbie.sk` |
| `NUXT_PUBLIC_MEDIA_CDN_URL` | `/media` | `/media` |
| `NUXT_PUBLIC_ALLOW_INDEXING` | `0` | `1` when ready |

**Cloudflare:**

1. Create project **`jobbie-pwa-staging`** → custom domain **`staging.jobbie.sk`** → production branch **`staging`**
2. Project **`jobbie-pwa`** → **`jobbie.sk`** → production branch **`main`**
3. Add `https://staging.jobbie.sk` to staging API `CORS_ORIGINS`; add `https://jobbie.sk` to prod API

**DNS:** `staging.jobbie.sk` CNAME → Pages; `jobbie.sk` stays on production project.

### Local build

```bash
cd app-pwa
npm ci
npm run build:cloudflare
# wrangler pages deploy dist --project-name=jobbie-pwa
```

SEO: [deployment.md](./deployment.md) — staging must not enable `NUXT_PUBLIC_ALLOW_INDEXING` until you intentionally want search indexing on that host.

---

## 14. Stripe & webhooks per environment

| | Staging | Production |
|--|---------|------------|
| Stripe mode | Test | Live |
| Webhook URL | `https://api.cocreate.cz/api/payments/webhook` (example) | `https://api.jobbie.sk/api/payments/webhook` |
| Secret | `STRIPE_WEBHOOK_SECRET` in staging `.env.backend` | separate live secret |

Use separate Stripe Price IDs in **staging vs prod** Supabase (`credit_packs`, `subscription_plans`).

---

## 15. Releasing: step-by-step checklist

### Regular feature release

1. [ ] PR `feature/*` → **`staging`**; CI green; merge
2. [ ] Confirm **backend-ghcr** succeeded; note image tag from Actions log
3. [ ] `curl https://api.cocreate.cz/health`
4. [ ] Manual QA on staging (PWA pointed at staging API if possible)
5. [ ] Apply new **Supabase migrations** on staging DB if any
6. [ ] PR **`staging` → `main`**; review; merge
7. [ ] Approve **production** environment deploy (if reviewers enabled)
8. [ ] Confirm prod health URL
9. [ ] Apply migrations on **production** Supabase
10. [ ] PWA: confirm **pwa-pages** succeeded (or run **deploy-pwa-production**) if `app-pwa/**` changed
11. [ ] Smoke test login, job list, billing (if touched)

### Hotfix (urgent production)

Option A (preferred): fix on branch from `staging`, merge to `staging`, quick test, PR to `main`.

Option B: patch `main` directly, deploy, then **merge `main` back into `staging`**.

Option C: run **deploy-production** workflow with a known good tag (rollback forward).

---

## 16. Manual deploy & rollback

### Redeploy without rebuild (GitHub UI)

- **Actions** → **deploy-staging** → enter tag e.g. `staging-2026.06.12-a1b2c3d`
- **Actions** → **deploy-production** → enter tag e.g. `2026.06.12-a1b2c3d`

### Manual on VPS

```bash
cd /srv/nestjs-typesense
export BACKEND_VERSION=staging-2026.06.12-a1b2c3d
export GHCR_IMAGE=ghcr.io/pr3vesttheduck/jobbie-backend
export GHCR_USER=pr3vesttheduck
export GHCR_TOKEN=...   # read:packages
# HEALTH_URL optional — derived from APP_DOMAIN in .env when unset
sudo -E bash scripts/deploy_backend.sh
```

### Rollback

Edit `.env` → set `BACKEND_IMAGE` to previous tag:

```bash
cd /srv/nestjs-typesense
sudo docker compose pull backend
sudo docker compose up -d backend
curl -fsS https://YOUR_API_DOMAIN/health
```

Database migrations may **not** roll back automatically — plan migration reversals separately.

### Build image without deploy

**Actions** → **backend-ghcr** → Run workflow → check **Skip VPS deploy after build**.

### Legacy tag deploy

Push git tag:

```bash
git tag backend-v2026.06.12-1
git push origin backend-v2026.06.12-1
```

Deploys to **staging** with image tag `2026.06.12-1`.

---

## 17. Routine operations

```bash
cd /srv/nestjs-typesense
sudo docker compose logs --tail=200 backend
sudo docker compose logs --tail=200 typesense
sudo docker compose logs --tail=200 caddy
sudo docker compose ps
df -h /
free -h
```

Optional: `websupport-vps-deployment/scripts/host_metrics.sh` prints JSON host + Docker stats (used by admin **Infra** over SSH; can also run manually on the VPS).

### Update compose file from repo

When `docker-compose.yml` or `Caddyfile` changes in git:

```bash
# copy updated files to /srv/nestjs-typesense/
sudo docker compose up -d
```

### Backups

Optional: Cloudflare R2 + `backup_manager.py`. See [README-DEPLOYMENT.md](../websupport-vps-deployment/README-DEPLOYMENT.md) (backup encryption, nightly timer, restore).

### Monitoring

| Signal | Where |
|--------|--------|
| Health | `GET /health` |
| Metrics | `GET /metrics` (Bearer token) |
| VPS host + Docker | JOBBIE Admin **Infra** (`jobbie-admin` → `/infrastructure`; SSH + health/metrics — see [admin-desktop.md](./admin-desktop.md)) |
| Sentry | API + PWA DSN env vars |
| Logs | `docker compose logs` |

See [observability-runbook.md](./observability-runbook.md).

---

## 18. Troubleshooting

### backend-ghcr deploy job failed: SSH

- Verify `STAGING_SSH_HOST`, user, and private key (full PEM, newlines preserved)
- Confirm deploy public key is in `authorized_keys`
- Test manually: `ssh -i jobbie-staging-deploy ubuntu@HOST`

### deploy job failed: `BACKEND_VERSION is required`

Ubuntu `sudo` resets the environment. CI workflows pass deploy vars on the `sudo` line (`sudo BACKEND_VERSION=… bash deploy_backend.sh`), not `sudo bash` alone.

### deploy job failed: docker pull / unauthorized

- `STAGING_GHCR_TOKEN` needs `read:packages`

### pwa-pages failed: Cloudflare / Wrangler

- `CLOUDFLARE_API_TOKEN` needs **Cloudflare Pages → Edit** on the account
- `CLOUDFLARE_ACCOUNT_ID` must match the account that owns the Pages project
- Create project `jobbie-pwa` (Phase 1) or both projects (Phase 2) before first deploy
- Set `PWA_PAGES_*` and `NUXT_PUBLIC_SITE_URL` on the GitHub **Environment**, not only repo variables
- Build needs at least `NUXT_PUBLIC_SUPABASE_URL` + `NUXT_PUBLIC_SUPABASE_ANON_KEY`
- Package visibility: repo must allow token access
- On VPS: `docker login ghcr.io` with same credentials

### backend container unhealthy

- `sudo docker compose logs backend`
- Common: missing env in `.env.backend`, Supabase URL wrong, `CORS_ORIGINS` empty in production
- Health check hits `/health` without Origin — should return 200 after CORS bypass fix

### typesense container unhealthy

- Image `typesense/typesense:30.2` has no `wget`; compose uses bash `/dev/tcp` healthcheck
- On VPS: `curl http://127.0.0.1:8108/health` should return `ok`

### Caddy / TLS issues

- DNS must point to VPS before certificates issue
- Ports 80/443 open in cloud security list + UFW

### Push to staging did not trigger backend-ghcr

- Path filter: only `backend-ts/**`, `websupport-vps-deployment/**`, or workflow file
- PWA-only commits do not trigger backend deploy

### main merge deployed to prod but I wanted to wait

- Use **production** environment **required reviewers** before deploy job runs
- Or merge with deploy secrets unset until ready (job fails safely)

### Search empty after Typesense wipe

```bash
sudo docker compose exec backend node dist/scripts/backfill-typesense.js
```

---

## 19. Security reminders

- Never commit `.env`, service role keys, or PATs to git
- `read:packages` PAT for deploy only — not `write` or `repo` on production servers
- Typesense listens on **127.0.0.1** only; never expose port 8108 publicly
- BFF session cookies: API `SESSION_COOKIE_SECRET`, CSRF on mutations — see [SECURITY.md](./SECURITY.md)
- Rotate any credential ever pasted into chat, logs, or committed files
- Staging may use production **PWA domain** in `CORS_ORIGINS` for local/staging tests — understand the cookie/same-site implications

---

## Quick reference card

```text
Develop:     feature → PR → staging
Test:        api.cocreate.cz (staging)
Release:     PR staging → main
Prod API:    api.jobbie.sk (after PROD_* secrets + VPS ready)

Image tags:  staging-YYYY.MM.DD-<sha7>  |  YYYY.MM.DD-<sha7>
VPS path:    /srv/nestjs-typesense/
Compose:     docker compose pull && docker compose up -d
Health:      curl https://<api-domain>/health
```

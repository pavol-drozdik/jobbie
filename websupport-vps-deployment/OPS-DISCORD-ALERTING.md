# Production Discord alerting (free tier)

Operator runbook for **production VPS** (`jobbie-prod` pattern). Replicate on a new server after Docker stack bootstrap.

**Cost:** Sentry Developer (free), Supabase Edge Functions (free tier), Netdata (open source), Cloudflare Workers (free tier). No paid Sentry Discord integration, no n8n.

**Do not commit Discord webhook URLs, Worker secrets, or Sentry bridge paths to git.**

---

## Overview

| Alert | Source | Destination | Runs on |
|-------|--------|-------------|---------|
| API + PWA bugs | Sentry (`backend-ts`, `app-pwa`) | `#bugs-prod` | Cloudflare Worker |
| User content reports | `content_reports` INSERT | `#moderation` | Supabase Edge Function |
| CPU / RAM / disk ≥ 95% | Netdata | `#ops-alerts` | Production VPS |
| API `/health` down | Netdata `go.d` httpcheck | `#ops-alerts` | Production VPS |

Related app code:

- Health endpoint: `GET /health` → `{"status":"ok"}` (`backend-ts/src/app.controller.ts`)
- Reports API: `POST /api/reports` → `content_reports` (`backend-ts/src/audit/content-reports.service.ts`)

Example config templates (copy to `/etc/netdata/` on the VPS): [`ops/netdata/`](./ops/netdata/).

---

## 0. Discord channels and webhooks

Create three channels (names are flexible):

| Channel | Webhook name (example) | Used by |
|---------|------------------------|---------|
| `#bugs-prod` | JOBBIE Bugs | Sentry bridge Worker |
| `#moderation` | JOBBIE Moderation | Supabase Edge Function |
| `#ops-alerts` | JOBBIE Ops | Netdata |

Per channel: **Edit channel → Integrations → Webhooks → New Webhook → Copy URL**.

Store URLs in secret managers only (Cloudflare Worker secrets, Supabase secrets, `/etc/netdata/health_alarm_notify.conf`).

---

## 1. Sentry bugs → Discord (Cloudflare Worker)

Sentry **Developer (free)** captures errors but **native Discord is paid** (Team+). Use an **Internal Integration** webhook → **Cloudflare Worker** → Discord.

**Do not use** legacy project **Webhooks** plugin on Sentry SaaS (deprecated / test button often does not POST outbound). **Do not** point Sentry at a Discord webhook URL directly.

### 1.1 Deploy the Worker

1. Cloudflare Dashboard → **Workers & Pages** → **Create** → name e.g. `sentry-discord-bridge`.
2. Paste code from [`ops/sentry-discord-bridge.worker.example.js`](./ops/sentry-discord-bridge.worker.example.js) (adjust `PROJECT_LABELS` if Sentry project slugs differ).
3. **Settings → Variables and Secrets** (encrypted):

   | Secret | Value |
   |--------|--------|
   | `WEBHOOK_SECRET` | Long random string (also used in Sentry callback URL path) |
   | `DISCORD_WEBHOOK_URL` | `#bugs-prod` webhook URL |

4. Deploy. Note the Worker hostname, e.g. `sentry-discord-bridge.example.workers.dev`.

### 1.2 Sentry Internal Integration

1. Sentry → **Settings** (organization) → **Developer Settings** → **Internal Integrations** → **Create New**.
2. **Webhook URL** (path secret — **not** `?secret=` query; query auth returned 401 in production):

   ```text
   https://sentry-discord-bridge.example.workers.dev/sentry/YOUR_WEBHOOK_SECRET
   ```

3. Enable **Alert Rule Action** (or equivalent outbound alert permission).
4. Save. Use **Send test notification** on an **alert rule** (not legacy “Test plugin”).

### 1.3 Issue alert rules (per project)

For **`backend-ts`** and **`app-pwa`** (production):

1. Project → **Alerts** → **Create Alert** → **Issues**.
2. When: e.g. “A new issue is created” or “issue changes state to regressed” — tune to taste.
3. Action: **Send a notification via** → your Internal Integration.
4. **Send test notification** on the rule → Discord should show a formatted message (project, environment, title, level, link).

### 1.4 Verify

```bash
# Worker auth (expect 200, Discord message)
curl -s -o /dev/null -w "%{http_code}\n" \
  -X POST "https://sentry-discord-bridge.example.workers.dev/sentry/YOUR_WEBHOOK_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"action":"event_alert","data":{"issue":{"title":"curl test","permalink":"https://sentry.io"},"project":{"slug":"backend-ts"},"event":{"environment":"production","level":"error"}}}'
```

Worker logs: Cloudflare → Worker → **Logs** / `npx wrangler tail sentry-discord-bridge`.

---

## 2. Content reports → Discord (Supabase)

Reports are inserted by the Nest API; notify on **`INSERT`** into `content_reports` via a **Database Webhook** → Edge Function (no n8n).

### 2.1 Edge Function `discord-content-report`

1. Supabase Dashboard → **Edge Functions** → **Deploy new function** → **Via Editor**.
2. Name: `discord-content-report` (exact).
3. Code: [`ops/supabase/discord-content-report.example.ts`](./ops/supabase/discord-content-report.example.ts).
4. **Project Settings → Edge Functions → Secrets**:

   ```text
   DISCORD_MODERATION_WEBHOOK_URL=https://discord.com/api/webhooks/...
   ```

5. Deploy. For DB webhooks, JWT verification must be off:
   - Dashboard: function → **Details** → disable **Verify JWT**, or
   - CLI: `supabase functions deploy discord-content-report --no-verify-jwt`

### 2.2 Database webhook

1. **Database → Webhooks → Create a new hook**.
2. **Table:** `public.content_reports`
3. **Events:** `INSERT`
4. **Type:** Supabase Edge Function
5. **Function:** `discord-content-report`
6. Save.

### 2.3 Test

Submit a report from the PWA (logged-in user) or `POST /api/reports` with a valid session. A message should appear in `#moderation` with `target_type`, `target_id`, `reason`, and report `id`.

---

## 3. Server usage + API health (Netdata on VPS)

Install on **each production API VPS** (same host as `/srv/nestjs-typesense` Docker stack). Uses one `#ops-alerts` webhook for resource and HTTP alarms.

### 3.1 Install Netdata

```bash
curl -fsSL https://get.netdata.cloud/kickstart.sh | sudo bash -s -- --non-interactive
```

If apt prompts abort the install, always use `--non-interactive`.

```bash
sudo systemctl status netdata
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:19999/api/v1/info
```

**Bind dashboard to localhost** (recommended — do not expose port `19999` publicly):

```bash
sudo /etc/netdata/edit-config netdata.conf
```

Under `[web]`:

```ini
bind to = localhost
```

```bash
sudo systemctl restart netdata
```

### 3.2 Discord notifications

```bash
sudo /etc/netdata/edit-config health_alarm_notify.conf
```

Set (see [`ops/netdata/health_alarm_notify.snippet.conf`](./ops/netdata/health_alarm_notify.snippet.conf)):

```conf
SEND_EMAIL="NO"
SEND_DISCORD="YES"
DISCORD_WEBHOOK_URL="https://discord.com/api/webhooks/..."
role_recipients[sysadmin]="discord"
role_recipients[webmaster]="discord"
```

- **`sysadmin`** — CPU/RAM/disk alarms (`health.d/jobbie.conf`)
- **`webmaster`** — httpcheck alarms (stock `health.d/httpcheck.conf`)

Test:

```bash
sudo /usr/libexec/netdata/plugins.d/alarm-notify.sh test
```

Expect three messages in `#ops-alerts` (warning, critical, clear). Netdata 2.x may not write `/var/log/netdata/alarm-notify.log`; manual test output goes to the terminal.

### 3.3 Resource alarms (≥ 95%, re-notify every 6 h)

```bash
sudo cp /srv/nestjs-typesense/ops/netdata/health.d/jobbie.conf.example \
  /etc/netdata/health.d/jobbie.conf
# Edit [jobbie-prod] hostname in info: lines if needed
sudo netdatacli reload-health
```

Template: [`ops/netdata/health.d/jobbie.conf.example`](./ops/netdata/health.d/jobbie.conf.example).

### 3.4 API health check (local origin — not public URL)

**Important:** If `api.example.com` is behind **Cloudflare**, probing `https://api.example.com/health` from the VPS can return **cached 200** while the Docker backend is stopped. Probe **local Caddy** instead.

Replace `api.example.com` with your `APP_DOMAIN` from `/srv/nestjs-typesense/.env`.

```bash
sudo cp /srv/nestjs-typesense/ops/netdata/httpcheck.conf.example \
  /etc/netdata/go.d/httpcheck.conf
# Edit Host: header to match APP_DOMAIN
```

Enable the collector:

```bash
sudo /etc/netdata/edit-config go.d.conf
```

Under `modules:` uncomment or add:

```yaml
  httpcheck: yes
```

Apply:

```bash
sudo systemctl restart netdata
sleep 90
sudo netdatacli reload-health
```

Verify charts and alarms:

```bash
curl -s 'http://127.0.0.1:19999/api/v1/charts' | tr ',' '\n' | grep httpcheck_jobbie
curl -s 'http://127.0.0.1:19999/api/v1/alarms?all' | tr ',' '\n' | grep httpcheck_web_service_up
curl -s 'http://127.0.0.1:19999/api/v1/data?chart=httpcheck_jobbie_api_health.request_status&after=-300&points=1&format=csv'
```

After **every** `systemctl restart netdata`, wait ~90 s for the first httpcheck collection, then run `sudo netdatacli reload-health` so stock httpcheck alarm templates attach to the new charts.

### 3.5 End-to-end API-down test

```bash
cd /srv/nestjs-typesense
sudo docker compose stop backend

# Local origin must fail (502/503)
curl -s -o /dev/null -w "local: %{http_code}\n" -H "Host: api.example.com" http://127.0.0.1/health
# Public URL may still be 200 if Cloudflare caches /health
curl -s -o /dev/null -w "public: %{http_code}\n" https://api.example.com/health

sleep 180
curl -s 'http://127.0.0.1:19999/api/v1/data?chart=httpcheck_jobbie_api_health.request_status&after=-600&points=3&format=csv'
```

Expect Discord critical/warning in `#ops-alerts`, then:

```bash
sudo docker compose start backend
```

### 3.6 Optional: Cloudflare cache bypass for `/health`

For **external** uptime (UptimeRobot, etc.), add a Cache Rule: `api.example.com/health` → **Bypass cache**.

---

## 4. Replication checklist (new production VPS)

| Step | Done |
|------|------|
| Docker stack up (`/srv/nestjs-typesense`, `APP_DOMAIN` in `.env`) | ☐ |
| Sentry DSN on API + PWA for this environment | ☐ |
| Cloudflare Worker deployed; secrets set; Sentry Internal Integration URL uses **path** secret | ☐ |
| Sentry alert rules on `backend-ts` + `app-pwa` → Internal Integration | ☐ |
| Supabase `discord-content-report` deployed; secret set; JWT verify off; DB webhook on `content_reports` INSERT | ☐ |
| Netdata installed (`--non-interactive`); `[web] bind to = localhost` | ☐ |
| `health_alarm_notify.conf`: Discord + `sysadmin` + `webmaster` → `discord` | ☐ |
| `health.d/jobbie.conf` (95% thresholds) | ☐ |
| `go.d/httpcheck.conf` with `127.0.0.1` + `Host: $APP_DOMAIN`; `go.d.conf` → `httpcheck: yes` | ☐ |
| `netdatacli reload-health` after first httpcheck charts appear | ☐ |
| `alarm-notify.sh test` → 3 Discord messages | ☐ |
| `docker compose stop backend` → Discord alert; `start` → recovery | ☐ |

---

## 5. Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| Sentry test fails, Worker logs empty | Legacy Webhooks plugin or wrong URL | Use Internal Integration + alert rule test |
| Worker 401 | Secret in query string vs path | URL must be `/sentry/SECRET`, not `?secret=` |
| Reports not in Discord | JWT verify on function, or webhook not created | `--no-verify-jwt`; check DB webhook |
| `alarm-notify.sh test` OK, no real alerts | Alarms not attached to httpcheck chart | Wait 90 s after restart, `netdatacli reload-health` |
| Backend stopped, Netdata still `success: 1` | Probing public URL through CDN | Use local `127.0.0.1` + `Host` header |
| Multiple Discord messages per outage | Several stock httpcheck alarms | Expected; optional: custom single alarm in `health.d/` |

---

## See also

- [`README-DEPLOYMENT.md`](./README-DEPLOYMENT.md) — VPS bootstrap and Docker
- [`docs/observability-runbook.md`](../docs/observability-runbook.md) — Sentry env vars, Prometheus, PostHog
- [`docs/notifications.md`](../docs/notifications.md) — in-app / email user notifications (separate from operator Discord)

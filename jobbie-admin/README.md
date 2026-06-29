# JOBBIE Admin (desktop)

Local-only admin panel for platform operators. **Not** deployed as a public website â€” runs as an Electron desktop app on Windows and macOS with a NestJS API bound to `127.0.0.1`.

## Layout

| Path | Role |
|------|------|
| `api/` | NestJS admin API (port **3099** default) |
| `app/` | Vue 3 + Vite UI |
| `electron/` | Electron shell (spawns API, loads UI) |

## Screens

- **Prehľad** — operations home: KPIs, open reports, failed payments (7d), your recent audit, quick links (default route `/overview`)
- **Infra** — staging + production VPS: API health, host CPU/RAM/disk, Docker stats, optional Prometheus app metrics (`/infrastructure`)
- **Podpora** — UUID search, job/ad/user detail, unpublish, billing ledger, GDPR export / account close
- **Analytics** — funnel, revenue, cohorts, API latency, search KPIs; custom date range; period compare; CSV export; optional PostHog / GA4 / Clarity / Search Console
- **Audit** — `audit_events` filters (prefix chips, actor/subject), export, chain verify
- **Moderácia** — SLA queue (oldest first, >24h badge), claim, resolution codes, dismiss/hide; sidebar badge
- **Účty** — user search, suspend / unsuspend; link to Podpora for billing & GDPR
- **Upozornenia** — broadcast `admin_broadcast` (all / company / individual) with recipient count
- **Blog** — CRUD + publish; public preview `/blog/{slug}`

## Auth

1. Sign in with Supabase (email/password) using the **anon** key in the UI.
2. UI sends `Authorization: Bearer <access_token>` to the local admin API.
3. API enforces `app_role = admin` and `@RequireRecentLogin()` via JWT `auth_time` / `iat` on sensitive routes. Window: **`ADMIN_RECENT_LOGIN_MINUTES`** (default **120**; main `backend-ts` API remains 15 min).

Set `profiles.app_role = 'admin'` in the database for your operator account (that is enough for Moderácia and all desktop scopes). Optional `profiles.admin_role` is only used for fine-grained limits when `app_role` is not `admin`.

Smoke test: `powershell -File scripts/admin-smoke.ps1` (expects API on `127.0.0.1:3099`).

## Setup

```bash
cd jobbie-admin
cp api/.env.example api/.env
cp app/.env.example app/.env
# Fill Supabase URL, service role, JWT secret, anon key (same project as main JOBBIE)
npm install
npm run install:all
```

## Development

```bash
cd jobbie-admin
npm run dev
```

Or separately:

```bash
npm run dev:api   # http://127.0.0.1:3099
npm run dev:app   # http://127.0.0.1:5199
npx electron .
```

Dev uses `api/.env` automatically (see `electron/main.cjs`). `npm run dev` starts the API and Vite, waits for `http://127.0.0.1:3099/health`, then opens Electron **without** spawning a second API process.

### Browser-only UI (Vite without Electron)

```bash
npm run dev:api    # required — serves http://127.0.0.1:3099
npm run dev:app    # http://127.0.0.1:5199
```

If you open only `dev:app`, every API call fails with **status 0** / `Failed to fetch` because nothing listens on port 3099.

## Troubleshooting (Admin API / Failed to fetch)

Symptom in the UI: `Chyba 0: Admin API unreachable (http://127.0.0.1:3099): Failed to fetch`.

| Cause | Fix |
|-------|-----|
| API not running | `cd jobbie-admin` → `npm run dev:api` or full `npm run dev` |
| Nest still compiling | First `start:dev` can take **10–20s**; wait for `JOBBIE Admin API listening on http://127.0.0.1:3099` |
| Missing / incomplete `api/.env` | `cp api/.env.example api/.env` and fill `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET` (same as `backend-ts/.env`) |
| Wrong UI env | `app/.env` must include `VITE_ADMIN_API_URL=http://127.0.0.1:3099` |
| Port **3099** in use | See below — kill the stale process, then restart API |

**Verify API manually (PowerShell):**

```powershell
cd C:\Users\preve\Desktop\Coding\JOBBIE\jobbie-admin\api
npm run build
npm run start:dev
# In another terminal:
curl.exe http://127.0.0.1:3099/health
```

Expected response: `{"ok":true}`.

**Free port 3099 on Windows** (EADDRINUSE / address already in use):

```powershell
netstat -ano | findstr :3099
# Note the PID in the last column, then:
taskkill /PID <pid> /F
```

Alternative:

```powershell
Get-NetTCPConnection -LocalPort 3099 -ErrorAction SilentlyContinue | Select-Object OwningProcess -Unique
Stop-Process -Id <pid> -Force
```

**Electron alone** (`npx electron .`): the shell spawns `npm run start:dev` and waits up to 2 minutes for `/health` before loading the window. Prefer `npm run dev` for daily work.

**Do not** bind the admin API to `0.0.0.0` — it must stay on `127.0.0.1` only.

## Troubleshooting (login failed)

| Symptom | Fix |
|---------|-----|
| `Chýba app/.env` / missing Supabase | `app/.env`: `VITE_ADMIN_API_URL=http://127.0.0.1:3099` (Supabase keys live in **api/.env**) |
| `SUPABASE_ANON_KEY missing` | `api/.env`: copy `NUXT_PUBLIC_SUPABASE_ANON_KEY` from `app-pwa/.env` — **not** the service role key |
| `captcha_failed` / Turnstile | Supabase Auth CAPTCHA is on — add `VITE_TURNSTILE_SITE_KEY` to `app/.env` (same as PWA site key), complete widget before login |
| `Nesprávny e-mail alebo heslo` | Same credentials as [jobbie.sk](https://jobbie.sk); reset password in the PWA if needed |
| Login OK but 403 on overview | Set `profiles.app_role = 'admin'` for your user in Supabase |
| `Missing or invalid Bearer token` after login | `api/.env` — `SUPABASE_JWT_SECRET` must match Supabase Dashboard → API → JWT Secret |
| `E-mail nie je overený` | Confirm email via PWA signup link first |

After changing `app/.env`, restart Vite/Electron (`npm run dev`).

## External analytics (optional)

Analytics → **Web & marketing** calls `GET /api/admin/analytics/external` with the same `from`/`to` as platform KPIs. Configure any subset in `api/.env` (see `api/.env.example`).

| Source | Env variables | Notes |
|--------|---------------|--------|
| PostHog | `POSTHOG_PERSONAL_API_KEY`, `POSTHOG_PROJECT_ID`, `POSTHOG_HOST` | Personal API key from PostHog project settings |
| GA4 | `GA4_PROPERTY_ID`, `GOOGLE_SERVICE_ACCOUNT_JSON` | Service account needs **Viewer** on the GA4 property |
| Search Console | `GSC_SITE_URL`, `GOOGLE_SERVICE_ACCOUNT_JSON` | Add the service account email as a user on the GSC property (`https://` or `sc-domain:` URL) |
| Microsoft Clarity | `CLARITY_API_TOKEN` | Token from Clarity → Settings → Data Export; API returns **last 1–3 days only** (max 10 requests/day per project) |

**Google service account:** Create in Google Cloud → enable **Google Analytics Data API** and **Search Console API** → download JSON → paste minified into `GOOGLE_SERVICE_ACCOUNT_JSON` (single line). Never commit the JSON file.

## Build installers

From `jobbie-admin/` after `npm install` and `npm run install:all`:

```bash
npm run build:win   # Windows NSIS â†’ release/JOBBIE-Admin-1.0.0-Setup.exe
npm run build:mac   # macOS dmg + zip â†’ release/JOBBIE-Admin-1.0.0.dmg
```

**Windows `.exe` must be built on Windows** (or a Windows CI runner). macOS cannot produce the NSIS installer reliably.

Icons live in [`build/`](build/) (`icon.svg` source, committed `icon.ico` / `icon.icns`). Regenerate after editing the SVG:

```bash
npm run icons:generate
```

The build compiles the Nest API and Vue UI, then packages them with Electron. **macOS `.dmg` must be built on a Mac** (or macOS CI runner); Windows cannot cross-compile a signed-looking `.app` reliably.

> **Note:** The Vue UI folder is named `app/`, which electron-builder would treat as the Electron app dir by default. `package.json` sets `build.directories.app` to `"."` so packaging uses the repo root (`electron/main.cjs`). Windows builds disable executable signing edits (`signAndEditExecutable: false`) so packaging works without admin symlink privileges.
>
> Windows builds write to a unique `release-build-<timestamp>-<pid>/` folder during packaging; the NSIS installer is copied to `release/`. See [Troubleshooting (Windows build)](#troubleshooting-windows-build).

### Unsigned builds (no code-signing certificate)

For internal / friend distribution without Apple Developer ID or Windows Authenticode:

```bash
npm run build:win:unsigned   # same NSIS Setup.exe, no signing discovery
npm run build:mac:unsigned   # same DMG/zip, no signing discovery
```

Same artifacts as `build:win` / `build:mac`. Recipients still need SmartScreen or Gatekeeper steps below.

### Share with a friend (Mac)

1. **Build on a Mac** (Apple Silicon or Intel): clone the repo, `cd jobbie-admin`, copy env files for dev only, then `npm install`, `npm run install:all`, and `npm run build:mac` (or `build:mac:unsigned`).
2. **Send one file**: `release/JOBBIE-Admin-<version>.dmg` (AirDrop, USB stick, iCloud, etc.). A `.zip` is also produced if they prefer unzipping manually.
3. **Install**: open the DMG, drag **JOBBIE Admin** to **Applications**, eject the disk image.
4. **First launch (unsigned / ad-hoc)**: macOS Gatekeeper may block the app. Either **right-click â†’ Open â†’ Open** once, or in Terminal: `xattr -cr "/Applications/JOBBIE Admin.app"` then open normally.
5. **Configure secrets**: on first run the app creates `~/Library/Application Support/jobbie-admin/.env` from the bundled template (or place `.env` next to the `.app`). Fill `SUPABASE_*` and `AUDIT_CHAIN_SECRET` like `api/.env.example`, then restart.

Code signing with an **Apple Developer ID Application** certificate plus notarization removes the Gatekeeper warning for most users; that is optional for trusted friends who can use right-click Open once.

### Share with a friend (Windows)

1. **Build on Windows**: clone the repo, `cd jobbie-admin`, copy env files for dev only, then `npm install`, `npm run install:all`, and `npm run build:win` (or `build:win:unsigned`).
2. **Send one file**: `release/JOBBIE-Admin-<version>-Setup.exe` (USB stick, OneDrive, Google Drive, etc.).
3. **Install**: run the installer, choose install folder if prompted, optionally add a desktop shortcut, finish. Uninstall later via **Settings â†’ Apps** or **Add or remove programs** (â€œJOBBIE Adminâ€).
4. **First run (unsigned)**: Windows SmartScreen may show **Windows protected your PC**. Click **More info**, then **Run anyway** (same as any unsigned internal app). Optional **Authenticode** signing with a code-signing certificate reduces this for wider distribution.
5. **Configure secrets**: on first run the app creates `%APPDATA%\jobbie-admin\.env` from the bundled template (or place `.env` next to `JOBBIE Admin.exe` in the install folder). Fill `SUPABASE_*` and `AUDIT_CHAIN_SECRET` like `api/.env.example`, then restart. Sign in with an account that has `profiles.app_role = 'admin'` and complete **TOTP MFA**.

### Packaged `.env` (production)

On first launch, if no env file exists, the app copies `api.env.example` from install resources to:

| OS | Default path |
|----|----------------|
| Windows | `%APPDATA%\jobbie-admin\.env` (Electron `userData`) |
| macOS | `~/Library/Application Support/jobbie-admin/.env` |

You can also place `.env` **next to the installed executable** (portable installs) â€” that takes precedence.

Edit the file with the same secrets as `backend-ts/.env`:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_JWT_SECRET`
- `AUDIT_CHAIN_SECRET` (required when `NODE_ENV=production`)

Restart the app after saving. The Electron shell passes the path to the API via `DOTENV_CONFIG_PATH`.


## Troubleshooting (Windows build)

### `cannot access app.asar` / `release\win-unpacked` locked

electron-builder must replace `win-unpacked` on each build. On Windows the lock usually comes from:

| Source | What to do |
|--------|------------|
| **JOBBIE Admin** or **Electron** from a prior run | Quit the app; `npm run clean:release` stops processes named `JOBBIE Admin` and Electron binaries under `jobbie-admin`. |
| **Cursor / VS Code** | The editor may keep `release/**/app.asar` open for indexing. Close tabs under `release/`, or rely on [`jobbie-admin/.cursorignore`](.cursorignore) (`release/`, `release-fresh/`, `release-build-*/`) and repo-root `.cursorignore` (`jobbie-admin/release*/**`). Reload the window if the lock persists. |
| **File Explorer** preview | Close the folder preview or navigate away from `release\win-unpacked`. |

**Recommended:**

```bash
cd jobbie-admin
npm run build:win
```

`npm run build:win` runs best-effort `clean:release` first, then packages into a **new `release-build-*` directory** (no delete required if Cursor locks old `app.asar`), then copies `JOBBIE-Admin-<version>-Setup.exe` into **`release/`** for distribution.

If `clean:release` warns that `release/`, `release-fresh/`, or older `release-build-*` folders could not be removed, you can ignore it for building, or delete them manually after closing the locking app (often **Cursor** indexing `release/**/app.asar`). Use `npm run build:win:force` to skip clean entirely.

Optional: `npm run build:win:force` — timestamped output only, no `clean:release`.

## Env vars (API)

See [`api/.env.example`](api/.env.example): `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`, `AUDIT_CHAIN_SECRET`, optional `SEARCH_ANALYTICS_SECRET`, `ADMIN_RECENT_LOGIN_MINUTES` (step-up window for suspend/moderation/audit export; default **120**).

**Solo operator:** use default `120` or set `480` (8 h) in `api/.env` / packaged `%APPDATA%\jobbie-admin\.env` if you rarely want to re-authenticate with MFA. Tighten to `15` only if you need parity with production step-up policy on a shared machine.

## Security notes

- API listens on **127.0.0.1** only.
- Uses the same Supabase service role as `backend-ts` â€” protect `.env` on the operator machine.
- Do not expose port 3099 to the network.

Main product docs: [docs/admin-desktop.md](../docs/admin-desktop.md).



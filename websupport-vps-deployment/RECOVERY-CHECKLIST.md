# Recovery Checklist

## Broken VPS

- Confirm Supabase is still healthy in the Supabase dashboard.
- Provision a fresh Ubuntu 24.04 VPS.
- Point DNS to the new VPS when ready.
- Run `scripts/setup_server.sh`.
- Copy this deployment bundle to `/srv/nestjs-typesense`.
- Recreate `.env`, `.env.backend`, and `/etc/nestjs-typesense/backup.env` from trusted secrets.
- Deploy with `sudo docker compose up -d`.
- Restore Typesense from R2 or run a full reindex from Supabase.
- Verify `https://api.example.com/health`, representative job searches, and school/profile searches.

## Compromised VPS

- Do not trust local files from the compromised machine.
- Revoke GHCR tokens used on the VPS.
- Rotate the Typesense admin key.
- Rotate Cloudflare R2 access keys.
- Rotate Supabase service role key and any database passwords exposed to the VPS.
- Rotate Stripe webhook/API secrets, SMTP credentials, Sentry DSN if needed, Twilio token, VAPID private key, audit secrets, notification token secrets, and debug secrets.
- Recreate the VPS from clean deployment files and trusted secret storage.
- Inspect R2 backups before restore. A compromised VPS can upload bad backups, so prefer the newest known-good backup from before compromise.

## Recreate VPS

```bash
scp -r websupport-vps-deployment deploy@YOUR_VPS_IP:/tmp/
ssh deploy@YOUR_VPS_IP
sudo mkdir -p /srv/nestjs-typesense
sudo cp -a /tmp/websupport-vps-deployment/. /srv/nestjs-typesense/
sudo chown -R root:root /srv/nestjs-typesense
cd /srv/nestjs-typesense
sudo bash scripts/setup_server.sh
sudo cp .env.example .env
sudo cp .env.backend.example .env.backend
sudo chmod 600 .env .env.backend
```

Fill secrets from trusted storage, then deploy:

```bash
sudo docker compose pull
sudo docker compose up -d
```

## Restore Typesense

```bash
sudo install -m 600 /path/to/jobbie-backup-age-key.txt /root/jobbie-backup-age-key.txt
sudo sed -i 's#^AGE_IDENTITY_FILE=.*#AGE_IDENTITY_FILE=/root/jobbie-backup-age-key.txt#' /etc/nestjs-typesense/backup.env
sudo bash -c '
  set -a
  source /etc/nestjs-typesense/backup.env
  set +a
  /opt/nestjs-typesense-backup-venv/bin/python \
    /srv/nestjs-typesense/scripts/backup_manager.py restore-typesense-latest --force
'
```

Remove the temporary private identity after verification:

```bash
sudo rm /root/jobbie-backup-age-key.txt
sudo sed -i 's#^AGE_IDENTITY_FILE=.*#AGE_IDENTITY_FILE=#' /etc/nestjs-typesense/backup.env
```

## Reindex Fallback

If no trusted Typesense backup exists:

```bash
cd /srv/nestjs-typesense
sudo docker compose exec backend node dist/scripts/backfill-typesense.js
```

Run targeted variants if needed:

```bash
sudo docker compose exec backend node dist/scripts/backfill-typesense.js --jobs-only
sudo docker compose exec backend node dist/scripts/backfill-typesense.js --profiles-only
sudo docker compose exec backend node dist/scripts/backfill-typesense.js --schools-only
```

## Verification

```bash
curl -fsS https://api.example.com/health
curl -fsS http://127.0.0.1:8108/health
sudo docker compose ps
sudo docker compose logs --tail=100 backend
```

Verify representative user-facing searches in the PWA/API:

- Search active job listings.
- Search school picker entries.
- Search company/worker profiles if that feature is enabled.
- Confirm expired, draft, deleted, and inactive jobs are not returned.

## Supabase Dumps

Download only:

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

Do not automatically restore over live Supabase production. Storage objects are not included in Postgres dumps.

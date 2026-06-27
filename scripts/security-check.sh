#!/usr/bin/env sh
# Lightweight grep-based guardrails for PRs. Exit 1 on forbidden patterns.
set -eu

cd "$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"
FAILED=0

warn() { echo "security-check: $1"; FAILED=1; }

# Client must not grant credits
if rg -n "grant_credits|profiles\\.credits\\s*=" app-pwa --glob '!node_modules' 2>/dev/null; then
  warn "app-pwa must not call grant_credits or set profiles.credits"
fi

# Backend must not set profile credits directly (outside comments)
if rg -n "profiles\\.credits\\s*=" backend-ts/src --glob '*.ts' 2>/dev/null; then
  warn "backend-ts must not assign profiles.credits directly; use CreditsService RPCs"
fi

# grant_credits RPC only from CreditsService
if rg -n "rpc\\(['\"]grant_credits" backend-ts/src --glob '*.ts' --glob '!**/credits.service.ts' 2>/dev/null; then
  warn "grant_credits RPC should only be invoked from CreditsService"
fi

# PWA must not call .upload() directly (uploadToSignedUrl via Nest init is OK)
if rg -n '\.storage\.from\([^)]+\)\.upload\(' app-pwa --glob '!node_modules' 2>/dev/null; then
  warn "app-pwa must use Nest storage endpoints (useStorageUpload), not supabase.storage.upload"
fi

# After storage lockdown, do not re-add permissive client INSERT on public image buckets
lockdown_mig=$(ls supabase/migrations/*storage_upload_lockdown*.sql 2>/dev/null | head -1 || true)
if [ -n "$lockdown_mig" ]; then
  lockdown_ts=$(basename "$lockdown_mig" .sql | cut -d_ -f1)
  for mig in supabase/migrations/*.sql; do
    mig_ts=$(basename "$mig" .sql | cut -d_ -f1)
    [ "$mig_ts" -le "$lockdown_ts" ] && continue
    if rg -n 'create policy "job-photos: authenticated upload"' "$mig" 2>/dev/null; then
      warn "job-photos must not allow authenticated INSERT after storage_upload_lockdown migration"
    fi
    if rg -n 'create policy "profile-avatars: authenticated upload"' "$mig" 2>/dev/null; then
      warn "profile-avatars must not allow authenticated INSERT after storage_upload_lockdown migration"
    fi
  done
else
  # Legacy: job-photos insert must scope to auth.uid() until lockdown ships
  if rg -n 'bucket_id = .job-photos' supabase/migrations/*.sql 2>/dev/null | head -1 >/dev/null; then
    if ! rg -n "job-photos: authenticated upload" supabase/migrations -A8 2>/dev/null | rg -q 'auth\.uid\(\)'; then
      warn "job-photos insert policy should require auth.uid() folder (or apply storage_upload_lockdown)"
    fi
  fi
fi

# chat-media lockdown migration must define MIME allowlist
if [ -n "$lockdown_mig" ] && ! rg -q 'image/jpeg' "$lockdown_mig" 2>/dev/null; then
  warn "storage_upload_lockdown migration should set chat-media allowed_mime_types"
fi

# stripe_credit_fulfillments: no new authenticated INSERT after security_hardening dropped it
fulfill_lock_ts=20260621120000
for mig in supabase/migrations/*.sql; do
  mig_ts=$(basename "$mig" .sql | cut -d_ -f1)
  [ "$mig_ts" -le "$fulfill_lock_ts" ] && continue
  if rg -n 'create policy authenticated_own_credit_fulfillments' "$mig" 2>/dev/null; then
    warn "remove authenticated INSERT policy on stripe_credit_fulfillments"
  fi
done

# Admin-only routes must carry @RequireAppRoles('admin'). Detect Nest
# controllers whose path includes "/admin/" but do not have the decorator.
admin_controllers=$(rg -l "@Controller\(['\"][^'\"]*admin" backend-ts/src 2>/dev/null || true)
for f in $admin_controllers; do
  if ! rg -q "@RequireAppRoles\(['\"]admin['\"]\)" "$f" 2>/dev/null; then
    warn "controller has /admin path but no @RequireAppRoles('admin'): $f"
  fi
done

# Helmet must be configured in main.ts.
if ! rg -q "helmet\(" backend-ts/src/main.ts 2>/dev/null; then
  warn "backend-ts/src/main.ts must call helmet() to set baseline security headers"
fi

# CORS must never use `origin: true` (reflective with credentials); ignore comments.
if rg -n "origin:\s*true" backend-ts/src --glob '*.ts' 2>/dev/null \
  | rg -v '^\S+:[0-9]+:\s*(/\*|//)' 2>/dev/null; then
  warn "backend-ts CORS must not use reflective 'origin: true' with credentials"
fi

# Cookie comparisons must use timingSafeStringEqual / timingSafeEqual when
# comparing CSRF / token hashes / shared secrets.
if rg -n "headerCsrf\s*!==\s*cookieCsrf" backend-ts/src --glob '*.ts' 2>/dev/null; then
  warn "CSRF compare must use timingSafeStringEqual (timing attack)"
fi

# Block PWA-side service role usage.
if rg -n "SUPABASE_SERVICE_ROLE_KEY" app-pwa --glob '!node_modules' 2>/dev/null; then
  warn "app-pwa must never reference SUPABASE_SERVICE_ROLE_KEY"
fi

# Direct exact-address SELECT from base tables in app-pwa (must go via *_public views).
if rg -n "from\(['\"]job_offers['\"]\)\.select\([^)]*location_address" app-pwa --glob '!node_modules' 2>/dev/null; then
  warn "app-pwa must read location_address via job_offers_public, not job_offers base table"
fi
if rg -n "from\(['\"]company_ads['\"]\)\.select\([^)]*street_address" app-pwa --glob '!node_modules' 2>/dev/null; then
  warn "app-pwa must read street_address via company_ads_public, not company_ads base table"
fi

# Stripe publishable key must not be a secret key in env examples / CI
if rg -n 'NUXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=sk_' app-pwa/.env.example .github 2>/dev/null; then
  warn "NUXT_PUBLIC_STRIPE_PUBLISHABLE_KEY must be pk_ (publishable), never sk_"
fi

if [ "$FAILED" -eq 1 ]; then
  echo "security-check failed"
  exit 1
fi

echo "security-check passed"

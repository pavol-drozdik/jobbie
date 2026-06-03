#!/usr/bin/env sh
# Lightweight grep-based guardrails for PRs. Exit 1 on forbidden patterns.
set -eu

ROOT="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"
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

# grant_credits RPC only from credits / payments services
if rg -n "rpc\\(['\"]grant_credits" backend-ts/src --glob '*.ts' 2>/dev/null \
  | rg -v 'credits\\.service\\.ts' 2>/dev/null; then
  warn "grant_credits RPC should only be invoked from CreditsService"
fi

# PWA must not upload directly to Supabase Storage
if rg -n '\.storage\.from\([^)]+\)\.upload' app-pwa --glob '!node_modules' 2>/dev/null; then
  warn "app-pwa must use Nest storage endpoints (useStorageUpload), not supabase.storage.upload"
fi

# After storage lockdown, do not re-add permissive client INSERT on public image buckets
if rg -l 'storage_upload_lockdown' supabase/migrations/*.sql 2>/dev/null | head -1 >/dev/null; then
  if rg -n 'job-photos: authenticated upload' supabase/migrations/*.sql 2>/dev/null; then
    warn "job-photos must not allow authenticated INSERT after storage_upload_lockdown migration"
  fi
  if rg -n 'profile-avatars: authenticated upload' supabase/migrations/*.sql 2>/dev/null; then
    warn "profile-avatars must not allow authenticated INSERT after storage_upload_lockdown migration"
  fi
else
  # Legacy: job-photos insert must scope to auth.uid() until lockdown ships
  if rg -n 'bucket_id = .job-photos' supabase/migrations/*.sql 2>/dev/null | head -1 >/dev/null; then
    if ! rg -n "job-photos: authenticated upload" supabase/migrations -A8 2>/dev/null | rg -q 'auth\.uid\(\)'; then
      warn "job-photos insert policy should require auth.uid() folder (or apply storage_upload_lockdown)"
    fi
  fi
fi

# chat-media lockdown migration must define MIME allowlist
if ! rg -n "chat-media" supabase/migrations/*storage_upload_lockdown*.sql 2>/dev/null | rg -q 'image/jpeg'; then
  warn "storage_upload_lockdown migration should set chat-media allowed_mime_types"
fi

# Client INSERT on stripe_credit_fulfillments
if rg -n 'authenticated_own_credit_fulfillments' supabase/migrations 2>/dev/null; then
  warn "remove authenticated INSERT policy on stripe_credit_fulfillments"
fi

# Admin-only routes must carry @RequireAppRoles('admin'). Detect Nest
# controllers whose path includes "/admin/" but do not have the decorator.
# (Heuristic — false positives are acceptable; fix or annotate.)
admin_controllers=$(rg -l "@Controller\(['\"][^'\"]*admin" backend-ts/src 2>/dev/null || true)
for f in $admin_controllers; do
  if ! rg -q "@RequireAppRoles\(['\"]admin['\"]\)" "$f" 2>/dev/null; then
    warn "controller has /admin path but no @RequireAppRoles('admin'): $f"
  fi
done

# Any handler whose code consults `user.appRole === 'admin'` must be decorated
# with @RequireAppRoles('admin') so AdminMfaGuard enforces AAL2.
for f in $(rg -l "appRole\s*===\s*'admin'" backend-ts/src 2>/dev/null || true); do
  if ! rg -q "@RequireAppRoles\(['\"]admin['\"]\)" "$f" 2>/dev/null; then
    warn "file references appRole === 'admin' but no @RequireAppRoles('admin'): $f"
  fi
done

# Helmet must be configured in main.ts.
if ! rg -q "helmet\(" backend-ts/src/main.ts 2>/dev/null; then
  warn "backend-ts/src/main.ts must call helmet() to set baseline security headers"
fi

# CORS must never use `origin: true` (reflective with credentials).
if rg -n "origin:\s*true" backend-ts/src --glob '*.ts' 2>/dev/null; then
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

if [ "$FAILED" -eq 1 ]; then
  echo "security-check failed"
  exit 1
fi

echo "security-check passed"

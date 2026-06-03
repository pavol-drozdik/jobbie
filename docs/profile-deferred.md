# Profile & settings — deferred scope

## Review eligibility

`POST /api/profiles/:id/reviews` currently returns **403** with code `REVIEW_NOT_ELIGIBLE` until rules are defined (e.g. completed job between reviewer and reviewee). Listing reviews and aggregated ratings on `GET /api/profiles/:id` are implemented.

## Avatar upload

Settings and API support **avatar URL** and **logo URL** only. Uploading to Supabase Storage (similar to job photos) is deferred.

## Account deletion

`POST /api/profiles/me/delete` is **implemented**. It soft-deletes the profile (PII scrub, `is_deleted`, `deleted_at`), deactivates job offers and job email alerts, hides CVs from employers, scrubs CV contact fields, removes newsletter consent, cancels Stripe subscription, revokes sessions, and bans the auth user with a dead email address. Hard delete of `auth.users` and full cascade of chat messages are not performed (FK and retention policy).

## Data export

`GET /api/profiles/me/export` returns a ZIP (`data.json` + `README.txt`) for GDPR portability. UI: `/nastavenia/export-udajov`.

## Push notifications

Web push (VAPID + service worker) is implemented. See [notifications.md](./notifications.md). Per-category `push` flags in `profiles.notification_preferences` gate delivery together with browser permission and `push_subscriptions`.

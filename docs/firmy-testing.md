# Firmy (company ads) — manual testing

Run the API (`backend-ts`) and PWA (`app-pwa`), apply migrations including `20260127000000_company_ads.sql` and `20260529120000_company_ads_structured_fields.sql` in Supabase.

## Happy path (create + browse)

1. User has `provider_role = true` and `credits >= 9` for a 3-month ad (or adjust duration).
2. Open **Profil**, enable **„Chcem aby ma klienti našli“** if needed.
3. **Firmy → Pridať reklamu**, complete sections (name, category, description, at least one service, location unless online-only).
4. **Zverejniť firmu** with duration slider (e.g. 3 months → 9 credits).
5. Expect: redirect to `/profesionali/:id`, credits decreased, ad visible on **Profesionáli** list (`GET /api/company-ads`).

## Draft

1. Submit **Uložiť koncept**. Expect **0** credits; ad not on public list until published via edit + publish or PATCH `publish: true`.

## Edit

1. Open own ad detail → **Upraviť reklamu** → `/moje-reklamy/:id` (legacy `/profesionali/:id/edit` redirects).
2. Change fields, save draft or publish draft.

## Insufficient credits

1. Set `profiles.credits` below required amount.
2. Try publish. Expect **403** and Slovak message.

## Privacy (public detail)

1. `show_exact_address = false`: detail shows city/region only, not street/PSČ.
2. `show_phone_publicly = false`: phone not on detail.
3. `show_email_publicly = false`: email not on detail.

## Browse

1. `GET /api/company-ads` — active ads with `ends_at > now()`.
2. Firmy index uses company ads (not profile search).
3. Filters: `category`, `q`, `location` query params.

## Automated tests

```bash
cd backend-ts && npm test -- company-ads-publish.validation.spec.ts
```

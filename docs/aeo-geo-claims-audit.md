# AEO/GEO claims audit

Audit of marketing claims and placeholder contact fields (2026-06-01). Items marked **fixed** were corrected in code; **deferred** need business/legal input.

| Claim / field | Location | Action |
|---------------|----------|--------|
| `+421 900 000` | `strings.ts` (`footerPhone`, `pricingSalesPhone`) | **Fixed** — hidden in footer until `NUXT_PUBLIC_SUPPORT_PHONE` is set |
| Generic `instagram.com/` / `facebook.com/` | `strings.ts` | **Fixed** — hidden until env URLs are verified |
| App Store / Play links | `HomeMarketingBlogFaqNewsletter.vue` | **Deferred** — design buttons restored; set `NUXT_PUBLIC_APP_STORE_URL` / `NUXT_PUBLIC_GOOGLE_PLAY_URL` when listings exist (no `href="#"`) |
| “24 hodín” brigáda claim | `home-design-faq.ts` | **Fixed** — softened to filter/alert guidance |
| “iOS/Android app” in FAQ | `home-design-faq.ts` | **Fixed** — clarified PWA / browser |
| Brand Jobbie vs JOBBIE | sitewide schema | **Fixed** — `alternateName` via env + Organization JSON-LD |
| Legal terms final text | `trust-page-content.ts` | **Deferred** — set `NUXT_PUBLIC_LEGAL_PUBLISHED=1` after counsel |
| Verified phone, ICO, legal entity | trust/contact pages | **Deferred** — env + content update |
| Real social profile URLs | footer | **Deferred** — env vars |
| Job URL slugs | `/ponuka/:id` | **Deferred** — needs backend `public_slug` |
| `Offer` schema with EUR prices | `/cennik` | **Deferred** — prices vary by catalog/stripe |
| VAT/refund FAQ answers | pricing FAQ | **Deferred** — link to terms when legal published |
| Native app store URLs | homepage | **Deferred** — only if native apps ship |

## Safe copy principles applied

- No invented credentials in `Person` schema (blog uses API author fields only).
- No `LocalBusiness` / NAP schema without verified address.
- Contact phone omitted from Organization JSON-LD when placeholder or unset.

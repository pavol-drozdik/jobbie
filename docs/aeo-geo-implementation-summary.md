# AEO/GEO implementation summary

Remaining work from the AEO/GEO plan (2026-06-01).

## Changed files (high level)

**Policy & config:** `utils/seo-route-policy.ts`, `utils/seo-config.ts`, `utils/brand-seo.ts`, `nuxt.config.ts`, `app-pwa/.env.example`, `docs/deployment.md`

**Content & routes:** `utils/public-faq.ts`, `utils/guide-page-content.ts`, `utils/pricing-page-copy.ts`, `pages/casto-kladene-otazky.vue`, `pages/navody/[slug].vue`, `pages/faq.vue` (301), guide/footer link updates

**SSR fetch:** `composables/fetch-public-blog-list.ts`, `composables/fetch-public-job-catalog.ts`; `pages/blog/index.vue`, `components/find/FindJobsCatalogPage.vue`

**Schema & SEO:** `utils/seo-json-ld.ts`, `composables/usePageSeo.ts`, `composables/useGlobalSiteSeo.ts`, trust/pricing/email-alert pages

**Claims cleanup:** `utils/home-design-faq.ts`, `components/home/HomeMarketingBlogFaqNewsletter.vue`, `components/AppSiteFooter.vue`

**Backend sitemap:** `backend-ts/src/seo/seo.service.ts` (legal removed from static list; guides + FAQ slug)

**Tests:** `utils/seo-route-policy.spec.ts`, `utils/seo-json-ld.spec.ts`

**Docs:** `docs/aeo-geo-claims-audit.md`, this file, `docs/changelog.md`

## Route indexability matrix

| Route | Index when `ALLOW_INDEXING=1` | Sitemap | SSR |
|-------|------------------------------|---------|-----|
| `/`, `/pracovne-ponuky`, `/cennik`, `/blog`, guides | yes | yes | yes |
| `/casto-kladene-otazky` | yes | yes | yes |
| `/faq` | no (301 → canonical) | no | yes |
| `/vseobecne-podmienky`, `/ochrana-osobnych-udajov` | only if `LEGAL_PUBLISHED=1` | same | yes |
| `/databaza-zivotopisov` | no | no | yes |
| `/ponuka/:id`, `/blog/:slug`, `/profesionali/:id` | yes | dynamic | yes |
| `/auth`, `/nastavenia`, `/chat`, `/app/*` | no | no | no |

## Structured data matrix

| Route | JSON-LD |
|-------|---------|
| Layout (global) | Organization, WebSite |
| `/casto-kladene-otazky` | FAQPage |
| `/cennik` | WebPage, FAQPage |
| `/blog/:slug` | BlogPosting, BreadcrumbList |
| `/ponuka/:id` | JobPosting, BreadcrumbList |
| `/o-nas` | AboutPage |
| `/kontakt` | ContactPage |
| `/bezpecnost` | WebPage |
| `/ponuky-na-email` | HowTo, FAQPage |
| `/profesionali/:id` | Service, BreadcrumbList |
| `/navody/*` | WebPage |

## Manual validation

```bash
# Robots (404 when indexing off)
curl -sI "https://jobbie.sk/robots.txt"

# Sitemap (404 when indexing off; XML when on + SITE_URL set)
curl -s "https://jobbie.sk/sitemap.xml" | head

# FAQ canonical + schema
curl -s "https://jobbie.sk/casto-kladene-otazky" | rg -i "FAQPage|canonical"

# Legal noindex until published
curl -s "https://jobbie.sk/vseobecne-podmienky" | rg -i "noindex"

# Job SSR
curl -s "https://jobbie.sk/ponuka/<job-id>" | rg -i "JobPosting"
```

External: [Google Rich Results Test](https://search.google.com/test/rich-results), Search Console URL inspection, schema validator.

## Deferred work

See [aeo-geo-claims-audit.md](./aeo-geo-claims-audit.md).

## Recommended tests

```bash
cd app-pwa && npm test -- utils/seo-route-policy.spec.ts utils/seo-json-ld.spec.ts
```

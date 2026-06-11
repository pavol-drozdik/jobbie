# AEO/GEO implementation summary

Last updated: 2026-06-11.

## Route indexability matrix

| Route | Index when `ALLOW_INDEXING=1` | Sitemap | SSR |
|-------|------------------------------|---------|-----|
| `/`, `/pracovne-ponuky`, `/cennik`, `/blog` | yes | yes | yes |
| `/profesionali` | yes | yes | yes (catalog SSR) |
| `/vseobecne-podmienky`, `/ochrana-osobnych-udajov` | only if `LEGAL_PUBLISHED=1` | same | yes |
| `/databaza-zivotopisov` | no | no | yes |
| `/ponuka/:id`, `/blog/:slug`, `/profesionali/:id` | yes | dynamic | yes |
| `/llms.txt`, `/feeds/*` | yes | yes (feeds) | Nitro only |
| `/auth`, `/nastavenia`, `/chat`, `/app/*` | no | no | no |

## Structured data matrix

| Route | JSON-LD |
|-------|---------|
| Layout (global) | Organization, WebSite |
| `/` | FAQPage (uchádzač FAQ) |
| `/pracovne-ponuky`, `/zahranicne-pracovne-ponuky` | ItemList (first page) |
| `/profesionali` | ItemList (first page) |
| `/cennik` | WebPage, FAQPage |
| `/blog/:slug` | BlogPosting, BreadcrumbList |
| `/ponuka/:id` | JobPosting (+ identifier, directApply), BreadcrumbList |
| `/ponuky-na-email` | HowTo, FAQPage |
| `/profesionali/:id` | Service, BreadcrumbList |
| `/bezpecnost` | WebPage |

## Syndication

| URL | Format |
|-----|--------|
| `/feeds/jobs.rss` | RSS 2.0 |
| `/feeds/jobs.json` | JSON Feed 1.1 |
| `/feeds/ads.rss` | RSS 2.0 |
| `/feeds/ads.json` | JSON Feed 1.1 |
| `/llms.txt` | Curated markdown index for LLM agents |

## Manual validation

```bash
curl -sI "https://jobbie.sk/llms.txt"
curl -s "https://jobbie.sk/feeds/jobs.json" | head
curl -s "https://jobbie.sk/" | rg -i "FAQPage|application/feed"
curl -s "https://jobbie.sk/pracovne-ponuky" | rg -i "ItemList|alternate"
```

See [seo-implementation.md](./seo-implementation.md) for full env matrix and GSC/Bing steps.

## Recommended tests

```bash
cd app-pwa && npm test -- utils/llms-txt.spec.ts utils/seo-json-ld.spec.ts server/utils/feed-rss-xml.spec.ts
cd backend-ts && npm test -- src/seo/seo-feed.service.spec.ts src/seo/indexnow.service.spec.ts
```

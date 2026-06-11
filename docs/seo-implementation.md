# SEO implementation (JOBBIE app-pwa)

Verification matrix and manual checks for production indexing. See also [frontend.md](./frontend.md#seo-production).

## Environment

| Variable | Build | Runtime | Purpose |
|----------|-------|---------|---------|
| `NUXT_PUBLIC_SITE_URL` | Yes | Yes | Canonical host (no trailing slash) |
| `NUXT_PUBLIC_ALLOW_INDEXING` | Yes | Yes | `1` enables SSR, sitemap, `index,follow` on public routes |
| `PUBLIC_APP_URL` | — | Yes (API) | Must match PWA host for emails/links |
| `NUXT_PUBLIC_GOOGLE_SITE_VERIFICATION` | Yes | Yes | Google Search Console meta verification |
| `NUXT_PUBLIC_BING_SITE_VERIFICATION` | Yes | Yes | Bing Webmaster Tools meta verification |
| `NUXT_PUBLIC_INDEXNOW_KEY` | Yes | Yes | Serves `/{key}.txt` on PWA; pair with `INDEXNOW_KEY` on API |
| `INDEXNOW_KEY` | — | Yes (API) | IndexNow ping on job/ad publish |

## Route indexability matrix

| Route | Index | Sitemap | SSR |
|-------|-------|---------|-----|
| `/` | yes | yes | yes |
| `/pracovne-ponuky`, `/zahranicne-pracovne-ponuky` | yes* | yes | yes |
| `/ponuka/:id` | yes | dynamic jobs | yes |
| `/profesionali`, `/profesionali/:id` | yes | yes + ads | yes |
| `/blog`, `/blog/:slug` | yes | yes + posts | yes |
| `/profil/:uuid` | yes** | no | yes |
| `/cennik`, trust/legal pages | yes | yes | yes |
| `/ponuky-na-email` | yes | yes | yes |
| `/ponuky-na-email/*` (edit, token) | no | no | no |
| `/databaza-zivotopisov` | no | no | yes |
| `/profil` (hub) | no | no | no |
| `/auth`, `/nastavenia`, `/chat`, `/app/*` | no | no | no |
| `/llms.txt` | yes | no | Nitro plain text |
| `/feeds/jobs.rss`, `/feeds/jobs.json` | yes | yes (static paths) | Nitro syndication |
| `/feeds/ads.rss`, `/feeds/ads.json` | yes | yes (static paths) | Nitro syndication |

\* Catalog with non-whitelist facets (`sort`, salary sliders, etc.) uses `noindex, follow` via `usePageSeo`. Canonical keeps `q`, `category`, `location` only; `page` and `cursor` are excluded.

\** Profile 404 or disabled public profile → `noindex`.

Policy source: [`app-pwa/utils/seo-route-policy.ts`](../app-pwa/utils/seo-route-policy.ts).

## Automatic detail-page SEO

Job, blog, and professional **detail** pages use one pipeline — when API data loads (SSR or client), meta and JSON-LD update automatically:

| Content | Page composable | Index rule | Structured data |
|---------|-----------------|------------|-----------------|
| `/ponuka/:id` | `useJobDetailSeo(job)` | Active, non-draft jobs only | `JobPosting` + breadcrumbs |
| `/blog/:slug` | `useBlogPostDetailSeo(post)` | Always indexable when published | `BlogPosting` + breadcrumbs |
| `/profesionali/:id` | `useProfessionalAdDetailSeo(ad)` | `status === active` only | `Service` + breadcrumbs |

Core: [`utils/public-content-seo.ts`](../app-pwa/utils/public-content-seo.ts) (`buildPublicDetailSeoPayload`, rich meta descriptions). Wired via [`composables/usePublicContentSeo.ts`](../app-pwa/composables/usePublicContentSeo.ts) on job, blog, and professional detail pages (meta + JSON-LD only; no on-page breadcrumb/AEO blocks).

## AEO / syndication (2026-06-11)

| Asset | Source |
|-------|--------|
| `/llms.txt` | [`app-pwa/server/routes/llms.txt.get.ts`](../app-pwa/server/routes/llms.txt.get.ts), [`utils/llms-txt.ts`](../app-pwa/utils/llms-txt.ts) |
| Job/ad RSS + JSON Feed | Nitro `/feeds/*` → `GET /api/seo/feeds/jobs|ads` |
| Homepage `FAQPage` | [`pages/index.vue`](../app-pwa/pages/index.vue) + `buildFaqPageJsonLd` |
| Catalog `ItemList` | Job catalog + `/profesionali` first SSR page |
| IndexNow | [`backend-ts/src/seo/indexnow.service.ts`](../backend-ts/src/seo/indexnow.service.ts) on publish |

`robots.txt` includes `# LLMs: {siteUrl}/llms.txt`. Catalog/home pages emit `<link rel="alternate">` for feeds via `usePageSeo.alternateFeeds`.

### Search Console / Bing onboarding

1. Set `NUXT_PUBLIC_ALLOW_INDEXING=1` and `NUXT_PUBLIC_SITE_URL`.
2. Add property in [Google Search Console](https://search.google.com/search-console); paste token into `NUXT_PUBLIC_GOOGLE_SITE_VERIFICATION`.
3. Add site in [Bing Webmaster Tools](https://www.bing.com/webmasters); paste token into `NUXT_PUBLIC_BING_SITE_VERIFICATION`.
4. Generate a UUID for IndexNow; set `NUXT_PUBLIC_INDEXNOW_KEY` and `INDEXNOW_KEY` to the same value.
5. Submit `https://{host}/sitemap.xml` in both consoles.
6. Verify: `curl -s https://{host}/llms.txt`, `curl -sI https://{host}/feeds/jobs.rss`, `curl -s https://{host}/{INDEXNOW_KEY}.txt`.

## Changed files (completion pass)

- `app-pwa/utils/seo-route-policy.ts`, `find-catalog-seo.ts`
- `app-pwa/composables/usePageSeo.ts`, `fetch-public-profile.ts`, `fetch-public-blog-post.ts`, `fetch-public-company-ad.ts`
- `app-pwa/components/find/FindJobsCatalogPage.vue` (pagination, canonical, `NuxtImg`)
- `app-pwa/pages/ponuka/[id].vue`, `blog/[slug].vue`, `profil/[userId].vue`, `profesionali/[id].vue`
- `backend-ts/src/search/search.dto.ts`, `search-cursor.ts`, `seo/seo.service.ts`
- Tests: `seo-config.spec.ts`, `seo-json-ld.spec.ts`, `server/utils/sitemap-xml.spec.ts`

## Manual curl checks

Indexing **off** (default dev):

```bash
curl -s http://localhost:3001/robots.txt
curl -I http://localhost:3001/pracovne-ponuky
curl -I http://localhost:3001/sitemap.xml
```

Indexing **on** (production build):

```bash
set NUXT_PUBLIC_ALLOW_INDEXING=1
set NUXT_PUBLIC_SITE_URL=https://your-domain.test
cd app-pwa && npm run build && npm run preview
curl -s http://localhost:3000/robots.txt
curl -s http://localhost:3000/sitemap.xml
curl -s http://localhost:3000/ponuka/<job-uuid> | findstr /i "canonical JobPosting"
curl -s http://localhost:3000/blog/<slug> | findstr /i "<title>"
curl -I http://localhost:3000/nastavenia | findstr /i robots
curl -I http://localhost:3000/databaza-zivotopisov | findstr /i robots
```

## External tools

- [Google Rich Results Test](https://search.google.com/test/rich-results) — job detail, blog, FAQ
- [Schema Markup Validator](https://validator.schema.org/)
- Google Search Console / Bing — submit sitemap URL
- Lighthouse mobile — `/`, `/ponuka/:id`

## Automated tests

```bash
cd app-pwa && npm run test
```

- `utils/seo-config.spec.ts` — env parsing, route policy, catalog canonical
- `utils/seo-json-ld.spec.ts` — JobPosting salary/HTML
- `server/utils/sitemap-xml.spec.ts` — XML escaping

## Pagination

- Search API: optional `page` (1-based) on `GET /api/search?entity=jobs&page=N`
- Catalog: `?page=N` replaces list (crawler); infinite scroll uses `cursor` when `page` is absent
- `rel=prev` / `rel=next` emitted from `usePageSeo` pagination links on catalog

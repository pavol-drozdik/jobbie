# Frontend performance (app-pwa)

Runbook for measuring, budgeting, and regressing PWA bundle and runtime performance.

## Quick commands

```bash
cd app-pwa
npm run test              # Vitest (includes api-get-dedup)
npm run build:analyze     # Production build + stats/bundle-stats.html
npm run dev
```

## Bundle analysis

- Script: `npm run build:analyze` sets `ANALYZE=1` and writes `app-pwa/stats/bundle-stats.html` via `rollup-plugin-visualizer`.
- `stats/` is gitignored; CI uploads the HTML as an artifact on PRs.

## Baseline (2026-06-02, pre full implementation pass)

Captured from `npm run build:analyze` on Windows dev machine:

| Metric | Value |
|--------|-------|
| PWA precache entries | 204 |
| PWA precache total | ~52.3 MB (53 275 KiB) |
| Largest JS chunk (raw / gzip) | ~726 KB / ~233 KB |
| Second JS chunk (raw / gzip) | ~362 KB / ~116 KB |
| Entry CSS (raw / gzip) | ~165 KB / ~28 KB |
| Service worker | ~18 KB gzip |
| pdf.worker (separate) | ~2.2 MB (excluded from precache after Phase 13) |

## After implementation (2026-06-02)

| Change | Expected effect |
|--------|-----------------|
| Lazy TipTap (`AppRichTextEditorLazy`), lazy Sentry, deferred socket.io | Smaller initial JS; faster TTI on home and auth routes |
| GET in-flight dedup (`useApi`) + notification refresh dedup | Fewer duplicate parallel GETs on navigation |
| API-trust HTML display (no client DOMPurify on public job/blog) | Drops `isomorphic-dompurify` from public detail chunks |
| Chat: 50-msg initial window, DOM segment cap, lazy media hydrate | Lower memory and layout cost in long threads |
| Catalog impression batching + `content-visibility` on cards | Less main-thread work during scroll |
| PWA precache cap 5 MB + hero/pdf.worker ignores | Smaller offline install payload |
| Employer hub pagination (50/page) | Bounded list fetch and render |
| `prefers-reduced-motion` global CSS | Respects OS motion preference |

Re-run `npm run build:analyze` after deploy to fill the **After** column with fresh numbers.

**Measured after full implementation (same machine, 2026-06-02):**

| Metric | Value |
|--------|-------|
| PWA precache entries | 205 |
| PWA precache total | ~9.7 MB (9 968 KiB) |
| Large marketing mockups | Excluded via `globIgnores` (not offline-precached) |

## Bundle budgets (soft)

CI workflow `.github/workflows/pwa-bundle-budget.yml` warns (does not fail) when:

- Any single emitted JS asset under `.output/public/_nuxt/` exceeds **800 KB** raw, or
- Total precache manifest size reported by `@vite-pwa/nuxt` exceeds **45 MB**.

Adjust thresholds in the workflow when intentional bundle growth is merged.

## Runtime patterns

| Area | Implementation |
|------|----------------|
| Analytics | PostHog dynamic import after consent |
| Homepage realtime | `useJobsFeedSocket` — IO deferred until latest-jobs section visible or idle |
| Notifications | 45s nav TTL + in-flight dedup on `refresh()` |
| Public HTML | `sanitizeForDisplayFromApi` on Nest-sanitized DTOs; DOMPurify lazy for editor save only |
| Chat | `ensureMessageMediaLoaded` via IntersectionObserver in `MessageBubble` |
| Images | `@nuxt/image` WebP on home, job detail gallery, profile avatars, catalog cards |

## Related docs

- [scalability.md](./scalability.md) — pagination, cache, search
- [frontend.md](./frontend.md) — PWA structure and feature entry points
- [SECURITY.md](./SECURITY.md) — sanitization must remain on Nest persist paths

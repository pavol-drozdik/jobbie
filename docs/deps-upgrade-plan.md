# Dependency upgrade plan

Tracking doc for follow-on dedicated PRs identified by the 2026-06 security
audit. Each upgrade is a self-contained PR with its own regression suite —
they are not part of the audit remediation merge so the surface area stays
small and reviewable.

## Stripe SDK 14 → 22

**Status (2026-06-15):** Upgraded to `stripe@22.2.1` with `apiVersion: 2026-05-27.dahlia`.
Compat helpers live in `backend-ts/src/payments/stripe-api-compat.ts` and types in
`stripe-types.ts`. Replay webhook fixtures and smoke-test checkout after deploy.

## Stripe SDK 14 → 18 (superseded)

**Current:** `stripe@^14.25.0` (`backend-ts/package.json`).
**Target:** `stripe@^18`.
**Risk:** Major-version bumps include changed TypeScript types, deprecated
`PaymentIntent.charges`, removed Custom Connect APIs we don't use, and new
required fields on a few `customer.update` payloads.

**Migration steps:**
1. Add `stripe` to a feature branch: `npm i stripe@^18 -w backend-ts`.
2. Bump `apiVersion` pin in
   [`backend-ts/src/payments/stripe.service.ts`](../backend-ts/src/payments/stripe.service.ts)
   to the version supported by the new major (e.g. `'2024-12-18.acacia'`).
3. Fix any TS errors that surface — particularly around `PaymentIntent` and
   `Invoice` retrievals where the new SDK returns Iterable instead of arrays
   in a few places.
4. Replay a full webhook fixture set against the new SDK (`payment_intent.succeeded`,
   `checkout.session.completed`, `charge.refunded`, `invoice.paid`,
   `customer.subscription.*`).
5. Smoke test the customer portal redirect (if/when added).

## file-type 16 → 21

**Current:** `file-type@^16.5.4` (CommonJS, last CommonJS major).
**Target:** `file-type@^21` (ESM only).
**Risk:** `file-type` v17+ ships ESM only; Nest's CommonJS build cannot
`require()` it directly. We must either:
- Convert `backend-ts` to ESM (`"type": "module"` + `moduleResolution: "node16"`)
  — invasive, affects every `.ts` file with relative imports.
- Use a dynamic `import('file-type')` inside `file-sniff.util.ts` (works in
  CommonJS but every call site must `await` the dynamic import).
- Stay on the CommonJS 16.x major and lean on Snyk advisories to flag any
  CVEs against that line (lowest risk, simplest).

**Recommendation:** stay on `file-type@^16` for now; revisit once `backend-ts`
moves to ESM as part of a broader Nest 11 upgrade.

## NestJS 10 → 11

**Current:** `@nestjs/common@^10.0.0`, `@nestjs/core@^10.0.0`.
**Target:** `^11`.
**Risk:** Nest 11 requires Node 18.18+ (already required), introduces stricter
`@nestjs/throttler` config, and changes `WsAdapter`/`IoAdapter` lifecycle. All
guards and pipes used in this codebase are compatible. Schedule alongside the
Stripe upgrade.

## Playwright

**Current:** `playwright@^1.51.0` in `backend-ts/dependencies`.
**Usage:** One file —
[`backend-ts/src/cv/cv-html-pdf.renderer.ts`](../backend-ts/src/cv/cv-html-pdf.renderer.ts)
— uses `chromium.launch` to render CV HTML to PDF.
**Risk:** Bundles a ~300MB Chromium per Node container, slows cold-start, and
each Chromium minor is a fresh supply-chain decision.

**Migration options:**
1. Move PDF rendering to a dedicated worker / sidecar (e.g. Browserless / Gotenberg)
   and call it over HTTP from `CvHtmlPdfRenderer`. Removes Chromium from the
   API image entirely.
2. Replace Playwright with `puppeteer-core` and an external Chromium binary
   shipped only on the PDF-rendering replica set.
3. Switch to a pure-Node renderer (e.g. `playwright`-less HTML → PDF via
   `@react-pdf/renderer`) — biggest code change but smallest dep.

**Recommendation:** option 1 for production; until then keep Playwright pinned
to the latest 1.x and rely on `dependabot` to surface CVEs.

## Tracking

Each upgrade should land as its own PR titled `deps(<package>): upgrade …` and
must include:
- Updated `apiVersion` pins where applicable.
- Regression test run notes.
- A `docs/changelog.md` entry under `Security` and/or `Changed`.

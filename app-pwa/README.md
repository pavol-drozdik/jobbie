# JOBBIE PWA

Vue/Nuxt 3 PWA frontend for JOBBIE. Works in the browser as a Progressive Web App and can be wrapped with Capacitor for iOS/Android.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Copy environment variables:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and set:
   - `NUXT_PUBLIC_API_BASE_URL` – backend API (e.g. `http://localhost:8000`)
   - `NUXT_PUBLIC_SUPABASE_URL` – Supabase project URL
   - `NUXT_PUBLIC_SUPABASE_ANON_KEY` – Supabase anon key
   - `NUXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` – Stripe publishable key (for buy-credits)

## Development

```bash
npm run dev
```

Open http://localhost:3001 (see `devServer.port` in `nuxt.config.ts`). Ensure the backend (`backend-ts`) is running on the port set in `NUXT_PUBLIC_API_BASE_URL` (default `http://localhost:8000`). Vite proxies `/api` and `/socket.io` to that origin in dev.

## Build

```bash
npm run build
```

For static export (used by Capacitor):

```bash
npm run generate
```

Output is in `.output/public`.

## PWA

The app is a PWA (manifest + service worker via `@vite-pwa/nuxt`). For production, serve over HTTPS. Brand assets live in `public/` (`favicon.svg`, `jobbielogo.svg`, PNG icons). Regenerate PNG install icons from the favicon SVG with `npm run icons:generate` (requires `backend-ts` dependencies / `sharp`).

## Capacitor (native iOS/Android)

1. Build the PWA:
   ```bash
   npm run generate
   ```

2. Add platforms (once per machine):
   ```bash
   npx cap add ios
   npx cap add android
   ```

3. Sync and open:
   ```bash
   npx cap sync
   npx cap open ios
   # or
   npx cap open android
   ```

Or use the convenience script (builds then syncs):

```bash
npm run cap:sync
npm run cap:ios
# or npm run cap:android
```

- **Supabase Auth in Capacitor**: In the Supabase dashboard, add your app’s URL scheme (e.g. `com.jobbie.app://`) to Redirect URLs so OAuth and email confirmation work in the native app.
- **Stripe**: Payment Element and Checkout work in the WebView; set return URLs to your app scheme or a hosted page that redirects back.

## Project structure

- `pages/` – routes (auth, app tabs, job detail, chat, plans, buy-credits)
- `layouts/` – default and app (with bottom nav)
- `composables/` – useAuth, useApi, useRegistration, useChatSocket
- `plugins/` – Supabase client, auth state init
- `middleware/` – auth (redirect to login for `/app/*`)

FROM node:22-bookworm-slim AS deps
WORKDIR /app/backend-ts
COPY backend-ts/package.json backend-ts/package-lock.json ./
# CI arm64 QEMU builds can hit transient npm registry resets — retry with backoff.
RUN npm config set fetch-retries 5 \
  && npm config set fetch-retry-mintimeout 20000 \
  && npm config set fetch-retry-maxtimeout 120000 \
  && for attempt in 1 2 3 4 5; do \
       npm ci && exit 0; \
       echo "npm ci failed (attempt ${attempt}/5), retrying..." >&2; \
       sleep $((attempt * 15)); \
     done; \
     exit 1

FROM node:22-bookworm-slim AS build
WORKDIR /app/backend-ts
COPY --from=deps /app/backend-ts/node_modules ./node_modules
COPY backend-ts/ ./
RUN npm run build

FROM node:22-bookworm-slim AS prod-deps
WORKDIR /app/backend-ts
COPY backend-ts/package.json backend-ts/package-lock.json ./
RUN npm config set fetch-retries 5 \
  && npm config set fetch-retry-mintimeout 20000 \
  && npm config set fetch-retry-maxtimeout 120000 \
  && for attempt in 1 2 3 4 5; do \
       npm ci --omit=dev && npm cache clean --force && exit 0; \
       echo "npm ci --omit=dev failed (attempt ${attempt}/5), retrying..." >&2; \
       sleep $((attempt * 15)); \
     done; \
     exit 1

FROM node:22-bookworm-slim AS runtime
WORKDIR /app/backend-ts
ENV NODE_ENV=production
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates tini \
  && rm -rf /var/lib/apt/lists/* \
  && groupadd --system jobbie \
  && useradd --system --gid jobbie --home-dir /app/backend-ts --shell /usr/sbin/nologin jobbie

COPY --from=prod-deps --chown=jobbie:jobbie /app/backend-ts/node_modules ./node_modules
COPY --from=build --chown=jobbie:jobbie /app/backend-ts/dist ./dist
COPY --from=build --chown=jobbie:jobbie /app/backend-ts/package.json ./package.json
RUN npx playwright install --with-deps chromium-headless-shell \
  && chown -R jobbie:jobbie /ms-playwright \
  && rm -rf /var/lib/apt/lists/*

USER jobbie
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:8000/health',r=>{r.resume();process.exit(r.statusCode===200?0:1)}).on('error',()=>process.exit(1))"

ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", "dist/main.js"]

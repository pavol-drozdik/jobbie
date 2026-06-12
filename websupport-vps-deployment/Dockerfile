FROM node:22-bookworm-slim AS deps
WORKDIR /app/backend-ts
COPY backend-ts/package.json backend-ts/package-lock.json ./
RUN npm ci

FROM node:22-bookworm-slim AS build
WORKDIR /app/backend-ts
COPY --from=deps /app/backend-ts/node_modules ./node_modules
COPY backend-ts/ ./
RUN npm run build

FROM node:22-bookworm-slim AS prod-deps
WORKDIR /app/backend-ts
COPY backend-ts/package.json backend-ts/package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

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
  CMD node -e "fetch('http://127.0.0.1:8000/health').then((r)=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", "dist/main.js"]

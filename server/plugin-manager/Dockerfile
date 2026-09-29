# =============================================================================
# Ugondu Plugin Manager — Sandboxed Plugin Execution Engine
# Air Roofers Ltd — Ujomor Systems Engineering Authority
# Classification: COMMERCIAL | INTERNAL
# =============================================================================
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --frozen-lockfile
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# =============================================================================
FROM node:20-alpine AS runtime

RUN addgroup -S ugondu && adduser -S ugondu -G ugondu
WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production --frozen-lockfile && \
    npm cache clean --force

COPY --from=builder /app/dist ./dist

# [en] Copy plugins directory so the manager can discover them at runtime
COPY --chown=ugondu:ugondu plugins /app/plugins

USER ugondu
ENV PORT=4003
ENV PLUGINS_DIR=/app/plugins
EXPOSE 4003

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -qO- http://localhost:4003/ || exit 1

CMD ["node", "dist/index.js"]

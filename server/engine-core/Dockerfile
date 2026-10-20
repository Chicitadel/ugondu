# Stage 1: Build
FROM node:20-alpine@sha256:fb4cd12c85ee03686f6af5362a0b0d56d50c58a04632e6c0fb8363f609372293 AS builder

WORKDIR /usr/src/app

# Copy root configurations
COPY package*.json ./
COPY tsconfig*.json ./

# Copy all workspaces
COPY server/ ./server/

# Install all dependencies (including dev)
RUN npm ci

# Build the workspaces
RUN npm run build

# Stage 2: Production
FROM node:20-alpine@sha256:fb4cd12c85ee03686f6af5362a0b0d56d50c58a04632e6c0fb8363f609372293 AS runner

WORKDIR /usr/src/app

# Set production environment
ENV NODE_ENV=production

RUN mkdir -p /usr/src/app/server/data && chown -R node:node /usr/src/app/server/data

# Switch to non-root user
USER node

# Copy necessary files from builder stage
COPY --chown=node:node package*.json ./
COPY --chown=node:node --from=builder /usr/src/app/node_modules ./node_modules
COPY --chown=node:node --from=builder /usr/src/app/server ./server

# Expose standard port
ENV PORT=4001
EXPOSE 4001

HEALTHCHECK --interval=5s --timeout=3s --start-period=15s --retries=5 \
    CMD wget -qO- http://127.0.0.1:4001/health/ready || exit 1

# Start engine core
CMD ["npm", "run", "start:engine"]

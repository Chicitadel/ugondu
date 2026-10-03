# Stage 1: Build
FROM node:20-alpine AS builder

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
FROM node:20-alpine AS runner

WORKDIR /usr/src/app

# Set production environment
ENV NODE_ENV=production

# Switch to non-root user
USER node

# Copy necessary files from builder stage
COPY --chown=node:node package*.json ./
COPY --chown=node:node --from=builder /usr/src/app/node_modules ./node_modules
COPY --chown=node:node --from=builder /usr/src/app/server ./server

# Expose standard port
EXPOSE 3000

# Start engine core
CMD ["npm", "run", "start:engine"]

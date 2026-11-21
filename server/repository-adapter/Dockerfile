# /******************************************************************************
#  * Project        : Ugondu — Universal Delivery Operating System
#  * Module         : Repository Adapter
#  * File           : Dockerfile
#  * Version        : 2.0.0
#  * Author         : Ujomor Systems Engineering & Governance Authority
#  * Organization   : Air Roofers SASU / Ujomor Systems
#  * Created Date   : 2026-10-18
#  * Last Modified  : 2026-10-20
#  * Classification : COMMERCIAL | INTERNAL
#  *
#  * Governance:
#  * - Corporate Policy Governed
#  * - Security Reviewed
#  * - Architecture Controlled
#  * - Protocol Frozen
#  * - Modularization Enforced
#  *
#  * Standards:
#  * - ISO 27001 / SOC 2 / OWASP ASVS / NIST SP 800-53
#  *
#  * Signatures:
#  * - Architecture Authority : Ujomor Systems Engineering
#  * - Security Authority     : Ujomor Systems Governance
#  * - Governance Authority   : Air Roofers Corporate Governance
#  *
#  * Copyright (c) 2026 Air Roofers SASU. All Rights Reserved.
#  ******************************************************************************/

# Stage 1: Build
FROM node:20-alpine@sha256:fb4cd12c85ee03686f6af5362a0b0d56d50c58a04632e6c0fb8363f609372293 AS builder

WORKDIR /usr/src/app

COPY package*.json ./
COPY tsconfig*.json ./
COPY .governance/ ./.governance/
COPY config/ ./config/
COPY server/ ./server/

RUN npm ci
RUN npm run build

# Stage 2: Production
FROM node:20-alpine@sha256:fb4cd12c85ee03686f6af5362a0b0d56d50c58a04632e6c0fb8363f609372293 AS runner

WORKDIR /usr/src/app
ENV NODE_ENV=production

COPY --chown=node:node package*.json ./
COPY --chown=node:node .governance/ ./.governance/
COPY --chown=node:node config/ ./config/
COPY --chown=node:node --from=builder /usr/src/app/node_modules ./node_modules
COPY --chown=node:node --from=builder /usr/src/app/server ./server

RUN mkdir -p /usr/src/app/server/data && chown -R node:node /usr/src/app

USER node

ENV PORT=4005
EXPOSE 4005

HEALTHCHECK --interval=5s --timeout=3s --start-period=15s --retries=5 \
    CMD wget -qO- http://127.0.0.1:4005/health/ready || exit 1

CMD ["npm", "run", "start:repo"]

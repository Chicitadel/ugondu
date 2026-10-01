/******************************************************************************
 * Project        : Ugondu
 * Module         : Server / Billing Gateway
 * File           : README.md
 * Classification : COMMERCIAL | INTERNAL
 *
 * Governance:
 * - AI Governed
 * - Security Reviewed
 * - Architecture Controlled
 * - Protocol Frozen
 * - Modularization Enforced
 *
 * Copyright (c) 2026 Air Roofers Ltd
 * All Rights Reserved.
 ******************************************************************************/

# Ugondu Billing Gateway

## Purpose
The Billing Gateway serves as the token-based billing authorization service for Ugondu.

## API
- **Endpoint**: `POST /v1/authorize`
- **Request**: `{ "token": "string" }`
- **Response**: `{ "authorized": boolean, "edition": "string", "tenantId": "string" }`

## Token Prefix Format
- `ugp_`: Professional
- `uge_`: Enterprise

## Edition Plugin Quota Matrix
| Edition | Quota |
|---|---|
| Community | 1 active plugin |
| Professional | 5 active plugins |
| Enterprise | Unlimited |

## CORS Policy
Access is strictly restricted to origins defined in the following environment variables:
- `ENGINE_CORE_ORIGIN`
- `ADMIN_ORIGIN`

## Environment Variables
The following environment variables are required:
- `ENGINE_CORE_ORIGIN`: Allowed origin for Engine Core.
- `ADMIN_ORIGIN`: Allowed origin for the Admin UI.
- `PORT`: Port to run the service on.

## Local Development
Run the service locally:
```bash
npm start
```

## Test Seeding
- Seed data for tests can be found in `src/test/seeder.ts`.
- **WARNING**: `src/test/seeder.ts` must **NEVER** be imported in production.

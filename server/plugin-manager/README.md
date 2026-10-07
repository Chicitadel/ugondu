/******************************************************************************
 * Project        : Ugondu
 * Module         : Server / Plugin Manager
 * File           : README.md
 * Classification : COMMERCIAL | INTERNAL
 *
 * Governance:
  * - Security Reviewed
 * - Architecture Controlled
 * - Protocol Frozen
 * - Modularization Enforced
 *
 * Copyright (c) 2026 Air Roofers Ltd
 * All Rights Reserved.
 ******************************************************************************/

# Ugondu Plugin Manager

## Purpose
The Plugin Manager is responsible for isolated plugin lifecycle management using a container sandbox.

## Plugin Manifest Schema v2
The plugin manifest requires the following fields:
- `name`
- `version`
- `entrypoint`
- `permissions[]`
- `publisher`
- `signature`

## Plugin Lifecycle States
Plugins transition through the following states:
`INSTALL` → `ACTIVATE` → `SUSPEND` → `DEACTIVATE`

## Sandbox Configuration
Plugins are executed within isolated Docker containers using the following flags:
`--rm --init --read-only --network=none --cap-drop=ALL --security-opt=seccomp=default --pids-limit=64`

## Edition Quotas
Matches the Billing Gateway quotas:
- Community: 1 active plugin
- Professional: 5 active plugins
- Enterprise: Unlimited

## CORS Policy
Access is restricted strictly to the `engine-core` origin.

## API
- `POST /v1/provision`
- `POST /v1/deprovision`

## Security
Publisher signature verification is performed via **Ed25519**.


<!--
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Docs / Security
 * File           : git-secret-remediation.md
 * Version        : 1.0.0
 * Author         : Security Authority
 * Organization   : Air Roofers Ltd
 * Created Date   : 2026-10-01
 * Last Modified  : 2026-10-01
 * Classification : ENTERPRISE | INTERNAL
 *
 * Standards: ISO 27001, SOC 2, OWASP ASVS 5.0, NIST SP 800-53
 * Copyright (c) 2026 Air Roofers Ltd. All Rights Reserved.
-->

# Git History Remediation Procedure

## 1. Secret Exposure Inventory
The following files were confirmed to contain historical private key material committed before Phase 3:
- `server/engine-core/keys/ed25519_private.pem`
- Any `*_private.pem` files previously committed in test or core directories.

## 2. Confirm Revocation Status
Ensure all exposed v1 keys have been explicitly revoked in the Trust Registry. You can verify this by calling:
`globalTrustRegistry.validateKeyStatus('key_recipe_v1')` and ensuring it throws a `REVOKED` error.

## 3. Tool Prerequisites
Use `git-filter-repo` (preferred over BFG).
Install using: `pip install git-filter-repo`

## 4. Filter-repo Command Sequence
To purge the known private key file paths from the entire repository history, execute:
```bash
git filter-repo --invert-paths --path server/engine-core/keys/ed25519_private.pem --path-glob '**/*_private.pem'
```

## 5. Verification Commands
Verify that no private keys remain in the history:
```bash
git log --all --full-history -- '**/*_private.pem'
```
This command must return empty.

## 6. Force-push Sequence
Push the purged history to the remote repository. This will overwrite all branches, tags, and refs:
```bash
git push origin --force --all
git push origin --force --tags
```

## 7. Coordinator Re-clone Steps
Every developer and CI runner must delete their local repository and clone from scratch:
```bash
rm -rf ugondu
git clone https://github.com/Chicitadel/ugondu.git
```

## 8. GitHub Cache Flush
Contact GitHub Support to request a cache invalidation for secret scanning, referencing the recent purge.

## 9. Post-purge Key Rotation
Rotate all replacement authorities again after the purge to ensure complete invalidation of any previously exposed material.

## 10. Validation Evidence
Capture signed evidence of the git purge, the empty git log output, and the successful trust registry revocation check. Store this evidence in the compliance audit trail.

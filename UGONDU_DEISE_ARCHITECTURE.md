# UGONDU: Deployment Environment Integrity & Self-Healing Engine (DEISE)

## Overview
Ugondu fundamentally alters the traditional "blind upload" paradigm by injecting an intelligent self-healing evaluation step—**DEISE**. Before executing any changes against a target environment (e.g., cPanel, DirectAdmin, Cloud, VPS), Ugondu models an **Environment Twin**. This allows the engine to autonomously differentiate between broken *applications* and broken *topologies*.

## The Core Concept: Twin Modeling & Drift Analysis
Instead of assuming a target directory (`public_html`) is ready for content replacement, DEISE strictly maps four categories of drift:

1. **PAYLOAD_DRIFT**: The application files differ (e.g., `sha256(source) != sha256(target)`).
2. **TOPOLOGY_DRIFT**: Files are intact, but deployment structures (symlinks, `current` pointers) are disconnected.
3. **ENVIRONMENT_DRIFT**: The host itself has changed (e.g., cPanel migrated to DirectAdmin, document roots relocated).
4. **RUNTIME_DRIFT**: Execution environments are broken (e.g., missing PHP extensions, database access denied).

## The DirectAdmin Incident Resolution
During your cPanel to DirectAdmin migration, the deployment symlink chains were disrupted. A conventional deployment tool would interpret the broken `public_html` as an empty target and initiate a destructive synchronization, discarding the intact application binaries stored in `releases/`.

Under DEISE:
1. **Discover**: Ugondu scans the target and constructs the `EnvironmentTwin`.
2. **Diagnose**: DEISE evaluates the twin, finding the `releases/release_XYZ` completely intact (`integrityStatus: VALID`). However, the `current` symlink and the `public_html` topology points to unknown physical directories.
3. **Classify**: DEISE flags this as **`TOPOLOGY_DRIFT`** and **`ENVIRONMENT_DRIFT`**, but NOT `PAYLOAD_DRIFT`.
4. **Protect**: DEISE fires a "Do No Harm" invariant, explicitly blocking the engine from utilizing destructive `--delete` synchronizations since the environment topology is unknown.
5. **Repair**: DEISE generates a repair plan focused *exclusively* on re-linking the physical webroot topology to the intact release, entirely skipping an unnecessary upload process.

## Architectural Invariants Added
- Ugondu shall **never overwrite or delete production content** solely because the target topology is misconfigured.
- Ugondu shall differentiate application payload corruption from deployment topology corruption.
- Ugondu shall attempt structural repair before resorting to application re-upload if valid artifacts exist on the target.
- File size equality is demoted to a cheap heuristic; deterministic integrity requires SHA-256 validation.

## Status
- **Implementation**: The DEISE subsystem has been integrated into `server/engine-core/src/deise`.
- **Verification**: Dedicated test suites (COR-31) successfully simulate the DirectAdmin failure and confirm that DEISE safely protects the deployment from blindly executing overwrites.

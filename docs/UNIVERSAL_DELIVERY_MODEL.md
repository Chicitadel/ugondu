# Ugondu Universal Delivery Model

**Version:** 3.0.0
**Status:** ARCHITECTURAL MANDATE

## 1. Core Principle

Ugondu is a **provider-neutral Universal Delivery Orchestrator**, not merely a "GitHub deployment tool." 

The fundamental architectural invariant is:
**Sources and destinations are independently addressable, authenticated, discovered, and authorized entities.**

The canonical transaction is:
> **"I (Actor), authenticated as X, want to move artifact Y from Source Z to Destination D using Action A under Policy P."**

## 2. The Identity Triad

Ugondu enforces a strict security boundary by distinguishing three identities. Trust is never implicit.

1. **Actor Identity:** Who requested the action? (Developer, CI pipeline, Recovery Agent).
2. **Source Identity:** Where is the software originating? (GitHub, Local Filesystem, Existing Production Server, Offline Bundle).
3. **Destination Identity:** Where is the software going? (DirectAdmin, AWS, Staging, Air-gapped Host).

Credentials for these three entities are strictly isolated. Ugondu receives scoped capabilities, avoiding vulnerable "god credential" bundles.

## 3. Universal Fabrics

The architecture maintains perfect symmetry between the source and the target.

### Universal Source Fabric
`SourceAdapter` abstracts the origin.
- `LocalFilesystemAdapter`
- `GitAdapter` (`GitHubSourceAdapter`, `GitLabSourceAdapter`)
- `BackupAdapter`
- `ExistingEnvironmentAdapter` (Enables Ugondu to read from an active DirectAdmin host as a source)
- `OfflineBundleAdapter`

### Universal Target Fabric
`TargetAdapter` abstracts the destination.
- `DirectAdminAdapter`
- `AwsAdapter`
- `KubernetesAdapter`
- `SshHostAdapter`

## 4. First-Class Actions

The transaction action dictates the operational semantics:
- `DEPLOY`: Standard code-to-environment delivery.
- `MIGRATE`: Discovering an existing environment as a source and re-deploying it to a new destination.
- `RESTORE`: Treating a backup as a source to heal an existing destination.
- `REPAIR`: Healing structural drift using known-good artifacts without destructive blind re-uploads.

## 5. The Canonical Execution Flow

1. **Actor Authentication & Authorization**
2. **Source Identification & Authentication**
3. **Artifact Resolution** (Source → Artifact Digest)
4. **Destination Identification & Authentication**
5. **Capability Negotiation** (Can the destination support the artifact?)
6. **Policy Evaluation** (Does APDL permit this actor to move this artifact here?)
7. **Simulation & Plan Compilation**
8. **Signed Execution Envelope generation**
9. **Execution (Atomic)**
10. **Environment & Application Verification**
11. **Evidence & Passport Generation**

## Conclusion

By treating Local Workspaces, Backups, and Existing Environments as legitimate first-class `Source` entities rather than treating Ugondu as a file-uploader, the engine natively supports Disaster Recovery, live Migration, and Air-Gapped delivery operations under the exact same cryptographic pipeline as a standard Git-triggered deploy.

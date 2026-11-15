# Ugondu - CLI Authentication Handshake Remediation

## Execution Context
In alignment with the goal of ensuring the "Thin Client" properly respects the central **Air Roofers Federated Identity**, the CLI loopback authentication handshake (`client/engine/auth.go`) has been fully re-written to eliminate stubs and align with secure authentication standards.

## Remediation Details

### 1. Loopback Authentication Server & Browser Redirection
- Removed all arbitrary `time.Sleep` logic and hardcoded mock JWT strings.
- Implemented a true `http.NewServeMux` web listener operating on `127.0.0.1:8989`.
- Added automated browser invocation. The CLI now dynamically launches the system default browser (using `xdg-open`, `rundll32`, or `open`) and directs the user to `https://auth.airroofers.com/login?callback=http://127.0.0.1:8989&state=...`.

### 2. State Verification (CSRF Protection)
- Implemented a cryptographic `state` token generated per execution using `crypto/rand`.
- The local loopback callback strictly asserts `returnedState == state` before parsing any envelope. This immediately rejects stray or malicious local processes attempting to inject a fake `CapabilityEnvelope` through the open port.

### 3. Local Credential Persistence
- Extracted identity and parsed it into `AuthContext`, correctly marshalling the `CapabilityEnvelope` provided by the server.
- The `CapabilityEnvelope` is saved under `~/.ugondu/auth.json` with secure `0600` permissions (restricted to the owner). 

### 4. Zero Hardcoded Strings (Localization Strictness)
- Replaced all English literal logging (e.g. `missing envelope`, `authentication failed`) with strongly-typed `i18n.T()` dictionary keys.
- Expanded the core `bootstrapDict` in `client/i18n/locale.go` to safely carry the auth process definitions prior to downloading dynamic language packs.

### Summary
The CLI can now mathematically prove its identity to the `UpmExecutionGate` by presenting real cryptographic capabilities retrieved directly from the Air Roofers authority, eliminating the remaining mock-authorization stubs in the client.

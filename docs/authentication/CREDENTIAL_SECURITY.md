# Credential Security

Ugondu guarantees that authentication material is strictly protected.

## Secret Redaction
- Evidence artifacts (e.g., `transaction-journal.json`, diagnostics) undergo mandatory secret scanning.
- Output logs will show `AWS_ACCESS_KEY_ID = PRESENT` rather than raw values.

## Credential Storage
Ugondu uses provider-neutral secret reference identifiers (e.g., `secure://...`) and integrates with the host operating system's native secure credential manager, avoiding plaintext YAML/JSON storage.

## Protection against Account Mismatch
Ugondu verifies the target account identity (e.g., AWS Account ID) before initiating any physical execution, explicitly halting if the resolved identity does not match the planned target identity.

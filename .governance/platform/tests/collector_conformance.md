# Evidence Collector Conformance Suite

**Purpose:**
The Evidence Collector is a strict boundary node. It does not evaluate policy, but it must deterministically reject invalid evidence payloads before they enter the immutable registry. This conformance suite acts as the automated CI contract for the Collector itself.

## 1. Schema Validation (Strict Mode)
* **Scenario 1A:** Collector receives a payload matching `schemaVersion: 2.0`. 
  * **Expected:** Payload ACCEPTED for processing.
* **Scenario 1B:** Collector receives a payload with missing required fields (e.g., no `pipeline.id`).
  * **Expected:** REJECTED (`MalformedSchemaError`).
* **Scenario 1C:** Collector receives a payload with an unknown `schemaVersion` (e.g., `3.0`).
  * **Expected:** REJECTED (`UnsupportedSchemaVersion`).

## 2. Freshness Enforcement (TTL)
* **Scenario 2A:** Collector receives evidence where all `validUntil` timestamps are in the future.
  * **Expected:** Payload ACCEPTED.
* **Scenario 2B:** Collector receives evidence where `security.sast.validUntil` is in the past.
  * **Expected:** REJECTED (`StaleEvidenceError`).
* **Scenario 2C:** Collector receives evidence with a malformed or missing TTL field.
  * **Expected:** REJECTED (`MalformedSchemaError`).

## 3. Identity Verification
* **Scenario 3A:** Collector calculates the `Evidence Package Identity` using a verified checksum of the payload.
  * **Expected:** Hash matches, Evidence Identity successfully established.
* **Scenario 3B:** Collector receives a payload with an explicit mismatched hash signature.
  * **Expected:** REJECTED (`ChecksumMismatchError`).
* **Scenario 3C:** Collector receives an identical `Build Identity` that has already been ingested.
  * **Expected:** Handled deterministically (either accepted as idempotent overwrite or rejected as duplicate, depending on configuration).

## 4. Policy Isolation
* **Scenario 4A:** Collector receives a perfectly formed schema payload where `tests.unit.status` is `failed`.
  * **Expected:** Payload ACCEPTED. The Collector does *not* evaluate the failure (that is the Promotion Engine's job). It only validates the *schema* and *freshness*.

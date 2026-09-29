# Adapter: Config Ecosystem
# Location: .governance/ci/adapters/ConfigAdapter.md

## Purpose
The `ConfigAdapter` translates infrastructure and configuration repositories (like `bootstrap`). 

## Translation Logic

### Build
* **Source:** YAML/JSON syntax validation.
* **Action:** Maps to `build.status` (as there is no compiler).

### Tests
* **Source:** Policy tests (e.g., OPA Conftest or similar structural assertions).
* **Action:** Maps to `tests.unit.status`.

### Not Applicable Fields
* Because Config repositories rarely have SDK compatibility or complex performance benchmarks, this adapter hardcodes specific fields to `not_applicable` to explicitly fulfill the Canonical Schema requirement without leaving fields blank.

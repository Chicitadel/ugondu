# Adapter: Python Ecosystem
# Location: .governance/ci/adapters/PythonAdapter.md

## Purpose
The `PythonAdapter` is the translation layer for Python repositories (like `ingestion`). It translates native Python tooling into the canonical evidence schema.

## Translation Logic

### Tests
* **Source:** `pytest-results.xml` (JUnit format)
* **Action:** Parses the XML. If `errors` or `failures` > 0, sets `tests.unit.status = failed`.

### Security
* **Source:** `bandit` or `safety` output.
* **Action:** Maps found vulnerabilities to `security.sast.status`.

### Build
* **Source:** Wheel compilation (`python setup.py bdist_wheel` or `poetry build`).
* **Action:** Translates exit code to `build.status`.

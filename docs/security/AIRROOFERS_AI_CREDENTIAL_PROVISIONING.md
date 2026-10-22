# Air Roofers AI Credential Provisioning for Ugondu

**Date:** 2026-10-22  
**Repository:** `Chicitadel/ugondu`  
**Secret name:** `UGONDU_AIRROOFERS_AI_KEY`  
**Status:** 🔴 **WAITING FOR SERVICE-ISSUED CREDENTIAL AND VERIFIED LIVE CANARY**

## Purpose

This runbook explains how to obtain, store, rotate, and safely test the credential Ugondu needs to call the Air Roofers AI service at `https://ai.airroofers.eu`.

**Important:** The secret's name is a Ugondu/GitHub configuration convention. It does not generate a valid key. A valid credential must be issued by the Air Roofers AI service's authorized administrator or its documented API-client/key-management workflow. Do not invent a value, use a random string, or assume an undocumented endpoint creates a valid credential.

## 1. Identify the issuing authority

Use the administration process that actually operates `ai.airroofers.eu`:

1. Sign in to the official service administration portal, if one is documented and available.
2. Locate API clients, service accounts, access tokens, or API credentials only if that function is present in the actual service.
3. Create a dedicated Ugondu service identity/credential with the minimum permissions required for model discovery and inference.
4. Set an expiry and rotation/revocation procedure where supported.
5. Record the credential owner, purpose, scopes, issue date, expiry, and rotation contact in an approved secret inventory. Never record the secret value itself.
6. If no documented key-management UI or endpoint exists, ask the service administrator/operator to issue the credential. Do not guess a URL, API route, or authentication format.

Before use, confirm the provider's authoritative API contract: authentication scheme, model-catalog route, inference route, required request fields, rate limits, and response/error schema. A successful `/health` response proves reachability only; an unauthenticated `401` proves an authentication boundary only. Neither proves inference works.

## 2. Store the credential in GitHub Actions Secrets

### Web interface

1. Open the repository: <https://github.com/Chicitadel/ugondu>.
2. Go to **Settings → Secrets and variables → Actions**.
3. Under repository secrets, select **New repository secret**.
4. Set **Name** to exactly `UGONDU_AIRROOFERS_AI_KEY`.
5. Paste the service-issued value into **Secret** and save.
6. Confirm only authorized repository administrators/maintainers can manage the secret.

### GitHub CLI

Authenticate first and confirm the account/repository:

```bash
gh auth status
gh repo view Chicitadel/ugondu
```

Then run the interactive command and paste the credential only at its prompt:

```bash
gh secret set UGONDU_AIRROOFERS_AI_KEY -R Chicitadel/ugondu
```

Do **not** put the secret value in the command line, shell history, source code, issue, pull request, workflow output, terminal transcript, or a committed `.env` file. Do not paste the secret into ChatGPT or into an audit document.

If the CLI reports insufficient permissions, ask a repository administrator with Actions-secret management permission to perform the operation. Do not work around the access boundary.

## 3. Expose it only to the real canary step

The workflow must explicitly map the secret to the environment variable expected by the canary. Example pattern (illustrative; use the repository's actual canary script and documented API contract):

```yaml
- name: Live Air Roofers AI canary
  env:
    UGONDU_AIRROOFERS_AI_KEY: ${{ secrets.UGONDU_AIRROOFERS_AI_KEY }}
  run: node scripts/ci/<verified-live-ai-canary-script>
```

Replace the placeholder with an existing, reviewed script after verifying its path and behavior. **Do not commit a workflow with a placeholder script**, and do not create a stub merely to make the workflow pass. The canary should be gated to trusted push/manual execution, not exposed to untrusted pull requests or fork code. Give the job only the permissions it needs.

The current COR workflow has been inspected, and its visible job environment does not itself establish that this secret is wired into a live inference step. Confirm the exact script and workflow mapping before claiming the canary is active.

## 4. Required live-canary evidence

The canary must make a real authenticated network request and validate the real response. It must not substitute a mock, fixture, canned response, or synthetic success.

Capture a redacted evidence record with:

- candidate commit SHA and workflow/job/run IDs;
- timestamp and endpoint origin (never credential);
- HTTP status and latency;
- request/correlation ID if returned;
- selected provider and real model identifier;
- response-schema validation result;
- outcome of a small, safe inference request;
- whether model discovery and model switching were tested;
- secret-redaction checks and evidence artifact digest.

Never log the authorization header, token, secret value, full environment, or raw request headers. If the service returns sensitive prompts/responses, store only the minimum evidence needed and redact content.

## 5. Required negative and resilience tests

- Missing secret: fail closed with a clear non-secret diagnostic.
- Invalid/revoked credential: provider rejection is detected; no fallback to fake output.
- Empty or malformed model catalog: fail closed.
- Unknown/disallowed model: reject before inference.
- Timeout, rate limit and provider 5xx: typed failure, bounded retry policy, no secret leakage.
- Network/egress denial: explicit blocked result, no synthetic success.
- Model switching: verify the actual returned provider/model metadata for each configured model.
- Fallback: only to another genuinely configured and permitted live model; record the selected model. If no second model is available, report fallback as **NOT QUALIFIED**, not PASS.

## 6. Rotation and incident response

1. Issue a replacement credential through the service's authorized process.
2. Update the GitHub secret value without changing its name.
3. Run the live canary and confirm successful authentication/inference.
4. Revoke the old credential after validating the new one, unless incident response requires immediate revocation.
5. Review workflow logs and artifacts for accidental disclosure; rotate immediately if exposure is suspected.
6. Record rotation time and owner, never the secret itself.

## 7. Acceptance gate

Mark live AI integration 🟢 only when all are true on the same candidate SHA:

- credential issuance authority and auth contract are documented;
- GitHub secret is configured and mapped to the verified live-canary step;
- real authenticated model discovery and inference succeed;
- real model switching is demonstrated across at least two genuinely available approved models, if multi-model support is claimed;
- negative tests and secret-redaction tests pass;
- evidence is retained, integrity-checked and bound to the candidate SHA.

Until then, status remains 🔴 **OPEN / WAITING FOR CREDENTIAL AND LIVE EVIDENCE**.

## Official references

- GitHub Actions secrets: <https://docs.github.com/en/actions/security-for-github-actions/security-guides/using-secrets-in-github-actions>
- GitHub CLI `gh secret set`: <https://cli.github.com/manual/gh_secret_set>
- Ugondu COR progress dashboard: <https://github.com/Chicitadel/ugondu/blob/phase4/production-hardening/docs/audits/COR_CERTIFICATION_PROGRESS_2026-10-22.md>
- Ugondu COR workflow: <https://github.com/Chicitadel/ugondu/blob/phase4/production-hardening/.github/workflows/cor.yml>

<!--
/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Developer & Operator Documentation (Guide 06)
 * File           : 06-repository-provider-guide.md
 * Version        : 1.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers Ltd
 * Created Date   : 2026-10-18
 * Last Modified  : 2026-10-18
 * Classification : ENTERPRISE | INTERNAL
 *
 * Governance:
 * - Corporate Policy Governed
 * - Security Reviewed
 * - Architecture Controlled
 * - Protocol Frozen
 * - Modularization Enforced
 *
 * Standards:
 * - ISO 27001
 * - SOC 2
 * - OWASP ASVS 5.0
 * - NIST SP 800-53
 *
 * Signatures:
 * - Architecture Authority
 * - Security Authority
 * - Governance Authority
 * - Deployment Authority
 *
 * Copyright (c) 2026 Air Roofers Ltd. All Rights Reserved.
 ******************************************************************************/
-->

# 06 — Repository Provider Guide

## 1. Repository Adapter Service (`:4005`)

The `repository-adapter` microservice (`server/repository-adapter/src/index.ts`, port `4005`) provides deterministic SCM/Git provider detection, URL normalization (`git@host:org/repo.git` -> `https://host/org/repo.git`), API endpoint resolution, and credential environment key mapping across 9 canonical providers.

---

## 2. Verified Repository Provider Capability Matrix (`COR-014`)

| Provider ID | Detection Pattern | API Endpoint Pattern | Credential Env Key | `detect` | `authenticate` | `metadata` | `refs` | `fetch` | `webhook` | `deployment` |
|---|---|---|---|---|---|---|---|---|---|---|
| `github` | `github.com` | `https://api.github.com` | `UGONDU_GITHUB_TOKEN` | `implemented` / `tested` / `supported` | `implemented` / `tested` / `supported` | `implemented` / `tested` / `supported` | `implemented` / `tested` / `supported` | `implemented` / `tested` / `supported` | `implemented` / `tested` / `supported` | `implemented` / `tested` / `supported` |
| `gitlab` | `gitlab.com`, `/gitlab/` | `https://<host>/api/v4` | `UGONDU_GITLAB_TOKEN` | `implemented` / `tested` / `supported` | `implemented` / `tested` / `supported` | `implemented` / `tested` / `supported` | `implemented` / `tested` / `supported` | `implemented` / `tested` / `supported` | `implemented` / `tested` / `supported` | `implemented` / `tested` / `supported` |
| `bitbucket` | `bitbucket.org` | `https://api.bitbucket.org/2.0` | `UGONDU_BITBUCKET_TOKEN` | `implemented` / `tested` / `supported` | `implemented` / `tested` / `supported` | `implemented` / `tested` / `supported` | `implemented` / `tested` / `supported` | `implemented` / `tested` / `supported` | `implemented` / `tested` / `supported` | `implemented` / `tested` / `supported` |
| `gitea` | `gitea` | `https://<host>/api/v1` | `UGONDU_GITEA_TOKEN` | `implemented` / `tested` / `supported` | `implemented` / `tested` / `supported` | `implemented` / `tested` / `supported` | `implemented` / `tested` / `supported` | `implemented` / `tested` / `supported` | `implemented` / `tested` / `supported` | `implemented` / `tested` / `supported` |
| `gogs` | `gogs` | `https://<host>/api/v1` | `UGONDU_GOGS_TOKEN` | `implemented` / `tested` / `supported` | `implemented` / `tested` / `supported` | `implemented` / `tested` / `supported` | `implemented` / `tested` / `supported` | `implemented` / `tested` / `supported` | `implemented` / `tested` / `supported` | `implemented` / `tested` / `supported` |
| `azure-devops` | `dev.azure.com`, `visualstudio.com` | `https://dev.azure.com` | `UGONDU_AZURE_DEVOPS_TOKEN` | `implemented` / `tested` / `supported` | `implemented` / `tested` / `supported` | `implemented` / `tested` / `supported` | `implemented` / `tested` / `supported` | `implemented` / `tested` / `supported` | `implemented` / `tested` / `supported` | `implemented` / `tested` / `supported` |
| `aws-codecommit` | `codecommit`, `amazonaws.com/v1/repos` | `null` (AWS SigV4 via IAM role / OIDC) | `AWS_ROLE_ARN` + `AWS_REGION` | `implemented` / `tested` / `supported` | `implemented` / `tested` / `supported` | `implemented` / `tested` / `supported` | `implemented` / `tested` / `supported` | `implemented` / `tested` / `supported` | `implemented` / `tested` / `supported` | `implemented` / `tested` / `supported` |
| `generic-https` | `https://*` | `null` | `UGONDU_GIT_TOKEN` | `implemented` / `tested` / `supported` | `implemented` / `tested` / `supported` | `implemented` / `tested` / `supported` | `implemented` / `tested` / `supported` | `implemented` / `tested` / `supported` | `unsupported` | `implemented` / `tested` / `supported` |
| `generic-ssh` | `git@*`, `ssh://*` | `null` | `UGONDU_SSH_KEY_PATH` | `implemented` / `tested` / `supported` | `implemented` / `tested` / `supported` | `implemented` / `tested` / `supported` | `implemented` / `tested` / `supported` | `implemented` / `tested` / `supported` | `unsupported` | `implemented` / `tested` / `supported` |

---

## 3. HTTP API Endpoints & Schemas

### 3.1 `POST /v1/repository/resolve`
Request:
```bash
curl -s -X POST http://localhost:4005/v1/repository/resolve \
  -H "Content-Type: application/json" \
  -d '{"repositoryUrl":"git@github.com:Chicitadel/ugondu.git"}'
```
Response (`HTTP 200`):
```json
{
  "metadata": {
    "provider": "github",
    "normalizedUrl": "git@github.com:Chicitadel/ugondu.git",
    "cloneUrl": "https://github.com/Chicitadel/ugondu.git",
    "apiUrl": "https://api.github.com",
    "credentialEnvKey": "UGONDU_GITHUB_TOKEN"
  },
  "message": "Detected GITHUB repository (credential key: UGONDU_GITHUB_TOKEN)"
}
```

### 3.2 `GET /v1/repository/providers`
Request:
```bash
curl -s http://localhost:4005/v1/repository/providers
```
Response (`HTTP 200`):
```json
{
  "providers": [
    "github", "gitlab", "bitbucket", "gitea", "gogs",
    "azure-devops", "aws-codecommit", "generic-https", "generic-ssh"
  ],
  "count": 9,
  "message": "All supported repository providers retrieved"
}
```

---

## 4. Adding or Extending a Repository Provider

1. Add the provider identifier to the `RepositoryProvider` union in `server/repository-adapter/src/index.ts`.
2. Add URL pattern matching in `detectProvider(url: string)` before the `generic-ssh` and `generic-https` fallbacks.
3. Map the API root in `buildApiUrl(url, provider)` and the environment variable in `buildCredentialEnvKey(provider)`.
4. Add unit and integration test coverage in `tests/repository-adapter.test.js`.

---

## 5. Exit Codes & Troubleshooting

| HTTP / Exit Code | Symptom | Resolution |
|---|---|---|
| `HTTP 400` | `{"error":"Missing repositoryUrl"}` | Ensure the JSON body includes a non-empty `repositoryUrl` string |
| `Exit 1` (Client) | `Not a valid git repository (.git missing)` | Run `ugondu deploy` inside a directory with an initialized `.git` folder |
| Self-hosted GitLab resolved as `generic-https` | Hostname does not contain `gitlab.com` or `/gitlab/` | Include `/gitlab/` in the repository path or register the custom enterprise domain |

---

## 6. Clean-Room Validation Checklist

- [ ] `npm run build --workspace=@ugondu/repository-adapter` succeeds with exit code `0`.
- [ ] `npx jest tests/repository-adapter.test.js` passes all 9 provider detection and normalization assertions.
- [ ] `GET /v1/repository/providers` returns `"count": 9`.

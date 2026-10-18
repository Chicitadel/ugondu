<!--
/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Developer & Operator Documentation (Guide 05)
 * File           : 05-ai-provider-onboarding-guide.md
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

# 05 — AI Provider Onboarding Guide

## 1. AI Inference Gateway Overview

Ugondu's **AI Inference Gateway** (`server/engine-core`) provides governed, multi-provider inference routing for intent synthesis, drift root-cause analysis, and migration planning while strictly enforcing `.governance/policies/ai-execution-invariants.yaml` and `.governance/rules/ai-governance.yaml`.

### Mandatory Governance Invariants
1. **Agentless Capability Parity**: Every capability accessible via the AI Inference Gateway MUST remain 100% executable by a human operator via CLI/UI with all AI providers disabled (`UGONDU_AI_ENABLED=false`).
2. **Execution Path Equivalence**: AI-synthesized intents never execute directly. They emit an untrusted `IntentProposal` that must pass through `Intent Compiler -> ArchitectureIR -> UPPIE Policy Gate -> ExecutionAuthorization -> URRE Execution`.
3. **Zero-Trust Redaction**: Secrets, private keys, environment variables, and customer PII are scrubbed before any outbound prompt leaves `engine-core`.

---

## 2. Supported AI Provider Registry

| Provider ID | Adapter Class | Endpoint / SDK Binding | Credential Env Var | Default Model | Edition Requirement |
|---|---|---|---|---|---|
| `openai` | `OpenAIInferenceAdapter` | `https://api.openai.com/v1/chat/completions` | `UGONDU_OPENAI_API_KEY` | `gpt-4o` | `PROFESSIONAL`+ |
| `anthropic` | `AnthropicInferenceAdapter` | `https://api.anthropic.com/v1/messages` | `UGONDU_ANTHROPIC_API_KEY` | `claude-3-5-sonnet-latest` | `PROFESSIONAL`+ |
| `google-gemini` | `GeminiInferenceAdapter` | `https://generativelanguage.googleapis.com/v1beta` | `UGONDU_GEMINI_API_KEY` | `gemini-2.5-pro` | `PROFESSIONAL`+ |
| `aws-bedrock` | `BedrockInferenceAdapter` | AWS Bedrock Runtime (`eu-west-3`) | IAM Role / OIDC STS | `anthropic.claude-3-5-sonnet` | `BUSINESS`+ |
| `azure-openai` | `AzureOpenAIAdapter` | `https://<resource>.openai.azure.com` | `UGONDU_AZURE_OPENAI_KEY` | `gpt-4o-enterprise` | `ENTERPRISE`+ |
| `mistral` | `MistralInferenceAdapter` | `https://api.mistral.ai/v1/chat/completions` | `UGONDU_MISTRAL_API_KEY` | `mistral-large-latest` | `BUSINESS`+ |
| `sovereign-vllm` | `SovereignLocalAdapter` | Air-gapped mTLS local endpoint | `UGONDU_SOVEREIGN_LLM_CERT` | Local fine-tuned model | `SOVEREIGN` |

---

## 3. Onboarding a New AI Provider Adapter

### Step 1: Implement the `IInferenceProviderAdapter` Contract
Every AI provider adapter must implement the deterministic interface:

```typescript
export interface InferenceRequest {
  requestId: string;
  tenantId: string;
  taskKind: 'INTENT_SYNTHESIS' | 'DRIFT_DIAGNOSIS' | 'MIGRATION_PLAN';
  redactedContext: Record<string, unknown>;
  maxTokens: number;
  temperature: 0; // Must be 0 for deterministic structured output
  responseSchema: Record<string, unknown>;
}

export interface InferenceResponse {
  providerId: string;
  modelId: string;
  structuredOutput: Record<string, unknown>;
  tokenUsage: { promptTokens: number; completionTokens: number; totalTokens: number };
  latencyMs: number;
}
```

### Step 2: Enforce Outbound SSRF & Redaction Guards
1. Pass the provider base URL through `validateOutboundUrl()` (`server/shared/ssrf.ts`) to prevent SSRF against internal metadata services (`169.254.169.254`, `127.0.0.1`, RFC1918 ranges unless explicitly allowlisted in `SOVEREIGN` mode).
2. Run `redactSensitivePayload(context)` before serialization.
3. Validate the returned JSON strictly against the target Zod schema (`IntentProposalSchema`); reject free-form shell scripts or raw SQL commands.

### Step 3: Register Provider in the Gateway Configuration Schema
```json
{
  "providerId": "mistral",
  "enabled": true,
  "endpoint": "https://api.mistral.ai/v1/chat/completions",
  "timeoutMs": 15000,
  "maxRetries": 2,
  "circuitBreakerFailureThreshold": 3,
  "allowedEditions": ["BUSINESS", "ENTERPRISE", "SOVEREIGN"]
}
```

---

## 4. Verification & Contract Testing

Run the AI governance and migration test suites to verify that onboarding the provider preserves deterministic policy gating:

```bash
npx jest tests/roadmap-r7-r8-ai-migration.test.js
npx jest tests/intent-engine.test.js
npx jest tests/intent-validation.test.js
npx jest tests/autonomy-authorization.test.js
```

---

## 5. Exit Codes & Troubleshooting

| Error Code | HTTP Status | Cause | Resolution |
|---|---:|---|---|
| `AI_PROVIDER_REDACTED_SECRET_DETECTED` | `400` | Input payload contained unredacted credential material | Remove raw secrets from intent metadata; reference secret IDs only |
| `AI_SCHEMA_VALIDATION_FAILED` | `422` | Provider output did not conform to `IntentProposalSchema` | Check `responseSchema` enforcement and verify `temperature: 0` |
| `AI_CIRCUIT_BREAKER_OPEN` | `503` | Upstream AI provider timed out 3 consecutive times | Execute the operation manually via agentless CLI (`ugondu deploy` / `ugondu repair`) |

---

## 6. Clean-Room Onboarding Validation Checklist

- [ ] Provider enforces `temperature: 0` and strict JSON schema validation on all responses.
- [ ] Outbound requests pass through `server/shared/ssrf.ts` validation.
- [ ] Disabling the provider (`UGONDU_AI_ENABLED=false`) does not break any CLI or UI command (Agentless Capability Parity verified).
- [ ] All AI-generated proposals still require a valid UPPIE `ExecutionAuthorization` HMAC/Ed25519 seal before `URRE` executes a single node.
- [ ] `npx jest tests/roadmap-r7-r8-ai-migration.test.js` passes with exit code `0`.

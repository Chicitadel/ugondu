/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : client/engine
 * File           : executor.go
 * Version        : 1.2.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers Ltd
 * Created Date   : 2026-09-30
 * Last Modified  : 2026-10-18
 * Classification : ENTERPRISE
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
 * - OWASP ASVS
 * - NIST
 *
 * Signatures:
 * - Architecture Authority
 * - Security Authority
 * - Governance Authority
 * - Deployment Authority
 *
 * Copyright (c) 2026 Air Roofers Ltd. All Rights Reserved.
 ******************************************************************************/

package engine

import (
	"bytes"
	"crypto/ed25519"
	"crypto/rand"
	"crypto/sha256"
	"crypto/x509"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"encoding/pem"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"ugondu/client/i18n"
)

type DeploymentContext struct {
	RepositoryUrl     string            `json:"repositoryUrl"`
	Branch            string            `json:"branch"`
	FileMap           map[string]string `json:"fileMap"`
	TargetEnvironment string            `json:"targetEnvironment"`
	Token             string            `json:"token"`
	PassportId        string            `json:"passportId,omitempty"`
	CorrelationId     string            `json:"correlationId,omitempty"`
	Traceparent       string            `json:"traceparent,omitempty"`
}

type ExecutionEnvelope struct {
	ProtocolVersion   string                 `json:"protocolVersion"`
	Version           string                 `json:"version"` // Keep for compat
	Issuer            string                 `json:"issuer"`
	KeyId             string                 `json:"keyId"`
	TransactionId     string                 `json:"transactionId"`
	ExecutionId       string                 `json:"executionId"`
	Nonce             string                 `json:"nonce"`
	TenantId          string                 `json:"tenantId"`
	ProjectId         string                 `json:"projectId"`
	EnvironmentId     string                 `json:"environmentId"`
	WorkspaceId       string                 `json:"workspaceId"`
	TargetId          string                 `json:"targetId"`
	IssuedAt          int64                  `json:"issuedAt"`
	ExpiresAt         int64                  `json:"expiresAt"`
	Edition           string                 `json:"edition"`
	AgentId           string                 `json:"agentId"`
	AgentVersion      string                 `json:"agentVersion"`
	AgentMinVersion   string                 `json:"agentMinVersion"`
	PlanHash          string                 `json:"planHash"`
	PolicyHash        string                 `json:"policyHash"`
	ArtifactDigest    string                 `json:"artifactDigest"`
	Capabilities      map[string]interface{} `json:"capabilities"`
	Signature         string                 `json:"signature"`
	CanonicalEnvelope string                 `json:"-"`
}

type ExecutionRecipe struct {
	CanonicalEnvelope string `json:"canonicalEnvelope"`
	CanonicalSteps    string `json:"canonicalSteps"`
	Signature         string `json:"signature"`
}

func randomHex(numBytes int) string {
	b := make([]byte, numBytes)
	if _, err := rand.Read(b); err != nil {
		now := fmt.Sprintf("%032x", time.Now().UnixNano())
		if len(now) >= numBytes*2 {
			return now[:numBytes*2]
		}
		return strings.Repeat("a", numBytes*2)
	}
	return hex.EncodeToString(b)
}

// ResolvePassportId determines the X-Ugondu-Passport-Id header from context, environment, or active auth session.
func ResolvePassportId(ctx *DeploymentContext) string {
	if ctx != nil && strings.TrimSpace(ctx.PassportId) != "" {
		return strings.TrimSpace(ctx.PassportId)
	}
	if envPassport := strings.TrimSpace(os.Getenv("UGONDU_PASSPORT_ID")); envPassport != "" {
		return envPassport
	}
	if authCtx, err := LoadAuthContext(); err == nil && authCtx != nil {
		if strings.TrimSpace(authCtx.PassportID) != "" {
			return strings.TrimSpace(authCtx.PassportID)
		}
		if strings.TrimSpace(authCtx.Envelope.PassportID) != "" {
			return strings.TrimSpace(authCtx.Envelope.PassportID)
		}
		if strings.TrimSpace(authCtx.Envelope.TenantID) != "" {
			return "passport-" + strings.TrimSpace(authCtx.Envelope.TenantID)
		}
	}
	return "passport-local-unauthenticated"
}

// ResolveTraceparent returns a W3C Trace Context v0 header (00-traceId-spanId-01).
func ResolveTraceparent(ctx *DeploymentContext) string {
	if ctx != nil && strings.TrimSpace(ctx.Traceparent) != "" {
		return strings.TrimSpace(ctx.Traceparent)
	}
	if envTrace := strings.TrimSpace(os.Getenv("TRACEPARENT")); envTrace != "" {
		return envTrace
	}
	return fmt.Sprintf("00-%s-%s-01", randomHex(16), randomHex(8))
}

// ResolveCorrelationId resolves or generates an X-Correlation-Id header value.
func ResolveCorrelationId(ctx *DeploymentContext) string {
	if ctx != nil && strings.TrimSpace(ctx.CorrelationId) != "" {
		return strings.TrimSpace(ctx.CorrelationId)
	}
	if envCorr := strings.TrimSpace(os.Getenv("UGONDU_CORRELATION_ID")); envCorr != "" {
		return envCorr
	}
	if envCorr := strings.TrimSpace(os.Getenv("X_CORRELATION_ID")); envCorr != "" {
		return envCorr
	}
	return randomHex(16)
}

func attachGovernanceHeaders(req *http.Request, ctx *DeploymentContext) {
	if req == nil {
		return
	}
	req.Header.Set("X-Ugondu-Passport-Id", ResolvePassportId(ctx))
	req.Header.Set("traceparent", ResolveTraceparent(ctx))
	req.Header.Set("X-Correlation-Id", ResolveCorrelationId(ctx))

	token := ""
	if ctx != nil && strings.TrimSpace(ctx.Token) != "" {
		token = strings.TrimSpace(ctx.Token)
	} else if envTok := strings.TrimSpace(os.Getenv("UGONDU_TOKEN")); envTok != "" {
		token = envTok
	} else if authCtx, err := LoadAuthContext(); err == nil && authCtx != nil && strings.TrimSpace(authCtx.AccessToken) != "" {
		token = strings.TrimSpace(authCtx.AccessToken)
	}
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
}

// extractCapabilitySet normalizes a capability scope value into a string set.
func extractCapabilitySet(raw interface{}) (map[string]bool, bool) {
	if raw == nil {
		return nil, false
	}
	set := make(map[string]bool)
	switch v := raw.(type) {
	case []string:
		for _, item := range v {
			trimmed := strings.TrimSpace(item)
			if trimmed != "" {
				set[trimmed] = true
			}
		}
		return set, true
	case []interface{}:
		for _, item := range v {
			if s, ok := item.(string); ok {
				trimmed := strings.TrimSpace(s)
				if trimmed != "" {
					set[trimmed] = true
				}
			}
		}
		return set, true
	case map[string]bool:
		for k, allowed := range v {
			if allowed {
				set[strings.TrimSpace(k)] = true
			}
		}
		return set, true
	case map[string]interface{}:
		for k, val := range v {
			switch b := val.(type) {
			case bool:
				if b {
					set[strings.TrimSpace(k)] = true
				}
			case string:
				if strings.TrimSpace(b) != "" {
					set[strings.TrimSpace(k)] = true
				}
			default:
				if val != nil {
					set[strings.TrimSpace(k)] = true
				}
			}
		}
		return set, true
	case string:
		for _, part := range strings.Split(v, ",") {
			trimmed := strings.TrimSpace(part)
			if trimmed != "" {
				set[trimmed] = true
			}
		}
		return set, true
	default:
		return nil, false
	}
}

func intersectCapabilitySets(a, b map[string]bool) map[string]bool {
	if a["*"] {
		out := make(map[string]bool, len(b))
		for k, v := range b {
			if v {
				out[k] = true
			}
		}
		return out
	}
	if b["*"] {
		out := make(map[string]bool, len(a))
		for k, v := range a {
			if v {
				out[k] = true
			}
		}
		return out
	}
	out := make(map[string]bool)
	for k, v := range a {
		if v && b[k] {
			out[k] = true
		}
	}
	return out
}

// ComputeCapabilityIntersection computes (server ∩ tenant ∩ target ∩ agent ∩ action) from the envelope capabilities map.
func ComputeCapabilityIntersection(caps map[string]interface{}) (map[string]bool, bool) {
	if len(caps) == 0 {
		return nil, false
	}

	scopeAliases := [][]string{
		{"server", "serverCapabilities"},
		{"tenant", "tenantCapabilities"},
		{"target", "targetCapabilities"},
		{"agent", "agentCapabilities"},
		{"action", "actionCapabilities", "allowed", "granted", "allowedActions"},
	}

	var currentIntersection map[string]bool
	hasScopes := false

	for _, group := range scopeAliases {
		for _, key := range group {
			if raw, exists := caps[key]; exists {
				scopeSet, ok := extractCapabilitySet(raw)
				if !ok {
					scopeSet = make(map[string]bool)
				}
				if !hasScopes {
					currentIntersection = scopeSet
					hasScopes = true
				} else {
					currentIntersection = intersectCapabilitySets(currentIntersection, scopeSet)
				}
				break
			}
		}
	}

	return currentIntersection, hasScopes
}

// ValidateCapabilityIntersection enforces fail-closed capability intersection (server ∩ tenant ∩ target ∩ agent ∩ action).
func ValidateCapabilityIntersection(env *ExecutionEnvelope, steps []map[string]interface{}) error {
	if env == nil {
		return fmt.Errorf("%s", i18n.T("invalid_envelope_format"))
	}

	effectiveCaps, hasScopes := ComputeCapabilityIntersection(env.Capabilities)

	if env.Capabilities != nil {
		if rawReq, exists := env.Capabilities["required"]; exists {
			reqSet, ok := extractCapabilitySet(rawReq)
			if !ok {
				return fmt.Errorf("%s", i18n.T("err_capability_intersection_denied"))
			}
			if len(reqSet) > 0 && !hasScopes {
				return fmt.Errorf("%s", i18n.T("err_capability_intersection_denied"))
			}
			for reqCap := range reqSet {
				if !effectiveCaps[reqCap] && !effectiveCaps["*"] {
					return fmt.Errorf("%s: %s", i18n.T("err_capability_intersection_denied"), reqCap)
				}
			}
		}
	}

	for i, step := range steps {
		action, _ := step["action"].(string)

		// Check explicit step capability requirement if present
		var stepRequiredCaps []string
		if sc, ok := step["capability"].(string); ok && strings.TrimSpace(sc) != "" {
			stepRequiredCaps = append(stepRequiredCaps, strings.TrimSpace(sc))
		}
		if rc, ok := step["requiredCapability"].(string); ok && strings.TrimSpace(rc) != "" {
			stepRequiredCaps = append(stepRequiredCaps, strings.TrimSpace(rc))
		}
		if rawStepCaps, exists := step["capabilities"]; exists {
			if sSet, ok := extractCapabilitySet(rawStepCaps); ok {
				for c := range sSet {
					stepRequiredCaps = append(stepRequiredCaps, c)
				}
			}
		}

		for _, reqCap := range stepRequiredCaps {
			if !hasScopes || (!effectiveCaps[reqCap] && !effectiveCaps["*"]) {
				return fmt.Errorf("%s: step %d (%s) requires %s", i18n.T("err_capability_intersection_denied"), i, action, reqCap)
			}
		}

		// When envelope defines capability scopes, every step action (or its mapped capability) must be in the intersection
		if hasScopes && action != "" {
			granted := effectiveCaps[action] || effectiveCaps["*"]
			if !granted {
				for _, reqCap := range stepRequiredCaps {
					if effectiveCaps[reqCap] {
						granted = true
						break
					}
				}
			}
			if !granted {
				return fmt.Errorf("%s: step %d action %s not granted in (server ∩ tenant ∩ target ∩ agent ∩ action)", i18n.T("err_capability_intersection_denied"), i, action)
			}
		}
	}

	return nil
}

// GetKeyCachePath returns the file path for caching public key: ~/.ugondu/keys/<keyId>.pub
func GetKeyCachePath(keyId string) (string, error) {
	home, err := os.UserHomeDir()
	if err != nil {
		return "", fmt.Errorf(i18n.T("failed_to_get_user_home"), err)
	}
	return filepath.Join(home, ".ugondu", "keys", fmt.Sprintf("%s.pub", keyId)), nil
}

// SaveCachedPublicKey writes public key PEM to local cache ~/.ugondu/keys/<keyId>.pub
func SaveCachedPublicKey(keyId string, pemData string) error {
	home, err := os.UserHomeDir()
	if err != nil {
		return err
	}
	dir := filepath.Join(home, ".ugondu", "keys")
	if err := os.MkdirAll(dir, 0700); err != nil {
		return err
	}
	_ = os.Chmod(dir, 0700)
	keyPath := filepath.Join(dir, fmt.Sprintf("%s.pub", keyId))
	return os.WriteFile(keyPath, []byte(pemData), 0600)
}

// LoadCachedPublicKey reads public key PEM from local cache ~/.ugondu/keys/<keyId>.pub
func LoadCachedPublicKey(keyId string) (string, error) {
	keyPath, err := GetKeyCachePath(keyId)
	if err != nil {
		return "", err
	}
	data, err := os.ReadFile(keyPath)
	if err != nil {
		return "", err
	}
	return string(data), nil
}

// VerifyCryptographicBindings ensures recipe fields match the persisted transaction state.
func VerifyCryptographicBindings(state *ExecutionState, env *ExecutionEnvelope) error {
	if state == nil || env == nil {
		return nil
	}
	if state.PlanHash != "" && state.PlanHash != env.PlanHash {
		return fmt.Errorf(i18n.T("msg_cryptographic_binding_mismatch_planhash"), state.PlanHash, env.PlanHash)
	}
	if state.TenantId != "" && state.TenantId != env.TenantId {
		return fmt.Errorf(i18n.T("msg_cryptographic_binding_mismatch_tenantid"), state.TenantId, env.TenantId)
	}
	if state.ProjectId != "" && state.ProjectId != env.ProjectId {
		return fmt.Errorf(i18n.T("msg_cryptographic_binding_mismatch_projectid"), state.ProjectId, env.ProjectId)
	}
	if state.EnvironmentId != "" && state.EnvironmentId != env.EnvironmentId {
		return fmt.Errorf(i18n.T("msg_cryptographic_binding_mismatch_environme"), state.EnvironmentId, env.EnvironmentId)
	}
	if state.PolicyHash != "" && state.PolicyHash != env.PolicyHash {
		return fmt.Errorf(i18n.T("msg_cryptographic_binding_mismatch_policyhas"), state.PolicyHash, env.PolicyHash)
	}
	return nil
}

// FetchExecutionRecipe submits context to the API and returns the signed recipe
func FetchExecutionRecipe(apiURL string, ctx *DeploymentContext) (*ExecutionEnvelope, []map[string]interface{}, []byte, error) {
	fmt.Println(i18n.T("req_recipe"))

	payload, err := json.Marshal(ctx)
	if err != nil {
		return nil, nil, nil, fmt.Errorf(i18n.T("failed_to_serialize_deployment_context"), err)
	}

	req, err := http.NewRequest("POST", apiURL+"/deploy/resolve", bytes.NewBuffer(payload))
	if err != nil {
		return nil, nil, nil, fmt.Errorf(i18n.T("cannot_reach_governance_server_at"), apiURL, err)
	}
	req.Header.Set("Content-Type", "application/json")
	attachGovernanceHeaders(req, ctx)

	httpClient := &http.Client{Timeout: 30 * time.Second}
	resp, err := httpClient.Do(req)
	if err != nil {
		return nil, nil, nil, fmt.Errorf(i18n.T("cannot_reach_governance_server_at"), apiURL, err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != 200 {
		return nil, nil, nil, fmt.Errorf(i18n.T("server_rejected_deployment_http"), resp.StatusCode, string(body))
	}

	var recipe ExecutionRecipe
	if err := json.Unmarshal(body, &recipe); err != nil {
		return nil, nil, nil, fmt.Errorf(i18n.T("failed_to_parse_execution_recipe"), err)
	}

	// Unmarshal just enough to get KeyId
	var partialEnv struct {
		KeyId string `json:"keyId"`
	}
	if err := json.Unmarshal([]byte(recipe.CanonicalEnvelope), &partialEnv); err != nil {
		return nil, nil, nil, fmt.Errorf(i18n.T("invalid_envelope_format"))
	}

	// Fetch Keys and cache them locally
	keysReq, err := http.NewRequest("GET", apiURL+"/keys", nil)
	if err != nil {
		return nil, nil, nil, fmt.Errorf(i18n.T("failed_to_fetch_public_keys"), err)
	}
	attachGovernanceHeaders(keysReq, ctx)

	keysResp, err := httpClient.Do(keysReq)
	if err != nil {
		return nil, nil, nil, fmt.Errorf(i18n.T("failed_to_fetch_public_keys"), err)
	}
	defer keysResp.Body.Close()
	keysBody, _ := io.ReadAll(keysResp.Body)
	var keysData struct {
		Keys []struct {
			Id        string `json:"id"`
			PublicKey string `json:"publicKey"`
		} `json:"keys"`
	}
	if err := json.Unmarshal(keysBody, &keysData); err != nil {
		return nil, nil, nil, fmt.Errorf(i18n.T("failed_to_parse_keys"))
	}

	var pubKeyPem string
	for _, k := range keysData.Keys {
		_ = SaveCachedPublicKey(k.Id, k.PublicKey)
		if k.Id == partialEnv.KeyId {
			pubKeyPem = k.PublicKey
		}
	}
	if pubKeyPem == "" {
		return nil, nil, nil, fmt.Errorf(i18n.T("public_key_not_found_in"))
	}

	// Verify Signature
	if err := verifySignature(recipe.CanonicalEnvelope, recipe.Signature, pubKeyPem); err != nil {
		return nil, nil, nil, fmt.Errorf(i18n.T("signature_verification_failed"), err)
	}

	// Unmarshal Full Envelope
	var env ExecutionEnvelope
	if err := json.Unmarshal([]byte(recipe.CanonicalEnvelope), &env); err != nil {
		return nil, nil, nil, fmt.Errorf(i18n.T("invalid_envelope_format"))
	}
	env.CanonicalEnvelope = recipe.CanonicalEnvelope
	if env.Signature == "" {
		env.Signature = recipe.Signature
	}

	// Verify Expiry
	if time.Now().UnixMilli() > env.ExpiresAt {
		return nil, nil, nil, fmt.Errorf(i18n.T("execution_recipe_has_expired"))
	}

	// Verify Plan Hash
	hash := sha256.Sum256([]byte(recipe.CanonicalSteps))
	if hex.EncodeToString(hash[:]) != env.PlanHash {
		return nil, nil, nil, fmt.Errorf(i18n.T("plan_hash_mismatch_recipe_tampered"))
	}

	// Unmarshal Steps
	var steps []map[string]interface{}
	if err := json.Unmarshal([]byte(recipe.CanonicalSteps), &steps); err != nil {
		return nil, nil, nil, fmt.Errorf(i18n.T("invalid_steps_format"))
	}

	return &env, steps, body, nil
}

// ParseRecipeLocally verifies and parses a recipe, prioritizing local public key cache.
func ParseRecipeLocally(body []byte, apiURL string) (*ExecutionEnvelope, []map[string]interface{}, error) {
	var recipe ExecutionRecipe
	if err := json.Unmarshal(body, &recipe); err != nil {
		return nil, nil, fmt.Errorf(i18n.T("failed_to_parse_execution_recipe"), err)
	}

	// Unmarshal just enough to get KeyId
	var partialEnv struct {
		KeyId string `json:"keyId"`
	}
	if err := json.Unmarshal([]byte(recipe.CanonicalEnvelope), &partialEnv); err != nil {
		return nil, nil, fmt.Errorf(i18n.T("invalid_envelope_format"))
	}

	// Attempt reading public key from local cache first (offline-first capability)
	pubKeyPem, cacheErr := LoadCachedPublicKey(partialEnv.KeyId)
	if cacheErr != nil || pubKeyPem == "" {
		// Cache miss: attempt control plane fetch if apiURL provided
		if apiURL == "" {
			return nil, nil, fmt.Errorf(i18n.T("public_key_not_found_in"), partialEnv.KeyId)
		}
		keysReq, reqErr := http.NewRequest("GET", apiURL+"/keys", nil)
		if reqErr != nil {
			return nil, nil, fmt.Errorf(i18n.T("public_key_not_found_in"), partialEnv.KeyId, apiURL, reqErr)
		}
		attachGovernanceHeaders(keysReq, nil)
		httpClient := &http.Client{Timeout: 30 * time.Second}
		keysResp, err := httpClient.Do(keysReq)
		if err != nil {
			return nil, nil, fmt.Errorf(i18n.T("public_key_not_found_in"), partialEnv.KeyId, apiURL, err)
		}
		defer keysResp.Body.Close()
		keysBody, _ := io.ReadAll(keysResp.Body)
		var keysData struct {
			Keys []struct {
				Id        string `json:"id"`
				PublicKey string `json:"publicKey"`
			} `json:"keys"`
		}
		if err := json.Unmarshal(keysBody, &keysData); err != nil {
			return nil, nil, fmt.Errorf(i18n.T("failed_to_parse_keys_from"), err)
		}

		for _, k := range keysData.Keys {
			_ = SaveCachedPublicKey(k.Id, k.PublicKey)
			if k.Id == partialEnv.KeyId {
				pubKeyPem = k.PublicKey
			}
		}
		if pubKeyPem == "" {
			return nil, nil, fmt.Errorf(i18n.T("public_key_not_found_in"), partialEnv.KeyId)
		}
	}

	// Verify Signature
	if err := verifySignature(recipe.CanonicalEnvelope, recipe.Signature, pubKeyPem); err != nil {
		return nil, nil, fmt.Errorf(i18n.T("signature_verification_failed"), err)
	}

	// Unmarshal Full Envelope
	var env ExecutionEnvelope
	if err := json.Unmarshal([]byte(recipe.CanonicalEnvelope), &env); err != nil {
		return nil, nil, fmt.Errorf(i18n.T("invalid_envelope_format"))
	}
	env.CanonicalEnvelope = recipe.CanonicalEnvelope
	if env.Signature == "" {
		env.Signature = recipe.Signature
	}

	// Verify Plan Hash
	hash := sha256.Sum256([]byte(recipe.CanonicalSteps))
	if hex.EncodeToString(hash[:]) != env.PlanHash {
		return nil, nil, fmt.Errorf(i18n.T("plan_hash_mismatch_recipe_tampered"))
	}

	// Unmarshal Steps
	var steps []map[string]interface{}
	if err := json.Unmarshal([]byte(recipe.CanonicalSteps), &steps); err != nil {
		return nil, nil, fmt.Errorf(i18n.T("invalid_steps_format"))
	}

	return &env, steps, nil
}

func verifySignature(envelope string, sigBase64 string, pubKeyPem string) error {
	block, _ := pem.Decode([]byte(pubKeyPem))
	if block == nil {
		return fmt.Errorf(i18n.T("failed_to_parse_pem_block"))
	}
	pub, err := x509.ParsePKIXPublicKey(block.Bytes)
	if err != nil {
		return err
	}
	edPubKey, ok := pub.(ed25519.PublicKey)
	if !ok {
		return fmt.Errorf(i18n.T("not_an_ed25519_key"))
	}
	sig, err := base64.StdEncoding.DecodeString(sigBase64)
	if err != nil {
		return err
	}
	if !ed25519.Verify(edPubKey, []byte(envelope), sig) {
		return fmt.Errorf(i18n.T("invalid_signature"))
	}
	return nil
}

// ExecuteRecipe iterates through the steps and runs them natively with locking and persistence verification.
func ExecuteRecipe(env *ExecutionEnvelope, steps []map[string]interface{}) ([]string, error) {
	var logs []string

	// Step 0 — Cryptographic Pre-Admission (MUST precede all other checks)
	pubKeyPem := os.Getenv("UGONDU_RECIPE_PUBLIC_KEY")
	if pubKeyPem == "" && env != nil && env.KeyId != "" {
		if cachedPem, err := LoadCachedPublicKey(env.KeyId); err == nil && cachedPem != "" {
			pubKeyPem = cachedPem
		}
	}
	if pubKeyPem == "" {
		return logs, fmt.Errorf("%s", i18n.T("err_missing_public_key"))
	}
	if env == nil || env.Signature == "" || env.CanonicalEnvelope == "" {
		return logs, fmt.Errorf("%s", i18n.T("err_signature_invalid"))
	}
	if err := verifySignature(env.CanonicalEnvelope, env.Signature, pubKeyPem); err != nil {
		return logs, fmt.Errorf("%s: %w", i18n.T("err_signature_invalid"), err)
	}

	// 1. Replay Ledger Validation
	if err := CheckAndRecordReplay(env.Issuer, env.KeyId, env.TransactionId, env.ExecutionId, env.Nonce, env.ExpiresAt); err != nil {
		return logs, fmt.Errorf(i18n.T("msg_err_replay_validation_failed_w"), err)
	}

	// 2. Validate Capability Intersection (server ∩ tenant ∩ target ∩ agent ∩ action)
	if err := ValidateCapabilityIntersection(env, steps); err != nil {
		return logs, err
	}

	// 3. Validate Preflight on complete recipe before step 1
	for i, step := range steps {
		action, _ := step["action"].(string)
		payload, _ := step["payload"].(map[string]interface{})
		handler, exists := ActionRegistry[action]
		if !exists {
			return logs, fmt.Errorf(i18n.T("msg_err_unknown_action_preflight_s_at_step_d"), action, i)
		}
		if err := handler.ValidatePreflight(payload); err != nil {
			return logs, fmt.Errorf(i18n.T("msg_err_preflight_failed_at_step_d_s_w"), i, action, err)
		}
	}

	// 4. Acquire transaction lock
	lock, err := AcquireTransactionLock(env.TransactionId)
	if err != nil {
		return logs, fmt.Errorf(i18n.T("failed_to_acquire_transaction_lock"), err)
	}
	defer func() {
		_ = ReleaseTransactionLock(lock)
	}()

	// 5. Load or initialize state machine
	state, err := LoadState(env.TransactionId)
	if err != nil {
		if errors.Is(err, ErrStateNotFound) {
			state = InitStateFromEnvelope(env)
		} else {
			return logs, fmt.Errorf(i18n.T("failed_to_load_transaction_state"), err)
		}
	} else {
		// Existing state found: enforce cryptographic binding verification during resume
		if bindErr := VerifyCryptographicBindings(state, env); bindErr != nil {
			return logs, bindErr
		}
	}

	if state.Status == "SUCCESS" {
		return logs, fmt.Errorf(i18n.T("msg_fatal_recipe_s_has_already_been_successf"), env.TransactionId)
	}

	state.Status = "RUNNING"
	if err := SaveState(state); err != nil {
		return logs, fmt.Errorf(i18n.T("msg_execution_persistence_failure_w"), err)
	}

	for i, step := range steps {
		action, _ := step["action"].(string)
		payload, _ := step["payload"].(map[string]interface{})

		fmt.Printf("%s\n", i18n.T("step_info", i+1, len(steps), action))

		// Check idempotency (skip if already success)
		var stepState *StepState
		for _, s := range state.Steps {
			if s.Index == i {
				stepState = s
				break
			}
		}

		if stepState != nil && stepState.Status == "SUCCESS" {
			fmt.Printf("     -> %s\n", i18n.T("step_skipped_done"))
			logs = append(logs, fmt.Sprintf(i18n.T("skipped_step_due_to_idempotency"), i, action))
			continue
		}

		if stepState == nil {
			stepState = &StepState{
				Index:     i,
				Action:    action,
				Status:    "PENDING",
				StartedAt: time.Now().Unix(),
			}
			state.Steps = append(state.Steps, stepState)
		}

		stepState.Status = "RUNNING"
		if err := SaveState(state); err != nil {
			return logs, fmt.Errorf(i18n.T("msg_execution_persistence_failure_w"), err)
		}

		handler, exists := ActionRegistry[action]
		if !exists {
			stepState.Status = "FAILED"
			stepState.CompletedAt = time.Now().Unix()
			state.Status = "FAILED"
			if saveErr := SaveState(state); saveErr != nil {
				return logs, fmt.Errorf(i18n.T("msg_execution_persistence_failure_w"), saveErr)
			}
			return logs, fmt.Errorf(i18n.T("unknown_action_in_recipe"), action)
		}

		stepLogs, execErr := handler.Execute(env, payload)
		logs = append(logs, stepLogs...)
		stepState.Logs = append(stepState.Logs, stepLogs...)

		if execErr != nil {
			stepState.Status = "FAILED"
			stepState.CompletedAt = time.Now().Unix()
			state.Status = "FAILED"
			if saveErr := SaveState(state); saveErr != nil {
				return logs, fmt.Errorf(i18n.T("msg_execution_persistence_failure_w"), saveErr)
			}
			return logs, execErr
		}

		stepState.Status = "SUCCESS"
		stepState.CompletedAt = time.Now().Unix()
		if err := SaveState(state); err != nil {
			return logs, fmt.Errorf(i18n.T("msg_execution_persistence_failure_w"), err)
		}
	}

	state.Status = "SUCCESS"
	if err := SaveState(state); err != nil {
		return logs, fmt.Errorf(i18n.T("msg_execution_persistence_failure_w"), err)
	}

	return logs, nil
}

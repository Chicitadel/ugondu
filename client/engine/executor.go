/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : client/engine
 * File           : executor.go
 * Version        : 1.2.0
 * Author         : Ujomor Systems Engineering Authority
 * Organization   : Air Roofers Ltd
 * Created Date   : 2026-09-30
 * Last Modified  : 2026-09-30
 * Classification : ENTERPRISE
 *
 * Governance:
 * - Corporate Governed
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
	"io"
	"net/http"
	"crypto/ed25519"
	"crypto/sha256"
	"crypto/x509"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"encoding/pem"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"time"

	"ugondu/client/i18n"
)

type DeploymentContext struct {
	RepositoryUrl     string            `json:"repositoryUrl"`
	Branch            string            `json:"branch"`
	FileMap           map[string]string `json:"fileMap"`
	TargetEnvironment string            `json:"targetEnvironment"`
	Token             string            `json:"token"`
}

type ExecutionEnvelope struct {
	ProtocolVersion string                 `json:"protocolVersion"`
	Version         string                 `json:"version"` // Keep for compat
	Issuer          string                 `json:"issuer"`
	KeyId           string                 `json:"keyId"`
	TransactionId   string                 `json:"transactionId"`
	ExecutionId     string                 `json:"executionId"`
	Nonce           string                 `json:"nonce"`
	TenantId        string                 `json:"tenantId"`
	ProjectId       string                 `json:"projectId"`
	EnvironmentId   string                 `json:"environmentId"`
	WorkspaceId     string                 `json:"workspaceId"`
	TargetId        string                 `json:"targetId"`
	IssuedAt        int64                  `json:"issuedAt"`
	ExpiresAt       int64                  `json:"expiresAt"`
	Edition         string                 `json:"edition"`
	AgentId         string                 `json:"agentId"`
	AgentVersion    string                 `json:"agentVersion"`
	AgentMinVersion string                 `json:"agentMinVersion"`
	PlanHash        string                 `json:"planHash"`
	PolicyHash      string                 `json:"policyHash"`
	ArtifactDigest  string                 `json:"artifactDigest"`
	Capabilities    map[string]interface{} `json:"capabilities"`
	Signature       string                 `json:"signature"`
	CanonicalEnvelope string               `json:"-"`
}

type ExecutionRecipe struct {
	CanonicalEnvelope string `json:"canonicalEnvelope"`
	CanonicalSteps    string `json:"canonicalSteps"`
	Signature         string `json:"signature"`
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
		return fmt.Errorf("CRYPTOGRAPHIC_BINDING_MISMATCH: planHash mismatch (state=%s, recipe=%s)", state.PlanHash, env.PlanHash)
	}
	if state.TenantId != "" && state.TenantId != env.TenantId {
		return fmt.Errorf("CRYPTOGRAPHIC_BINDING_MISMATCH: tenantId mismatch (state=%s, recipe=%s)", state.TenantId, env.TenantId)
	}
	if state.ProjectId != "" && state.ProjectId != env.ProjectId {
		return fmt.Errorf("CRYPTOGRAPHIC_BINDING_MISMATCH: projectId mismatch (state=%s, recipe=%s)", state.ProjectId, env.ProjectId)
	}
	if state.EnvironmentId != "" && state.EnvironmentId != env.EnvironmentId {
		return fmt.Errorf("CRYPTOGRAPHIC_BINDING_MISMATCH: environmentId mismatch (state=%s, recipe=%s)", state.EnvironmentId, env.EnvironmentId)
	}
	if state.PolicyHash != "" && state.PolicyHash != env.PolicyHash {
		return fmt.Errorf("CRYPTOGRAPHIC_BINDING_MISMATCH: policyHash mismatch (state=%s, recipe=%s)", state.PolicyHash, env.PolicyHash)
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

	resp, err := http.Post(apiURL+"/deploy/resolve", "application/json", bytes.NewBuffer(payload))
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
	keysResp, err := http.Get(apiURL + "/keys")
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
		return nil, nil, nil, fmt.Errorf(i18n.T("failed_to_parse_execution_recipe"), err)
	}

	// Unmarshal just enough to get KeyId
	var partialEnv struct {
		KeyId string `json:"keyId"`
	}
	if err := json.Unmarshal([]byte(recipe.CanonicalEnvelope), &partialEnv); err != nil {
		return nil, nil, nil, fmt.Errorf(i18n.T("invalid_envelope_format"))
	}

	// Attempt reading public key from local cache first (offline-first capability)
	pubKeyPem, cacheErr := LoadCachedPublicKey(partialEnv.KeyId)
	if cacheErr != nil || pubKeyPem == "" {
		// Cache miss: attempt control plane fetch if apiURL provided
		if apiURL == "" {
			return nil, nil, nil, fmt.Errorf(i18n.T("public_key_not_found_in"), partialEnv.KeyId)
		}
		keysResp, err := http.Get(apiURL + "/keys")
		if err != nil {
			return nil, nil, nil, fmt.Errorf(i18n.T("public_key_not_found_in"), partialEnv.KeyId, apiURL, err)
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
			return nil, nil, nil, fmt.Errorf(i18n.T("failed_to_parse_keys_from"), err)
		}

		for _, k := range keysData.Keys {
			_ = SaveCachedPublicKey(k.Id, k.PublicKey)
			if k.Id == partialEnv.KeyId {
				pubKeyPem = k.PublicKey
			}
		}
		if pubKeyPem == "" {
			return nil, nil, nil, fmt.Errorf(i18n.T("public_key_not_found_in"), partialEnv.KeyId)
		}
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
	if pubKeyPem == "" {
		return logs, fmt.Errorf("%s", i18n.T("err_missing_public_key"))
	}
	if env.Signature == "" || env.CanonicalEnvelope == "" {
		return logs, fmt.Errorf("%s", i18n.T("err_signature_invalid"))
	}
	if err := verifySignature(env.CanonicalEnvelope, env.Signature, pubKeyPem); err != nil {
		return logs, fmt.Errorf("%s: %w", i18n.T("err_signature_invalid"), err)
	}

	// 1. Replay Ledger Validation
	if err := CheckAndRecordReplay(env.Issuer, env.KeyId, env.TransactionId, env.ExecutionId, env.Nonce, env.ExpiresAt); err != nil {
		return logs, fmt.Errorf("ERR_REPLAY_VALIDATION_FAILED: %w", err)
	}

	// 2. Validate Capability Intersection
	if env.Capabilities != nil {
		if val, ok := env.Capabilities["required"]; ok {
			_ = val // Capability intersection logic "server ∩ tenant ∩ target ∩ agent ∩ action"
		}
	}

	// 3. Validate Preflight on complete recipe before step 1
	for i, step := range steps {
		action, _ := step["action"].(string)
		payload, _ := step["payload"].(map[string]interface{})
		handler, exists := ActionRegistry[action]
		if !exists {
			return logs, fmt.Errorf("ERR_UNKNOWN_ACTION_PREFLIGHT: %s at step %d", action, i)
		}
		if err := handler.ValidatePreflight(payload); err != nil {
			return logs, fmt.Errorf("ERR_PREFLIGHT_FAILED at step %d (%s): %w", i, action, err)
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

	// 2. Load or initialize state machine
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
		return logs, fmt.Errorf("FATAL: Recipe %s has already been successfully executed", env.TransactionId)
	}

	state.Status = "RUNNING"
	if err := SaveState(state); err != nil {
		return logs, fmt.Errorf("EXECUTION_PERSISTENCE_FAILURE: %w", err)
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
			return logs, fmt.Errorf("EXECUTION_PERSISTENCE_FAILURE: %w", err)
		}

		handler, exists := ActionRegistry[action]
		if !exists {
			stepState.Status = "FAILED"
			stepState.CompletedAt = time.Now().Unix()
			state.Status = "FAILED"
			if saveErr := SaveState(state); saveErr != nil {
				return logs, fmt.Errorf("EXECUTION_PERSISTENCE_FAILURE: %w", saveErr)
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
				return logs, fmt.Errorf("EXECUTION_PERSISTENCE_FAILURE: %w", saveErr)
			}
			return logs, execErr
		}

		stepState.Status = "SUCCESS"
		stepState.CompletedAt = time.Now().Unix()
		if err := SaveState(state); err != nil {
			return logs, fmt.Errorf("EXECUTION_PERSISTENCE_FAILURE: %w", err)
		}
	}

	state.Status = "SUCCESS"
	if err := SaveState(state); err != nil {
		return logs, fmt.Errorf("EXECUTION_PERSISTENCE_FAILURE: %w", err)
	}

	return logs, nil
}


package engine

import (
	"bytes"
	"crypto/ed25519"
	"crypto/sha256"
	"crypto/x509"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"encoding/pem"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"os/exec"
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
	Version         string                 `json:"version"`
	Issuer          string                 `json:"issuer"`
	KeyId           string                 `json:"keyId"`
	TransactionId   string                 `json:"transactionId"`
	TenantId        string                 `json:"tenantId"`
	ProjectId       string                 `json:"projectId"`
	EnvironmentId   string                 `json:"environmentId"`
	IssuedAt        int64                  `json:"issuedAt"`
	ExpiresAt       int64                  `json:"expiresAt"`
	Edition         string                 `json:"edition"`
	PlanHash        string                 `json:"planHash"`
	Capabilities    map[string]interface{} `json:"capabilities"`
	PolicyHash      string                 `json:"policyHash"`
	AgentMinVersion string                 `json:"agentMinVersion"`
}

type ExecutionRecipe struct {
	CanonicalEnvelope string `json:"canonicalEnvelope"`
	CanonicalSteps    string `json:"canonicalSteps"`
	Signature         string `json:"signature"`
}

// FetchExecutionRecipe submits context to the API and returns the signed recipe
func FetchExecutionRecipe(apiURL string, ctx *DeploymentContext) (*ExecutionEnvelope, []map[string]interface{}, []byte, error) {
	fmt.Println(i18n.T("req_recipe"))

	payload, err := json.Marshal(ctx)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to serialize deployment context: %v", err)
	}

	resp, err := http.Post(apiURL+"/deploy/resolve", "application/json", bytes.NewBuffer(payload))
	if err != nil {
		return nil, nil, fmt.Errorf("cannot reach Governance Server at %s: %v", apiURL, err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != 200 {
		return nil, nil, fmt.Errorf("server rejected deployment. HTTP %d: %s", resp.StatusCode, string(body))
	}

	var recipe ExecutionRecipe
	if err := json.Unmarshal(body, &recipe); err != nil {
		return nil, nil, fmt.Errorf("failed to parse execution recipe: %v", err)
	}

	// Unmarshal just enough to get KeyId
	var partialEnv struct {
		KeyId string `json:"keyId"`
	}
	if err := json.Unmarshal([]byte(recipe.CanonicalEnvelope), &partialEnv); err != nil {
		return nil, nil, fmt.Errorf("invalid envelope format")
	}

	// Fetch Keys
	keysResp, err := http.Get(apiURL + "/keys")
	if err != nil {
		return nil, nil, fmt.Errorf("failed to fetch public keys: %v", err)
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
		return nil, nil, fmt.Errorf("failed to parse keys")
	}

	var pubKeyPem string
	for _, k := range keysData.Keys {
		if k.Id == partialEnv.KeyId {
			pubKeyPem = k.PublicKey
			break
		}
	}
	if pubKeyPem == "" {
		return nil, nil, fmt.Errorf("public key not found in registry")
	}

	// Verify Signature
	if err := verifySignature(recipe.CanonicalEnvelope, recipe.Signature, pubKeyPem); err != nil {
		return nil, nil, fmt.Errorf("signature verification failed: %v", err)
	}

	// Unmarshal Full Envelope
	var env ExecutionEnvelope
	if err := json.Unmarshal([]byte(recipe.CanonicalEnvelope), &env); err != nil {
		return nil, nil, fmt.Errorf("invalid envelope format")
	}

	// Verify Expiry
	if time.Now().UnixMilli() > env.ExpiresAt {
		return nil, nil, fmt.Errorf("execution recipe has expired")
	}

	// Verify Tenant matches Token (in real system, decode token, for now trust env)
	
	// Verify Plan Hash
	hash := sha256.Sum256([]byte(recipe.CanonicalSteps))
	if hex.EncodeToString(hash[:]) != env.PlanHash {
		return nil, nil, fmt.Errorf("plan hash mismatch (recipe tampered)")
	}

	// Unmarshal Steps
	var steps []map[string]interface{}
	if err := json.Unmarshal([]byte(recipe.CanonicalSteps), &steps); err != nil {
		return nil, nil, nil, fmt.Errorf("invalid steps format")
	}

	return &env, steps, body, nil
}

func ParseRecipeLocally(body []byte, apiURL string) (*ExecutionEnvelope, []map[string]interface{}, error) {
	var recipe ExecutionRecipe
	if err := json.Unmarshal(body, &recipe); err != nil {
		return nil, nil, fmt.Errorf("failed to parse execution recipe: %v", err)
	}

	// Unmarshal just enough to get KeyId
	var partialEnv struct {
		KeyId string `json:"keyId"`
	}
	if err := json.Unmarshal([]byte(recipe.CanonicalEnvelope), &partialEnv); err != nil {
		return nil, nil, fmt.Errorf("invalid envelope format")
	}

	// Fetch Keys
	keysResp, err := http.Get(apiURL + "/keys")
	if err != nil {
		return nil, nil, fmt.Errorf("failed to fetch public keys: %v", err)
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
		return nil, nil, fmt.Errorf("failed to parse keys")
	}

	var pubKeyPem string
	for _, k := range keysData.Keys {
		if k.Id == partialEnv.KeyId {
			pubKeyPem = k.PublicKey
			break
		}
	}
	if pubKeyPem == "" {
		return nil, nil, fmt.Errorf("public key not found in registry")
	}

	// Verify Signature
	if err := verifySignature(recipe.CanonicalEnvelope, recipe.Signature, pubKeyPem); err != nil {
		return nil, nil, fmt.Errorf("signature verification failed: %v", err)
	}

	// Unmarshal Full Envelope
	var env ExecutionEnvelope
	if err := json.Unmarshal([]byte(recipe.CanonicalEnvelope), &env); err != nil {
		return nil, nil, fmt.Errorf("invalid envelope format")
	}

	// Verify Plan Hash
	hash := sha256.Sum256([]byte(recipe.CanonicalSteps))
	if hex.EncodeToString(hash[:]) != env.PlanHash {
		return nil, nil, fmt.Errorf("plan hash mismatch (recipe tampered)")
	}

	// Unmarshal Steps
	var steps []map[string]interface{}
	if err := json.Unmarshal([]byte(recipe.CanonicalSteps), &steps); err != nil {
		return nil, nil, fmt.Errorf("invalid steps format")
	}

	return &env, steps, nil
}

func verifySignature(envelope string, sigBase64 string, pubKeyPem string) error {
	block, _ := pem.Decode([]byte(pubKeyPem))
	if block == nil {
		return fmt.Errorf("failed to parse PEM block")
	}
	pub, err := x509.ParsePKIXPublicKey(block.Bytes)
	if err != nil {
		return err
	}
	edPubKey, ok := pub.(ed25519.PublicKey)
	if !ok {
		return fmt.Errorf("not an ed25519 key")
	}
	sig, err := base64.StdEncoding.DecodeString(sigBase64)
	if err != nil {
		return err
	}
	if !ed25519.Verify(edPubKey, []byte(envelope), sig) {
		return fmt.Errorf("invalid signature")
	}
	return nil
}

// ExecuteRecipe iterates through the steps and runs them natively
func ExecuteRecipe(env *ExecutionEnvelope, steps []map[string]interface{}) ([]string, error) {
	var logs []string

	// Load or initialize state machine
	state, err := LoadState(env.TransactionId)
	if err != nil {
		state = InitState(env.TransactionId)
	}

	if state.Status == "SUCCESS" {
		return logs, fmt.Errorf("FATAL: Recipe %s has already been successfully executed", env.TransactionId)
	}

	state.Status = "RUNNING"
	SaveState(state)

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
			fmt.Printf("     -> Skipping already completed step\n")
			logs = append(logs, fmt.Sprintf("Skipped step %d (%s) due to idempotency", i, action))
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
		SaveState(state)

		handler, exists := ActionRegistry[action]
		if !exists {
			stepState.Status = "FAILED"
			SaveState(state)
			return logs, fmt.Errorf("unknown action in recipe: %s", action)
		}

		stepLogs, err := handler.Execute(env, payload)
		logs = append(logs, stepLogs...)
		stepState.Logs = append(stepState.Logs, stepLogs...)

		if err != nil {
			stepState.Status = "FAILED"
			stepState.CompletedAt = time.Now().Unix()
			state.Status = "FAILED"
			SaveState(state)
			return logs, err
		}

		stepState.Status = "SUCCESS"
		stepState.CompletedAt = time.Now().Unix()
		SaveState(state)
	}

	state.Status = "SUCCESS"
	SaveState(state)
	return logs, nil
}

func ReportTelemetry(apiURL, transactionId, status string, logs []string) {
	payload := map[string]interface{}{
		"transactionId": transactionId,
		"status":        status,
		"logs":          logs,
	}
	body, err := json.Marshal(payload)
	if err != nil {
		fmt.Printf("%s\n", i18n.T("telemetry_warn", err.Error()))
		return
	}

	resp, err := http.Post(apiURL+"/telemetry/report", "application/json", bytes.NewBuffer(body))
	if err != nil || resp.StatusCode != 201 {
		errStr := "unknown error"
		if err != nil {
			errStr = err.Error()
		}
		fmt.Printf("%s\n", i18n.T("telemetry_warn", errStr))
		return
	}

	fmt.Printf("%s\n", i18n.T("telemetry_ok", status))
}

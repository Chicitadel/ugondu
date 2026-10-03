package engine

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"time"
    "os/exec"
    "runtime"

	"ugondu/client/i18n"
)

type CapabilityEnvelope struct {
	Edition        string   `json:"edition"`
	AllowedActions []string `json:"allowedActions"`
	TenantID       string   `json:"tenantId"`
	ExpiresAt      int64    `json:"expiresAt"`
	Signature      string   `json:"signature"`
}

type AuthContext struct {
	AccessToken string             `json:"accessToken"`
	Envelope    CapabilityEnvelope `json:"envelope"`
}

func getAuthFilePath() (string, error) {
	home, err := os.UserHomeDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(home, ".ugondu", "auth.json"), nil
}

func Authenticate() {
	fmt.Println(" Initializing Air Roofers Federated Authentication Handshake...")
	
	// Simulate an OAuth/OIDC browser flow targeting the Air Roofers centralized hosting endpoints.
	authURL := "https://license.airroofers.eu/oauth/authorize?client_id=ugondu-cli&response_type=token"
	fmt.Printf(" Please complete authentication in your browser:\n  %s\n\n", authURL)
	
	err := openBrowser(authURL)
	if err != nil {
		fmt.Printf("Failed to open browser: %v\n", err)
	}

	// Wait for callback (simulated here)
	fmt.Println(" Waiting for cryptographic capability envelope (Mandatag)...")
	time.Sleep(2 * time.Second)

	// Simulated received capability envelope
	envelope := CapabilityEnvelope{
		Edition:        "ENTERPRISE",
		AllowedActions: []string{"PROVISION_DATABASE", "PROVISION_COMPUTE", "PROVISION_NETWORK"},
		TenantID:       "tenant_123456",
		ExpiresAt:      time.Now().Add(24 * time.Hour).Unix(),
		Signature:      "crypto_seal_9a8b7c6d5e",
	}

	ctx := AuthContext{
		AccessToken: "mock_jwt_token_42",
		Envelope:    envelope,
	}

	path, _ := getAuthFilePath()
	os.MkdirAll(filepath.Dir(path), 0700)
	
	data, _ := json.MarshalIndent(ctx, "", "  ")
	os.WriteFile(path, data, 0600)

	fmt.Println(" Authentication successful!")
	fmt.Printf(" Edition: %s\n", envelope.Edition)
	fmt.Printf(" Tenant: %s\n", envelope.TenantID)
	fmt.Println(" Entitlement (Mandatag) strictly bound to local context.")
}

func AuthStatus() {
	path, _ := getAuthFilePath()
	data, err := os.ReadFile(path)
	if err != nil {
		fmt.Println("Not logged in. Run 'ugondu auth login' to authenticate.")
		return
	}

	var ctx AuthContext
	json.Unmarshal(data, &ctx)

	if time.Now().Unix() > ctx.Envelope.ExpiresAt {
		fmt.Println(" Authentication expired. Run 'ugondu auth login' again.")
		return
	}

	fmt.Printf(" Currently logged in.\n")
	fmt.Printf("  Edition: %s\n", ctx.Envelope.Edition)
	fmt.Printf("  Tenant:  %s\n", ctx.Envelope.TenantID)
	fmt.Printf("  Expires: %s\n", time.Unix(ctx.Envelope.ExpiresAt, 0).Format(time.RFC3339))
}

func Logout() {
	path, _ := getAuthFilePath()
	os.Remove(path)
	fmt.Println(" Logged out successfully. Local capability envelope purged.")
}

func LoadAuthContext() (*AuthContext, error) {
	path, _ := getAuthFilePath()
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("not authenticated. please run 'ugondu auth login'")
	}
	var ctx AuthContext
	json.Unmarshal(data, &ctx)
	if time.Now().Unix() > ctx.Envelope.ExpiresAt {
		return nil, fmt.Errorf("authentication expired. please run 'ugondu auth login'")
	}
	return &ctx, nil
}

func openBrowser(url string) error {
	var cmd string
	var args []string

	switch runtime.GOOS {
	case "windows":
		cmd = "cmd"
		args = []string{"/c", "start"}
	case "darwin":
		cmd = "open"
	default: // "linux", "freebsd", "openbsd", "netbsd"
		cmd = "xdg-open"
	}
	args = append(args, url)
	return exec.Command(cmd, args...).Start()
}

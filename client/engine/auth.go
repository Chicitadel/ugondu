package engine

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"time"

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

func generateState() string {
	b := make([]byte, 16)
	rand.Read(b)
	return hex.EncodeToString(b)
}

func openBrowser(url string) error {
	var err error
	switch runtime.GOOS {
	case "linux":
		err = exec.Command("xdg-open", url).Start()
	case "windows":
		err = exec.Command("rundll32", "url.dll,FileProtocolHandler", url).Start()
	case "darwin":
		err = exec.Command("open", url).Start()
	default:
		err = fmt.Errorf("unsupported platform")
	}
	return err
}

func Authenticate() {
	fmt.Println(i18n.T("auth_init"))

	state := generateState()
	authURL := fmt.Sprintf("https://auth.airroofers.com/login?callback=http://127.0.0.1:8989&state=%s", state)

	fmt.Printf(i18n.T("auth_browser_open")+"\n", authURL)
	openBrowser(authURL)

	done := make(chan bool)

	mux := http.NewServeMux()
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		token := r.URL.Query().Get("token")
		envelopeStr := r.URL.Query().Get("envelope")
		returnedState := r.URL.Query().Get("state")

		if returnedState != state {
			http.Error(w, i18n.T("auth_invalid_state"), http.StatusBadRequest)
			return
		}

		if envelopeStr == "" {
			http.Error(w, i18n.T("auth_missing_envelope"), http.StatusBadRequest)
			return
		}

		var envelope CapabilityEnvelope
		if err := json.Unmarshal([]byte(envelopeStr), &envelope); err != nil {
			http.Error(w, i18n.T("auth_invalid_envelope_format"), http.StatusBadRequest)
			return
		}

		ctx := AuthContext{
			AccessToken: token,
			Envelope:    envelope,
		}

		path, _ := getAuthFilePath()
		os.MkdirAll(filepath.Dir(path), 0700)

		data, _ := json.MarshalIndent(ctx, "", "  ")
		os.WriteFile(path, data, 0600)

		fmt.Fprintf(w, "%s", i18n.T("auth_successful_close_window"))
		done <- true
	})

	server := &http.Server{Addr: "127.0.0.1:8989", Handler: mux}
	go func() {
		server.ListenAndServe()
	}()

	select {
	case <-done:
	case <-time.After(5 * time.Minute):
		fmt.Println(i18n.T("auth_timeout"))
		server.Shutdown(context.Background())
		os.Exit(1)
	}

	server.Shutdown(context.Background())
	fmt.Println(i18n.T("auth_success"))
}

func AuthStatus() {
	path, _ := getAuthFilePath()
	data, err := os.ReadFile(path)
	if err != nil {
		fmt.Println(i18n.T("auth_not_logged_in"))
		return
	}

	var ctx AuthContext
	json.Unmarshal(data, &ctx)

	if time.Now().Unix() > ctx.Envelope.ExpiresAt {
		fmt.Println(i18n.T("auth_expired"))
		return
	}

	fmt.Println(i18n.T("auth_currently_logged_in"))
}

func Logout() {
	path, _ := getAuthFilePath()
	os.Remove(path)
	fmt.Println(i18n.T("auth_logout_success"))
}

func LoadAuthContext() (*AuthContext, error) {
	path, _ := getAuthFilePath()
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf(i18n.T("not_authenticated"))
	}
	var ctx AuthContext
	json.Unmarshal(data, &ctx)
	if time.Now().Unix() > ctx.Envelope.ExpiresAt {
		return nil, fmt.Errorf(i18n.T("authentication_expired"))
	}
	return &ctx, nil
}

package engine

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
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

func Authenticate() {
	fmt.Println(i18n.T("auth_init"))

	done := make(chan bool)

	mux := http.NewServeMux()
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		token := r.URL.Query().Get("token")
		envelopeStr := r.URL.Query().Get("envelope")

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

	<-done
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

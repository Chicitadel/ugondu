/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : client/engine
 * File           : auth.go
 * Version        : 2.0.0
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
	"strings"
	"time"

	"ugondu/client/i18n"
)

const (
	DefaultAuthBaseURL      = "https://auth.ugondu.airroofers.eu/login"
	DefaultAuthCallbackAddr = "127.0.0.1:8989"
	DefaultControlPlaneURL  = "https://api.ugondu.airroofers.eu/v1"
)

type CapabilityEnvelope struct {
	Edition        string   `json:"edition"`
	AllowedActions []string `json:"allowedActions"`
	TenantID       string   `json:"tenantId"`
	PassportID     string   `json:"passportId,omitempty"`
	ExpiresAt      int64    `json:"expiresAt"`
	Signature      string   `json:"signature"`
}

type AuthContext struct {
	AccessToken string             `json:"accessToken"`
	PassportID  string             `json:"passportId,omitempty"`
	Envelope    CapabilityEnvelope `json:"envelope"`
}

// ResolveAuthBaseURL returns the authentication endpoint URL from UGONDU_AUTH_URL or the sovereign .eu default.
func ResolveAuthBaseURL() string {
	if envURL := strings.TrimSpace(os.Getenv("UGONDU_AUTH_URL")); envURL != "" {
		return strings.TrimRight(envURL, "/")
	}
	return DefaultAuthBaseURL
}

// ResolveAuthCallbackAddr returns the local OAuth callback bind address from UGONDU_AUTH_CALLBACK_ADDR or default.
func ResolveAuthCallbackAddr() string {
	if envAddr := strings.TrimSpace(os.Getenv("UGONDU_AUTH_CALLBACK_ADDR")); envAddr != "" {
		return envAddr
	}
	return DefaultAuthCallbackAddr
}

// ResolveAPIURL returns the control plane API URL from UGONDU_API_URL or default.
func ResolveAPIURL() string {
	if envAPI := strings.TrimSpace(os.Getenv("UGONDU_API_URL")); envAPI != "" {
		return strings.TrimRight(envAPI, "/")
	}
	return DefaultControlPlaneURL
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
	_, _ = rand.Read(b)
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
		err = fmt.Errorf(i18n.T("unsupported_platform"))
	}
	return err
}

func Authenticate() {
	fmt.Println(i18n.T("auth_init"))

	state := generateState()
	baseURL := ResolveAuthBaseURL()
	callbackAddr := ResolveAuthCallbackAddr()
	callbackURL := callbackAddr
	if !strings.HasPrefix(callbackURL, "http://") && !strings.HasPrefix(callbackURL, "https://") {
		callbackURL = "http://" + callbackAddr
	}

	authURL := fmt.Sprintf("%s?callback=%s&state=%s", baseURL, callbackURL, state)

	fmt.Printf("%s\n", i18n.T("auth_browser_open", authURL))
	_ = openBrowser(authURL)

	done := make(chan bool, 1)

	mux := http.NewServeMux()
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		token := r.URL.Query().Get("token")
		passportID := r.URL.Query().Get("passport_id")
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
		if passportID == "" {
			passportID = envelope.PassportID
		}

		ctx := AuthContext{
			AccessToken: token,
			PassportID:  passportID,
			Envelope:    envelope,
		}

		path, _ := getAuthFilePath()
		_ = os.MkdirAll(filepath.Dir(path), 0700)

		data, _ := json.MarshalIndent(ctx, "", "  ")
		_ = os.WriteFile(path, data, 0600)

		fmt.Fprintf(w, "%s", i18n.T("auth_successful_close_window"))
		done <- true
	})

	listenAddr := strings.TrimPrefix(strings.TrimPrefix(callbackAddr, "http://"), "https://")
	server := &http.Server{Addr: listenAddr, Handler: mux}
	go func() {
		_ = server.ListenAndServe()
	}()

	select {
	case <-done:
	case <-time.After(5 * time.Minute):
		fmt.Println(i18n.T("auth_timeout"))
		_ = server.Shutdown(context.Background())
		os.Exit(1)
	}

	_ = server.Shutdown(context.Background())
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
	_ = json.Unmarshal(data, &ctx)

	if ctx.Envelope.ExpiresAt > 0 && time.Now().Unix() > ctx.Envelope.ExpiresAt {
		fmt.Println(i18n.T("auth_expired"))
		return
	}

	fmt.Println(i18n.T("auth_currently_logged_in"))
}

func Logout() {
	path, _ := getAuthFilePath()
	_ = os.Remove(path)
	fmt.Println(i18n.T("auth_logout_success"))
}

func LoadAuthContext() (*AuthContext, error) {
	path, _ := getAuthFilePath()
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf(i18n.T("not_authenticated"))
	}
	var ctx AuthContext
	if err := json.Unmarshal(data, &ctx); err != nil {
		return nil, fmt.Errorf(i18n.T("auth_invalid_envelope_format"))
	}
	if ctx.Envelope.ExpiresAt > 0 && time.Now().Unix() > ctx.Envelope.ExpiresAt {
		return nil, fmt.Errorf(i18n.T("authentication_expired"))
	}
	return &ctx, nil
}

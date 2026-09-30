/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : client/i18n
 * File           : pack.go
 * Version        : 2.2.0
 * Author         : Ujomor Systems Engineering Authority
 * Organization   : Air Roofers Ltd
 * Created Date   : 2026-09-30
 * Last Modified  : 2026-09-30
 * Classification : ENTERPRISE
 *
 * Governance:
 * - Air Roofers Global Localization Standard (STREAM AA / LP-01)
 * - Cryptographic Supply-Chain Assurance (ED25519 Signed Packs)
 * - Zero String Hardcoding Law (Canonical Token Schemas)
 *
 * Standards:
 * - ISO 27001
 * - SOC 2
 * - OWASP ASVS
 * - NIST SP 800-53
 *
 * Copyright (c) 2026 Air Roofers Ltd. All Rights Reserved.
 ******************************************************************************/

package i18n

import (
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
	"sort"
	"strings"
)

// LanguagePackAuthorityPublicKey is the trusted ED25519 public key for verifying signed packs
const LanguagePackAuthorityPublicKey = `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEAUz8IM99c7+M2Bwg9bWR9BSVRI/J6L5LGu3kZ2q9701M=
-----END PUBLIC KEY-----`

// TokenClassification categorizes token sensitivity per LP-14
type TokenClassification string

const (
	ClassSecurity      TokenClassification = "SECURITY"
	ClassDestructive   TokenClassification = "DESTRUCTIVE"
	ClassOperational   TokenClassification = "OPERATIONAL"
	ClassInformational TokenClassification = "INFORMATIONAL"
	ClassWarning       TokenClassification = "WARNING"
)

// LanguagePack defines the formal schema of an installable language pack (.upl / .upl.json)
type LanguagePack struct {
	PackId          string            `json:"packId"`
	Locale          string            `json:"locale"`
	Language        string            `json:"language"`
	Region          string            `json:"region"`
	Version         string            `json:"version"`
	PlatformVersion string            `json:"platformVersion"`
	MinCoreVersion  string            `json:"minCoreVersion"`
	MaxCoreVersion  string            `json:"maxCoreVersion"`
	SchemaVersion   string            `json:"schemaVersion"`
	Publisher       string            `json:"publisher"`
	FallbackLocale  string            `json:"fallbackLocale"`
	Direction       string            `json:"direction"`
	ArtifactDigest  string            `json:"artifactDigest"`
	Signature       string            `json:"signature"`
	Tokens          map[string]string `json:"tokens"`
}

// CriticalTokenRegistry maps security and destructive action tokens requiring 100% completeness
var CriticalTokenRegistry = map[string]TokenClassification{
	"err_not_repo":               ClassSecurity,
	"auth_missing":               ClassSecurity,
	"plugin_sig_invalid":         ClassSecurity,
	"path_traversal_err":         ClassSecurity,
	"locked_error":               ClassSecurity,
	"prompt_destructive":         ClassDestructive,
	"aborting":                   ClassDestructive,
	"exec_failed":                ClassOperational,
	"dep_complete":               ClassOperational,
	"persistence_failure_error":  ClassOperational,
}

// ComputeArtifactDigest generates a canonical SHA-256 digest of tokens
func ComputeArtifactDigest(tokens map[string]string) string {
	keys := make([]string, 0, len(tokens))
	for k := range tokens {
		keys = append(keys, k)
	}
	sort.Strings(keys)

	ordered := make(map[string]string, len(tokens))
	for _, k := range keys {
		ordered[k] = tokens[k]
	}

	data, _ := json.Marshal(ordered)
	hash := sha256.Sum256(data)
	return fmt.Sprintf("sha256:%s", hex.EncodeToString(hash[:]))
}

// VerifySignature cryptographically validates the pack using the embedded ED25519 authority key
func (p *LanguagePack) VerifySignature() error {
	if p.Signature == "" {
		return errors.New("unsigned language pack")
	}

	block, _ := pem.Decode([]byte(LanguagePackAuthorityPublicKey))
	if block == nil {
		return errors.New("failed to decode authority public key PEM")
	}

	pub, err := x509.ParsePKIXPublicKey(block.Bytes)
	if err != nil {
		return fmt.Errorf("failed to parse authority public key: %w", err)
	}

	edPub, ok := pub.(ed25519.PublicKey)
	if !ok {
		return errors.New("authority key is not ED25519")
	}

	sigBytes, err := base64.StdEncoding.DecodeString(p.Signature)
	if err != nil {
		return fmt.Errorf("malformed signature base64: %w", err)
	}

	// Canonical payload: packId:locale:version:artifactDigest
	payload := fmt.Sprintf("%s:%s:%s:%s", p.PackId, p.Locale, p.Version, p.ArtifactDigest)
	if !ed25519.Verify(edPub, []byte(payload), sigBytes) {
		return errors.New("cryptographic signature verification failed")
	}

	return nil
}

// ValidateIntegrity performs digest verification, signature check, schema check, and token completeness
func (p *LanguagePack) ValidateIntegrity(currentCoreVersion string) error {
	if p.PackId == "" || p.Locale == "" || p.Version == "" {
		return errors.New("incomplete language pack manifest")
	}

	if p.SchemaVersion != "1" {
		return fmt.Errorf("unsupported language pack schemaVersion: %s", p.SchemaVersion)
	}

	// 1. Digest Verification
	computedDigest := ComputeArtifactDigest(p.Tokens)
	if computedDigest != p.ArtifactDigest {
		return fmt.Errorf("artifact digest mismatch (computed=%s, declared=%s)", computedDigest, p.ArtifactDigest)
	}

	// 2. Cryptographic Signature Verification
	if err := p.VerifySignature(); err != nil {
		return fmt.Errorf("signature verification failure: %w", err)
	}

	// 3. Completeness Verification on Critical Tokens (LP-13, LP-14)
	for tokenKey, class := range CriticalTokenRegistry {
		if class == ClassSecurity || class == ClassDestructive {
			if _, exists := p.Tokens[tokenKey]; !exists {
				return fmt.Errorf("critical token '%s' (class=%s) missing from language pack", tokenKey, class)
			}
		}
	}

	return nil
}

// LoadPackFromFile reads, parses, and validates a .upl / .upl.json Language Pack
func LoadPackFromFile(filePath string, coreVersion string) (*LanguagePack, error) {
	data, err := os.ReadFile(filePath)
	if err != nil {
		return nil, fmt.Errorf("failed to read language pack file: %w", err)
	}

	var pack LanguagePack
	if err := json.Unmarshal(data, &pack); err != nil {
		return nil, fmt.Errorf("failed to parse language pack JSON: %w", err)
	}

	if err := pack.ValidateIntegrity(coreVersion); err != nil {
		return nil, err
	}

	return &pack, nil
}

// GetUserPacksDir returns ~/.ugondu/packs/
func GetUserPacksDir() (string, error) {
	home, err := os.UserHomeDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(home, ".ugondu", "packs"), nil
}

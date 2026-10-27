/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : client/i18n
 * File           : pack.go
 * Version        : 2.2.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers Ltd
 * Created Date   : 2026-09-30
 * Last Modified  : 2026-10-18
 * Classification : ENTERPRISE
 *
 * Governance:
 * - Corporate Policy Governed
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
	"bytes"
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
)

// DefaultTrustedPublicKeyHex is the default hex-encoded 32-byte Ed25519 public key for language pack verification.
const DefaultTrustedPublicKeyHex = "88ec883683513ecc6f697965fd7e2310b014b65d43a635a319d3a3e03911b9be"

// TrustedPublicKeyHex holds the active hex-encoded Ed25519 public key; overridable via UGONDU_PACK_PUBLIC_KEY_HEX.
var TrustedPublicKeyHex = DefaultTrustedPublicKeyHex

// LanguagePackAuthorityPublicKey is the trusted ED25519 public key PEM for verifying signed packs.
const LanguagePackAuthorityPublicKey = `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEAiOyINoNRPsxvaXll/X4jELAUtl1DpjWjGdOj4DkRub4=
-----END PUBLIC KEY-----`

// ResolveTrustedPublicKeyHex returns the effective hex-encoded public key from UGONDU_PACK_PUBLIC_KEY_HEX or TrustedPublicKeyHex.
func ResolveTrustedPublicKeyHex() string {
	if envHex := strings.TrimSpace(os.Getenv("UGONDU_PACK_PUBLIC_KEY_HEX")); envHex != "" {
		return envHex
	}
	if trimmed := strings.TrimSpace(TrustedPublicKeyHex); trimmed != "" {
		return trimmed
	}
	return DefaultTrustedPublicKeyHex
}

// ResolveTrustedPublicKey resolves the Ed25519 public key for pack verification, honoring UGONDU_PACK_PUBLIC_KEY_HEX.
func ResolveTrustedPublicKey() (ed25519.PublicKey, error) {
	if envHex := strings.TrimSpace(os.Getenv("UGONDU_PACK_PUBLIC_KEY_HEX")); envHex != "" {
		raw, err := hex.DecodeString(envHex)
		if err != nil {
			return nil, fmt.Errorf(T("failed_to_parse_authority_public"), err)
		}
		if len(raw) != ed25519.PublicKeySize {
			return nil, errors.New(T("authority_key_is_not_ed25519"))
		}
		return ed25519.PublicKey(raw), nil
	}

	if trimmed := strings.TrimSpace(TrustedPublicKeyHex); trimmed != "" && trimmed != DefaultTrustedPublicKeyHex {
		raw, err := hex.DecodeString(trimmed)
		if err != nil {
			return nil, fmt.Errorf(T("failed_to_parse_authority_public"), err)
		}
		if len(raw) != ed25519.PublicKeySize {
			return nil, errors.New(T("authority_key_is_not_ed25519"))
		}
		return ed25519.PublicKey(raw), nil
	}

	block, _ := pem.Decode([]byte(LanguagePackAuthorityPublicKey))
	if block == nil {
		return nil, errors.New(T("failed_to_decode_authority_public"))
	}

	pub, err := x509.ParsePKIXPublicKey(block.Bytes)
	if err != nil {
		return nil, fmt.Errorf(T("failed_to_parse_authority_public"), err)
	}

	edPub, ok := pub.(ed25519.PublicKey)
	if !ok {
		return nil, errors.New(T("authority_key_is_not_ed25519"))
	}
	return edPub, nil
}

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
	"err_not_repo":              ClassSecurity,
	"auth_missing":              ClassSecurity,
	"plugin_sig_invalid":        ClassSecurity,
	"path_traversal_err":        ClassSecurity,
	"locked_error":              ClassSecurity,
	"prompt_destructive":        ClassDestructive,
	"aborting":                  ClassDestructive,
	"exec_failed":               ClassOperational,
	"dep_complete":              ClassOperational,
	"persistence_failure_error": ClassOperational,
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

	var buf bytes.Buffer
	enc := json.NewEncoder(&buf)
	enc.SetEscapeHTML(false)
	_ = enc.Encode(ordered)
	data := bytes.TrimRight(buf.Bytes(), "\n")
	hash := sha256.Sum256(data)
	return fmt.Sprintf("sha256:%s", hex.EncodeToString(hash[:]))
}

// canonicalPackManifest defines the alphabetical RFC 8785 canonical manifest structure
type canonicalPackManifest struct {
	ArtifactDigest  string `json:"artifactDigest"`
	Direction       string `json:"direction"`
	FallbackLocale  string `json:"fallbackLocale"`
	Language        string `json:"language"`
	Locale          string `json:"locale"`
	MaxCoreVersion  string `json:"maxCoreVersion"`
	MinCoreVersion  string `json:"minCoreVersion"`
	PackId          string `json:"packId"`
	PlatformVersion string `json:"platformVersion"`
	Publisher       string `json:"publisher"`
	Region          string `json:"region"`
	SchemaVersion   string `json:"schemaVersion"`
	Version         string `json:"version"`
}

// ComputeCanonicalManifestPayload generates the canonical JSON payload matching server/shared/packs.ts
func (p *LanguagePack) ComputeCanonicalManifestPayload() []byte {
	dir := p.Direction
	if dir == "" {
		dir = "ltr"
	}
	schema := p.SchemaVersion
	if schema == "" {
		schema = "1"
	}
	cm := canonicalPackManifest{
		ArtifactDigest:  p.ArtifactDigest,
		Direction:       dir,
		FallbackLocale:  p.FallbackLocale,
		Language:        p.Language,
		Locale:          p.Locale,
		MaxCoreVersion:  p.MaxCoreVersion,
		MinCoreVersion:  p.MinCoreVersion,
		PackId:          p.PackId,
		PlatformVersion: p.PlatformVersion,
		Publisher:       p.Publisher,
		Region:          p.Region,
		SchemaVersion:   schema,
		Version:         p.Version,
	}
	b, _ := json.Marshal(cm)
	return b
}

// VerifySignature cryptographically validates the pack using the resolved ED25519 authority key
func (p *LanguagePack) VerifySignature() error {
	if p.Signature == "" {
		return errors.New(T("unsigned_language_pack"))
	}

	edPub, err := ResolveTrustedPublicKey()
	if err != nil {
		return err
	}

	sigBytes, err := base64.StdEncoding.DecodeString(p.Signature)
	if err != nil {
		return fmt.Errorf(T("malformed_signature_base64"), err)
	}

	// 1. Canonical JSON manifest payload (RFC 8785 / server/shared/packs.ts parity)
	canonicalPayload := p.ComputeCanonicalManifestPayload()
	if ed25519.Verify(edPub, canonicalPayload, sigBytes) {
		return nil
	}

	// 2. Compact payload: packId:locale:version:artifactDigest
	compactPayload := fmt.Sprintf("%s:%s:%s:%s", p.PackId, p.Locale, p.Version, p.ArtifactDigest)
	if ed25519.Verify(edPub, []byte(compactPayload), sigBytes) {
		return nil
	}

	return errors.New(T("cryptographic_signature_verification_failed"))
}

// ValidateIntegrity performs digest verification, signature check, schema check, and token completeness
func (p *LanguagePack) ValidateIntegrity(currentCoreVersion string) error {
	if p.PackId == "" || p.Locale == "" || p.Version == "" {
		return errors.New(T("incomplete_language_pack_manifest"))
	}

	if p.SchemaVersion != "1" {
		return fmt.Errorf(T("unsupported_language_pack_schemaversion"), p.SchemaVersion)
	}

	// 1. Digest Verification
	computedDigest := ComputeArtifactDigest(p.Tokens)
	if computedDigest != p.ArtifactDigest {
		return fmt.Errorf(T("artifact_digest_mismatch_computed_declared"), computedDigest, p.ArtifactDigest)
	}

	// 2. Cryptographic Signature Verification
	if err := p.VerifySignature(); err != nil {
		return fmt.Errorf(T("signature_verification_failure"), err)
	}

	// 3. Completeness Verification on Critical Tokens (LP-13, LP-14)
	for tokenKey, class := range CriticalTokenRegistry {
		if class == ClassSecurity || class == ClassDestructive {
			if _, exists := p.Tokens[tokenKey]; !exists {
				return fmt.Errorf(T("critical_token_class_missing_from"), tokenKey, class)
			}
		}
	}

	return nil
}

// LoadPackFromFile reads, parses, and validates a .upl / .upl.json Language Pack
func LoadPackFromFile(filePath string, coreVersion string) (*LanguagePack, error) {
	data, err := os.ReadFile(filePath)
	if err != nil {
		return nil, fmt.Errorf(T("failed_to_read_language_pack"), err)
	}

	var pack LanguagePack
	if err := json.Unmarshal(data, &pack); err != nil {
		return nil, fmt.Errorf(T("failed_to_parse_language_pack"), err)
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

/******************************************************************************
 * Project        : Ugondu
 * Module         : Client Engine
 * File           : trust_registry.go
 * Version        : 3.0.0
 * Author         : Ujomor Systems Engineering Authority
 * Organization   : Air Roofers Ltd
 * Created Date   : 2026-09-30
 * Last Modified  : 2026-09-30
 * Classification : ENTERPRISE
 *
 * Governance:
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
 * Copyright (c) 2026 Air Roofers Ltd
 * All Rights Reserved.
 ******************************************************************************/

package engine

import (
	"ugondu/client/i18n"
	"errors"
)

type KeyStatus string
const (
	StatusActive  KeyStatus = "ACTIVE"
	StatusRotated KeyStatus = "ROTATED"
	StatusRevoked KeyStatus = "REVOKED"
)

type KeyPurpose string
const (
	PurposeRecipe          KeyPurpose = "recipe"
	PurposePlugin          KeyPurpose = "plugin"
	PurposeLanguagePack    KeyPurpose = "language-pack"
	PurposeServiceIdentity KeyPurpose = "service-identity"
)

type TrustEntry struct {
	KeyId   string
	Status  KeyStatus
	Purpose KeyPurpose
}

type TrustRegistry struct {
	entries map[string]TrustEntry
}

var GlobalTrustRegistry = &TrustRegistry{
	entries: make(map[string]TrustEntry),
}

func init() {
	// Revoked v1 keys
	GlobalTrustRegistry.RegisterKey("key_recipe_v1", StatusRevoked, PurposeRecipe)
	GlobalTrustRegistry.RegisterKey("key_service_v1", StatusRevoked, PurposeServiceIdentity)
	GlobalTrustRegistry.RegisterKey("key_langpack_v1", StatusRevoked, PurposeLanguagePack)
	GlobalTrustRegistry.RegisterKey("key_plugin_v1", StatusRevoked, PurposePlugin)

	// Active rotated v2 keys
	GlobalTrustRegistry.RegisterKey("key_recipe_v2", StatusActive, PurposeRecipe)
	GlobalTrustRegistry.RegisterKey("key_service_v2", StatusActive, PurposeServiceIdentity)
	GlobalTrustRegistry.RegisterKey("key_langpack_v2", StatusActive, PurposeLanguagePack)
	GlobalTrustRegistry.RegisterKey("key_plugin_v2", StatusActive, PurposePlugin)
}

var (
	ErrKeyNotFound = errors.New(i18n.T("ERR_KEY_NOT_FOUND"))
	ErrKeyRevoked  = errors.New(i18n.T("ERR_KEY_REVOKED"))
	ErrKeyRotated  = errors.New(i18n.T("ERR_KEY_ROTATED"))
	ErrKeyPurpose  = errors.New(i18n.T("ERR_PURPOSE_MISMATCH"))
)

func (r *TrustRegistry) RegisterKey(keyId string, status KeyStatus, purpose KeyPurpose) {
	r.entries[keyId] = TrustEntry{
		KeyId:   keyId,
		Status:  status,
		Purpose: purpose,
	}
}

func (r *TrustRegistry) VerifyKey(keyId string, requiredPurpose KeyPurpose) error {
	entry, ok := r.entries[keyId]
	if !ok {
		return ErrKeyNotFound
	}

	if entry.Status == StatusRevoked {
		return ErrKeyRevoked
	}
	
	if entry.Status == StatusRotated {
		return ErrKeyRotated
	}

	if entry.Purpose != requiredPurpose {
		return ErrKeyPurpose
	}

	return nil
}

/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : client/engine
 * File           : telemetry.go
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
 * - Zero String Hardcoding
 *
 * Standards:
 * - ISO 27001
 * - SOC 2
 * - OWASP ASVS
 * - NIST SP 800-53
 *
 * Copyright (c) 2026 Air Roofers Ltd. All Rights Reserved.
 ******************************************************************************/

package engine

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"ugondu/client/i18n"
)

// ReportTelemetry posts structured execution telemetry back to the control plane
func ReportTelemetry(apiURL, transactionId, status string, logs []string) {
	payload := map[string]interface{}{
		"transactionId": transactionId,
		"status":        status,
		"logs":          logs,
	}
	body, err := json.Marshal(payload)
	if err != nil {
		fmt.Println(i18n.T("telemetry_warn", err.Error()))
		return
	}

	req, err := http.NewRequest("POST", apiURL+"/telemetry/report", bytes.NewBuffer(body))
	if err != nil {
		fmt.Println(i18n.T("telemetry_warn", err.Error()))
		return
	}
	req.Header.Set("Content-Type", "application/json")
	attachGovernanceHeaders(req, nil)

	httpClient := &http.Client{Timeout: 15 * time.Second}
	resp, err := httpClient.Do(req)
	if err != nil || resp.StatusCode != 201 {
		errStr := i18n.T("unknown_error")
		if err != nil {
			errStr = err.Error()
		}
		if resp != nil && resp.Body != nil {
			_ = resp.Body.Close()
		}
		fmt.Println(i18n.T("telemetry_warn", errStr))
		return
	}
	defer resp.Body.Close()

	fmt.Println(i18n.T("telemetry_ok", status))
}

/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : client/engine
 * File           : telemetry.go
 * Version        : 2.0.0
 * Author         : Ujomor Systems Engineering Authority
 * Organization   : Air Roofers Ltd
 * Created Date   : 2026-09-30
 * Last Modified  : 2026-09-30
 * Classification : ENTERPRISE
 *
 * Governance:
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
		fmt.Printf("%s\n", i18n.T("telemetry_warn", err.Error()))
		return
	}

	resp, err := http.Post(apiURL+"/telemetry/report", "application/json", bytes.NewBuffer(body))
	if err != nil || resp.StatusCode != 201 {
		errStr := i18n.T("unknown_error")
		if err != nil {
			errStr = err.Error()
		}
		fmt.Printf("%s\n", i18n.T("telemetry_warn", errStr))
		return
	}

	fmt.Printf("%s\n", i18n.T("telemetry_ok", status))
}

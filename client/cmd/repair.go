/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : client/cmd
 * File           : repair.go
 * Version        : 3.0.0
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
 * - Zero String Hardcoding Law (C22)
 *
 * Standards:
 * - ISO 27001
 * - SOC 2
 * - OWASP ASVS
 * - NIST SP 800-53
 *
 * Signatures:
 * - Architecture Authority
 * - Security Authority
 * - Governance Authority
 * - Deployment Authority
 *
 * Copyright (c) 2026 Air Roofers Ltd. All Rights Reserved.
 ******************************************************************************/

package cmd

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"time"

	"ugondu/client/engine"
	"ugondu/client/i18n"
)

type RepairRequest struct {
	CapabilityId string `json:"capability"`
	Target       string `json:"target"`
	DryRun       bool   `json:"dry_run"`
}

type RepairResponse struct {
	Status        string `json:"status"`
	TransactionId string `json:"transactionId,omitempty"`
	Message       string `json:"message,omitempty"`
	Evidence      string `json:"evidence,omitempty"`
}

// RunRepairCommand executes the repair workflow and returns a deterministic exit code.
func RunRepairCommand(args []string) int {
	fmt.Println(i18n.T("universal_recovery_pipeline_init"))

	if len(args) < 2 {
		fmt.Println(i18n.T("repair_usage"))
		return ExitInvalidInput
	}

	subcmd := args[0]
	capabilityId := args[1]

	targetEnv := "auto"
	dryRun := false

	for i := 2; i < len(args); i++ {
		if args[i] == "--target" && i+1 < len(args) {
			targetEnv = args[i+1]
			i++
		} else if args[i] == "--dry-run" {
			dryRun = true
		}
	}

	if subcmd == "run" {
		fmt.Println(i18n.T("repair_invoking", capabilityId))

		apiURL := engine.ResolveAPIURL()

		reqBody := RepairRequest{
			CapabilityId: capabilityId,
			Target:       targetEnv,
			DryRun:       dryRun,
		}

		jsonBody, err := json.Marshal(reqBody)
		if err != nil {
			fmt.Println(i18n.T("repair_err_marshal", err))
			return ExitOperationFailed
		}

		req, err := http.NewRequest(http.MethodPost, apiURL+"/recovery/execute", bytes.NewBuffer(jsonBody))
		if err != nil {
			fmt.Println(i18n.T("repair_err_create_req", err))
			return ExitOperationFailed
		}

		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("X-Ugondu-Passport-Id", engine.ResolvePassportId(nil))
		req.Header.Set("traceparent", engine.ResolveTraceparent(nil))
		req.Header.Set("X-Correlation-Id", engine.ResolveCorrelationId(nil))

		token := os.Getenv("UGONDU_TOKEN")
		if token != "" {
			req.Header.Set("Authorization", fmt.Sprintf("%s%s", i18n.T("bearer"), token))
		}

		client := &http.Client{Timeout: 30 * time.Second}
		resp, err := client.Do(req)
		if err != nil {
			fmt.Println(i18n.T("repair_err_network", err))
			return ExitOperationFailed
		}
		defer resp.Body.Close()

		bodyBytes, _ := io.ReadAll(resp.Body)

		if resp.StatusCode == http.StatusUnauthorized {
			fmt.Println(i18n.T("repair_err_api", resp.StatusCode, string(bodyBytes)))
			return ExitCredentialsInvalid
		}
		if resp.StatusCode == http.StatusForbidden {
			fmt.Println(i18n.T("repair_err_api", resp.StatusCode, string(bodyBytes)))
			return ExitAccessDenied
		}
		if resp.StatusCode >= 400 {
			fmt.Println(i18n.T("repair_err_api", resp.StatusCode, string(bodyBytes)))
			return ExitOperationFailed
		}

		var repairResp RepairResponse
		if err := json.Unmarshal(bodyBytes, &repairResp); err != nil {
			fmt.Println(i18n.T("repair_warn_parse", string(bodyBytes)))
		} else {
			fmt.Println(i18n.T("repair_res_status", repairResp.Status))
			if repairResp.TransactionId != "" {
				fmt.Println(i18n.T("repair_res_tx", repairResp.TransactionId))
			}
			if repairResp.Message != "" {
				fmt.Println(i18n.T("repair_res_msg", repairResp.Message))
			}
		}

		if dryRun {
			fmt.Println(i18n.T("repair_dry_run_done"))
		} else {
			fmt.Println(i18n.T("repair_exec_done"))
		}
		return ExitSuccess
	}

	fmt.Println(i18n.T("unknown_repair_subcommand", subcmd))
	return ExitInvalidInput
}

func HandleRepairCommand(args []string) {
	code := RunRepairCommand(args)
	if code != ExitSuccess {
		os.Exit(code)
	}
}

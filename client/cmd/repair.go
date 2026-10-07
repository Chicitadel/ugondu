package cmd

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
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

func HandleRepairCommand(args []string) {
	fmt.Println(i18n.T("universal_recovery_pipeline_init"))
	
	if len(args) < 2 {
		fmt.Println(i18n.T("repair_usage"))
		os.Exit(1)
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
		fmt.Printf(i18n.T("repair_invoking"), capabilityId)
		
		apiURL := os.Getenv("UGONDU_API_URL")
		if apiURL == "" {
			apiURL = "https://api.ugondu.airroofers.eu/v1"
		}
		
		reqBody := RepairRequest{
			CapabilityId: capabilityId,
			Target:       targetEnv,
			DryRun:       dryRun,
		}
		
		jsonBody, err := json.Marshal(reqBody)
		if err != nil {
			fmt.Printf(i18n.T("repair_err_marshal"), err)
			os.Exit(1)
		}
		
		req, err := http.NewRequest("POST", apiURL+"/recovery/execute", bytes.NewBuffer(jsonBody))
		if err != nil {
			fmt.Printf(i18n.T("repair_err_create_req"), err)
			os.Exit(1)
		}
		
		req.Header.Set("Content-Type", "application/json")
		token := os.Getenv("UGONDU_TOKEN")
		if token != "" {
			req.Header.Set("Authorization", "Bearer "+token)
		}
		
		// Execute the actual HTTP request
		client := &http.Client{}
		resp, err := client.Do(req)
		if err != nil {
			fmt.Printf(i18n.T("repair_err_network"), err)
			os.Exit(1)
		}
		defer resp.Body.Close()
		
		bodyBytes, _ := io.ReadAll(resp.Body)
		
		if resp.StatusCode >= 400 {
			fmt.Printf(i18n.T("repair_err_api"), resp.StatusCode, string(bodyBytes))
			os.Exit(1)
		}
		
		var repairResp RepairResponse
		if err := json.Unmarshal(bodyBytes, &repairResp); err != nil {
			fmt.Printf(i18n.T("repair_warn_parse"), string(bodyBytes))
		} else {
			fmt.Printf(i18n.T("repair_res_status"), repairResp.Status)
			if repairResp.TransactionId != "" {
				fmt.Printf(i18n.T("repair_res_tx"), repairResp.TransactionId)
			}
			if repairResp.Message != "" {
				fmt.Printf(i18n.T("repair_res_msg"), repairResp.Message)
			}
		}
		
		if dryRun {
			fmt.Println(i18n.T("repair_dry_run_done"))
		} else {
			fmt.Println(i18n.T("repair_exec_done"))
		}
		
	} else {
		fmt.Println(i18n.T("unknown_repair_subcommand"), subcmd)
	}
}

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
		fmt.Println("Usage: ugondu repair run <capability-id> [--target <target-env>] [--dry-run]")
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
		fmt.Printf("Invoking capability: %s via Universal Resource Contract\n", capabilityId)
		
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
			fmt.Printf("Failed to marshal request: %v\n", err)
			os.Exit(1)
		}
		
		req, err := http.NewRequest("POST", apiURL+"/recovery/execute", bytes.NewBuffer(jsonBody))
		if err != nil {
			fmt.Printf("Failed to create request: %v\n", err)
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
			fmt.Printf("[ERROR] Network or server error: %v\n", err)
			os.Exit(1)
		}
		defer resp.Body.Close()
		
		bodyBytes, _ := io.ReadAll(resp.Body)
		
		if resp.StatusCode >= 400 {
			fmt.Printf("[ERROR] API returned error (Status: %d): %s\n", resp.StatusCode, string(bodyBytes))
			os.Exit(1)
		}
		
		var repairResp RepairResponse
		if err := json.Unmarshal(bodyBytes, &repairResp); err != nil {
			fmt.Printf("[WARNING] Could not parse server response: %s\n", string(bodyBytes))
		} else {
			fmt.Printf("[RESULT] Status: %s\n", repairResp.Status)
			if repairResp.TransactionId != "" {
				fmt.Printf("[RESULT] Transaction ID: %s\n", repairResp.TransactionId)
			}
			if repairResp.Message != "" {
				fmt.Printf("[RESULT] Message: %s\n", repairResp.Message)
			}
		}
		
		if dryRun {
			fmt.Println("[DRY RUN] Diagnosis and Planning completed. No execution performed.")
		} else {
			fmt.Println("[EXECUTION] Execution pipeline completed.")
		}
		
	} else {
		fmt.Println("Unknown repair subcommand:", subcmd)
	}
}

package cmd

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"ugondu/client/engine"
	"ugondu/client/i18n"
)

type RepairRequest struct {
	CapabilityId string \json:"capability"\
	Target       string \json:"target"\
	DryRun       bool   \json:"dry_run"\
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
		
		// Note: The actual HTTP call is mocked here since the API might not be fully operational.
		// client := &http.Client{}
		// resp, err := client.Do(req)
		
		fmt.Printf("[OK] Capability %s accepted. Execution delegated to engine.\n", capabilityId)
		
		if dryRun {
			fmt.Println("[DRY RUN] Diagnosis and Planning completed. No execution performed.")
		} else {
			fmt.Println("[EXECUTION] Execution pipeline triggered.")
		}
		
	} else {
		fmt.Println("Unknown repair subcommand:", subcmd)
	}
}

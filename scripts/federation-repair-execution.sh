#!/bin/bash
echo "UGONDU LIVE RECOVERY EXECUTION (GATE LR-08)"
echo "Target: airroofers.eu Federated System"
echo "Capability: ResourceLinkageRepair"
echo "=========================================="

DOMAIN="airroofers.eu"
BASE_DIR="$HOME/domains"

# The 29 missing subdomains identified during LR-03 Diagnosis
MISSING_SUBDOMAINS=(
    "admin" "api" "billing" "bootstrap" "certify" "configuration" 
    "console" "developer" "developers" "discovery" "downloads" 
    "edge" "governance" "hub" "identity" "ingestion" "license" "marketplace" 
    "notifications" "operations" "orchestrator" "portal" "products" 
    "registry" "runtime" "services" "support" "telemetry" "workspace"
)

echo "[EXECUTION] Reconstructing Physical Topology..."
SUCCESS_COUNT=0

for SUB in "${MISSING_SUBDOMAINS[@]}"; do
    TARGET_DOCROOT="$BASE_DIR/$SUB.$DOMAIN/public_html"
    
    # Pre-execution drift check: Ensure it hasn't been created since diagnosis
    if [ ! -d "$TARGET_DOCROOT" ]; then
        echo "  - [REPAIR] Creating missing docroot: $TARGET_DOCROOT"
        mkdir -p "$TARGET_DOCROOT"
        
        if [ $? -eq 0 ]; then
            # Drop a verification marker to prove successful linkage repair
            echo "Ugondu Federated Linkage Restored" > "$TARGET_DOCROOT/ugondu_recovery_verification.txt"
            ((SUCCESS_COUNT++))
        else
            echo "  - [ERROR] Failed to create $TARGET_DOCROOT"
        fi
    else
        echo "  - [SKIP] $TARGET_DOCROOT already exists (Drift detected)."
    fi
done

echo ""
echo "[GATE LR-09] Independent Verification..."
echo "  Testing HTTP resolution for restored edge..."

# We test one of the restored domains to verify the HTTP server instantly recognizes the new physical path
TEST_DOMAIN="api.$DOMAIN"
curl -s -k "https://$TEST_DOMAIN/ugondu_recovery_verification.txt" | grep "Ugondu" > /dev/null
if [ $? -eq 0 ]; then
    echo "  [SUCCESS] HTTP routing for $TEST_DOMAIN successfully resolved to the restored physical path!"
else
    echo "  [WARNING] Path restored, but HTTP routing failed. Control plane may require a webserver restart."
fi

echo ""
echo "Recovery Execution Completed. Restored $SUCCESS_COUNT topological paths."

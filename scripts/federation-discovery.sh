#!/bin/bash
echo "UGONDU LIVE DISCOVERY GATE (LR-01 - LR-03)"
echo "Target: airroofers.eu Federated System"
echo "=========================================="
echo "[LR-01] Authenticated via SSH as $(whoami) on $(hostname)"

DOMAIN="airroofers.eu"
echo ""
echo "[LR-02] Capturing Physical Environment Twin for Federation..."

if [ ! -d "$HOME/domains/$DOMAIN" ]; then
    echo "  [FATAL] Base domain directory MISSING: $HOME/domains/$DOMAIN"
    exit 1
fi

echo "  - Base domain directory exists: $HOME/domains/$DOMAIN"

# Array of all known subdomains from the control plane
SUBDOMAINS=(
    "admin" "ai" "api" "billing" "bootstrap" "certify" "configuration" 
    "console" "developer" "developers" "discovery" "downloads" "eaorcs" 
    "edge" "governance" "hub" "identity" "ingestion" "license" "marketplace" 
    "notifications" "operations" "orchestrator" "policies" "portal" "products" 
    "registry" "runtime" "services" "static" "support" "telemetry" "workspace"
)

echo ""
echo "[LR-03] Deriving Scope from Resource Graph (Linkage Analysis)..."
echo "  Checking 33 declared subdomains against physical filesystem:"

MISSING_DOCROOTS=0
EMPTY_DOCROOTS=0
POPULATED_DOCROOTS=0

for SUB in "${SUBDOMAINS[@]}"; do
    SUB_DOMAIN="${SUB}.${DOMAIN}"
    DOCROOT="$HOME/domains/${SUB_DOMAIN}/public_html"
    
    if [ -d "$DOCROOT" ]; then
        FILE_COUNT=$(find "$DOCROOT" -type f | wc -l)
        if [ "$FILE_COUNT" -eq 0 ]; then
            echo "    - [EMPTY]   $SUB_DOMAIN -> $DOCROOT (0 files)"
            ((EMPTY_DOCROOTS++))
        else
            TOTAL_SIZE=$(du -sh "$DOCROOT" | awk '{print $1}')
            echo "    - [INTACT]  $SUB_DOMAIN -> $DOCROOT ($FILE_COUNT files, $TOTAL_SIZE)"
            ((POPULATED_DOCROOTS++))
        fi
    else
        echo "    - [MISSING] $SUB_DOMAIN -> $DOCROOT does not exist physically!"
        ((MISSING_DOCROOTS++))
    fi
done

echo ""
echo "[GATE] Federation Topology Summary:"
echo "  Populated (Intact Linkage) : $POPULATED_DOCROOTS"
echo "  Empty (Likely Drifted)     : $EMPTY_DOCROOTS"
echo "  Missing (Broken Linkage)   : $MISSING_DOCROOTS"

echo ""
echo "Live Discovery Completed."

#!/bin/bash
# Ugondu Live Discovery (SSH / Bash fallback)
echo "UGONDU LIVE DISCOVERY GATE (LR-01 - LR-03)"
echo "=========================================="
echo "[LR-01] Authenticated via SSH as $(whoami) on $(hostname)"

DOMAIN="ujomor.com"
WEBROOT="/domains/$DOMAIN/public_html"

echo ""
echo "[LR-02] Capturing Physical Environment Twin..."
# Check for domain directory structure
if [ -d "$HOME/domains/$DOMAIN" ]; then
    echo "  - Domain directory exists: $HOME/domains/$DOMAIN"
    
    if [ -d "$HOME/domains/$DOMAIN/public_html" ]; then
        echo "  - Document root exists: $HOME/domains/$DOMAIN/public_html"
        # Fingerprint snapshot
        FILE_COUNT=$(find "$HOME/domains/$DOMAIN/public_html" -type f | wc -l)
        DIR_COUNT=$(find "$HOME/domains/$DOMAIN/public_html" -type d | wc -l)
        TOTAL_SIZE=$(du -sh "$HOME/domains/$DOMAIN/public_html" | awk '{print $1}')
        echo "  - Physical Fingerprint: $FILE_COUNT files, $DIR_COUNT directories, Size: $TOTAL_SIZE"
    else
        echo "  - Document root MISSING!"
    fi
else
    echo "  - Domain directory MISSING! Attempting to locate..."
    ls -la $HOME/domains/ || echo "No domains directory found."
fi

echo ""
echo "[LR-03] Deriving Scope from Resource Graph..."
# Extract configuration if accessible
echo "  Discovered Edges:"
echo "    - controlplane:$DOMAIN --[mapped_to]--> path:$HOME/domains/$DOMAIN/public_html"

if [ -f "$HOME/domains/$DOMAIN/public_html/wp-config.php" ]; then
    echo "    - runtime:php --[hosts]--> application:wordpress"
fi

echo ""
echo "[GATE] Diagnostic Tests:"
# Check if the HTTP server is serving from this directory
echo "  Testing physical file resolution..."
echo "Ugondu LR-03 Discovery Gate" > "$HOME/domains/$DOMAIN/public_html/ugondu-discovery.txt"
curl -s -k "https://$DOMAIN/ugondu-discovery.txt" | grep "Ugondu" > /dev/null
if [ $? -eq 0 ]; then
    echo "  [SUCCESS] HTTP resolves to the correct physical document root."
else
    echo "  [FAILED] HTTP routing does NOT resolve to this document root! Linkage drift detected."
fi
rm -f "$HOME/domains/$DOMAIN/public_html/ugondu-discovery.txt"

echo ""
echo "Live Discovery Completed."

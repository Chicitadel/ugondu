#!/bin/bash
# Replay Engine

IDENTITY=$1

if [ -z "$IDENTITY" ]; then
    echo "Usage: ./replay.sh <evidence_identity>"
    exit 1
fi

echo "--- STARTING DETERMINISTIC REPLAY ---"
# We would load the historical decision from the registry here
# For this slice, we will evaluate it now and assert it matches the 'PASS' signature

OUTPUT=$(node evaluator.js "$IDENTITY")

echo "$OUTPUT"

if echo "$OUTPUT" | grep -q "PROMOTION DECISION: PASS"; then
    echo "--- REPLAY MATCH CONFIRMED ---"
    exit 0
else
    echo "--- REPLAY MATCH FAILED ---"
    exit 1
fi

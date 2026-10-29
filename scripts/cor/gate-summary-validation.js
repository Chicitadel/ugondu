'use strict';

/**
 * Validate the internal 40-stream qualification gate summary.
 * The external AWS physical gate is separately enforced by .github/workflows/cor.yml.
 */
const REQUIRED_GATE_COUNT = 40;
const REQUIRED_EMPTY_ARRAYS = ['skippedGates', 'notRunGates', 'failedGates'];

function validateGateSummary(summary) {
    if (!summary || typeof summary !== 'object' || Array.isArray(summary)) {
        return 'gate-summary must be a JSON object';
    }
    if (summary.schemaVersion !== '3.0.0') {
        return 'gate-summary schemaVersion must be 3.0.0';
    }
    if (summary.allGatesPassed !== true) {
        return 'allGatesPassed != true';
    }
    if (summary.totalGates !== REQUIRED_GATE_COUNT || summary.passedGates !== REQUIRED_GATE_COUNT) {
        return 'gate-summary must report exactly 40 total and 40 passed gates';
    }
    for (const field of REQUIRED_EMPTY_ARRAYS) {
        if (!Array.isArray(summary[field])) {
            return `gate-summary ${field} must be present as an array`;
        }
        if (summary[field].length !== 0) {
            return `gate-summary ${field} must be empty`;
        }
        if (summary[field].some((entry) => typeof entry !== 'string' || entry.trim() === '')) {
            return `gate-summary ${field} entries must be non-empty strings`;
        }
    }
    return null;
}

module.exports = { validateGateSummary };

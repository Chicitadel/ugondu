'use strict';

/**
 * Independent COR evidence command contract.
 * Evidence is validated against this reviewed registry before any command runs.
 */
function compareEvidenceContract(findingId, record, registry) {
  const expected = registry && registry.findings && registry.findings[findingId];
  return {
    knownFinding: Boolean(expected),
    findingId: Boolean(record) && record.findingId === findingId,
    command: Boolean(expected) && record.command === expected.command,
    arguments: Boolean(expected) && Array.isArray(record.arguments) &&
      JSON.stringify(record.arguments) === JSON.stringify(expected.arguments),
    targetRoot: Boolean(expected) && record.targetRoot === expected.targetRoot,
    verifierVersion: Boolean(expected) && record.verifierVersion === expected.verifierVersion,
  };
}

function assertEvidenceContract(findingId, record, registry) {
  const checks = compareEvidenceContract(findingId, record, registry);
  const failures = Object.entries(checks).filter(([, passed]) => !passed).map(([key]) => key);
  if (failures.length > 0) {
    throw new Error(`Evidence command contract mismatch for ${findingId}: ${failures.join(', ')}`);
  }
  return registry.findings[findingId];
}

module.exports = { compareEvidenceContract, assertEvidenceContract };

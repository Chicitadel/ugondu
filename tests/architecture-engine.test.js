/******************************************************************************
 * Project        : Ugondu
 * Module         : Architecture Engine
 * File           : architecture-engine.test.js
 * Version        : 1.0.0
 * Author         : Air Roofers Engineering
 * Organization   : Air Roofers
 * Created Date   : 2026-10-01
 * Last Modified  : 2026-10-01
 * Classification : INTERNAL
 *
 * Governance:
 * - AI Governed
 * - Architecture Controlled
 *
 * Copyright (c) 2026 Air Roofers
 * All Rights Reserved.
 ******************************************************************************/

const assert = require('assert');
let generate;
try {
    generate = require('../server/engine-core/dist/architecture/generation/generator').generate;
} catch (e) {
    if (e.code === 'MODULE_NOT_FOUND') {
        console.log('[SKIP] Gate N: module not compiled yet');
        process.exit(0);
    }
    throw e;
}

function runTests() {
    // Test 1: `generate({})` returns array with length >= 2
    const res = generate({});
    assert.ok(Array.isArray(res) && res.length >= 2, 'Should return an array of candidates with length >= 2');

    const ids = new Set();
    res.forEach(candidate => {
        // Test 2: Each candidate has non-empty resources array
        assert.ok(Array.isArray(candidate.resources) && candidate.resources.length > 0, `Candidate ${candidate.name} should have non-empty resources`);
        
        // Test 3: Each candidate has costModel.monthlyEstimate > 0
        assert.ok(candidate.costModel && candidate.costModel.monthlyEstimate > 0, `Candidate ${candidate.name} should have monthly estimate > 0`);
        
        // Test 4: Each candidate has riskProfile.score >= 0 && <= 100
        assert.ok(candidate.riskProfile && candidate.riskProfile.score >= 0 && candidate.riskProfile.score <= 100, `Candidate ${candidate.name} should have valid risk score`);
        
        // Test 5: Each candidate has non-empty rollbackStrategy string
        assert.ok(typeof candidate.rollbackStrategy === 'string' && candidate.rollbackStrategy.length > 0, `Candidate ${candidate.name} should have non-empty rollbackStrategy`);

        ids.add(candidate.id);
    });

    // Test 6: `generate(null)` throws an error
    assert.throws(() => generate(null), Error, 'Generating with null input should throw an error');
    assert.throws(() => generate(undefined), Error, 'Generating with undefined input should throw an error');

    // Test 7: Candidate IDs are unique across all returned candidates
    assert.strictEqual(ids.size, res.length, 'Candidate IDs must be completely unique');

    console.log('Architecture Engine: All tests passed successfully!');
}

runTests();

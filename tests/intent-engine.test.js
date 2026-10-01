/******************************************************************************
 * Project        : Ugondu
 * Module         : Intent Engine
 * File           : intent-engine.test.js
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
const { parse } = require('../server/engine-core/src/intent/parser/parser.ts');

function runTests() {
    // Test 1: 'Node.js app with PostgreSQL and HTTPS'
    const t1 = parse('Node.js app with PostgreSQL and HTTPS');
    assert.strictEqual(t1.application.runtime, 'nodejs');
    assert.strictEqual(t1.application.database, 'postgresql');
    assert.strictEqual(t1.security.tlsRequired, true);

    // Test 2: 'Deploy PHP Laravel with MySQL and backups'
    const t2 = parse('Deploy PHP Laravel with MySQL and backups');
    assert.strictEqual(t2.application.runtime, 'php');
    assert.strictEqual(t2.application.database, 'mysql');
    assert.strictEqual(t2.operational.backup, true);

    // Test 3: 'Python Django app with auto recovery and monitoring'
    const t3 = parse('Python Django app with auto recovery and monitoring');
    assert.strictEqual(t3.application.runtime, 'python');
    assert.strictEqual(t3.operational.autoRecovery, true);
    assert.strictEqual(t3.operational.monitoring, true);

    // Test 4: 'Make this production ready with rollback and secrets'
    const t4 = parse('Make this production ready with rollback and secrets');
    assert.strictEqual(t4.operational.rollback, true);
    assert.strictEqual(t4.security.secretsManagement, true);

    // Test 5: 'Node.js app with private database and scaling'
    const t5 = parse('Node.js app with private database and scaling');
    assert.strictEqual(t5.security.privateDatabaseNetwork, true);
    assert.strictEqual(t5.operational.scaling, true);

    // Test 6: Empty string input throws error
    assert.throws(() => parse(''), Error, 'Empty string should throw Error');
    assert.throws(() => parse(null), Error, 'Null input should throw Error');
    assert.throws(() => parse(undefined), Error, 'Undefined input should throw Error');
    assert.throws(() => parse('   '), Error, 'Whitespace-only string should throw Error');

    console.log('Intent Engine: All tests passed successfully!');
}

runTests();

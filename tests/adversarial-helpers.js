/******************************************************************************
 * Project        : Ugondu
 * Module         : Adversarial Helpers
 * File           : adversarial-helpers.js
 * Version        : 1.0.0
 * Author         : Security & Adversarial Testing Authority
 * Organization   : Air Roofers Ltd
 * Created Date   : 2026-09-30
 * Last Modified  : 2026-09-30
 * Classification : GOVERNMENT | ENTERPRISE | PUBLIC | INTERNAL
 *
 * Governance:
 * - Security Reviewed
 * - Architecture Controlled
 * - Protocol Frozen
 * - Modularization Enforced
 *
 * Standards:
 * - ISO 27001
 * - SOC 2
 * - OWASP ASVS
 * - NIST SP 800-53
 *
 * Signatures:
 * - Architecture Authority
 * - Security Authority
 * - Governance Authority
 * - Deployment Authority
 *
 * Copyright (c) 2026 Air Roofers Ltd
 * All Rights Reserved.
 ******************************************************************************/

const assert = require('node:assert');

const CONSTANTS = {
  TEST_SUITE_NAME: 'Adversarial Execution Test Suite',
  GROUP_1_NAME: 'Group 1: Execution & Replay Attacks',
  GROUP_2_NAME: 'Group 2: Action Protocol & Payload Attacks',
  GROUP_3_NAME: 'Group 3: Filesystem, Archive & Deployment Attacks',
  GROUP_4_NAME: 'Group 4: State, Locking & Service Identity Attacks',
  GROUP_5_NAME: 'Group 5: Plugin, SSRF & Language Pack Attacks',
  
  PATH_TRAVERSAL_1: '../',
  PATH_TRAVERSAL_2: '..\\',
  WINDOWS_ADS: 'file:stream',
  WINDOWS_CON: 'CON',
  WINDOWS_NUL: 'NUL',
  WINDOWS_AUX: 'AUX',
  UNC_PATH: '\\\\server\\share',
  SHELL_EXEC: 'SHELL_EXEC',
  EXEC_RAW: 'EXEC_RAW',
  IP_PRIVATE: '169.254.169.254',
  IP_V6_MAPPED: '::ffff:169.254.169.254',
  UNKNOWN_ACTION: 'UNKNOWN_ACTION',
  TRUE_VALUE: true,
  FALSE_VALUE: false,
  
  MSG_PASS: '[PASS]',
  MSG_FAIL: '[FAIL]',
  MSG_STARTING: 'Starting',
  MSG_COMPLETED: 'All tests completed.',

  CLASS_1: 'Class 1: Recipe replay with duplicate',
  CLASS_2: 'Class 2: Nonce collision and executionId collision',
  CLASS_3: 'Class 3: Canonical serialization mutation & signed-field mutation',
  CLASS_4: 'Class 4: Unsigned-field injection',
  CLASS_5: 'Class 5: Context hijacking (mismatched target/tenant)',
  CLASS_6: 'Class 6: Expired and future-dated recipes',
  CLASS_7: 'Class 7: Revoked key recipe & rotated key policy violation',
  CLASS_8: 'Class 8: Wrong-purpose signing key',
  CLASS_9: 'Class 9: Execution identity spoofing',
  CLASS_10: 'Class 10: Replay window manipulation',
  CLASS_11: 'Class 11: Cross-execution data leakage',
  CLASS_12: 'Class 12: Invalid execution environment variables',
  CLASS_13: 'Class 13: Execution boundary evasion',
  CLASS_14: 'Class 14: Unknown action name',
  CLASS_15: 'Class 15: Generic payload injection',
  CLASS_16: 'Class 16: Total rejection of SHELL_EXEC',
  CLASS_17: 'Class 17: Total rejection of EXEC_RAW',
  CLASS_18: 'Class 18: Path traversal',
  CLASS_19: 'Class 19: Symlink escape',
  CLASS_20: 'Class 20: Windows ADS',
  CLASS_21: 'Class 21: Windows device names',
  CLASS_22: 'Class 22: UNC path escape',
  CLASS_23: 'Class 23: Zip Slip',
  CLASS_24: 'Class 24: Tar traversal',
  CLASS_25: 'Class 25: Archive bombs',
  CLASS_26: 'Class 26: Atomic deployment rollback on failure',
  CLASS_27: 'Class 27: Absolute path override',
  CLASS_28: 'Class 28: Phantom file deletion',
  CLASS_29: 'Class 29: Concurrent transaction lock collision',
  CLASS_30: 'Class 30: Corrupt state quarantine',
  CLASS_31: 'Class 31: State tampering',
  CLASS_32: 'Class 32: Hash chain mismatch',
  CLASS_33: 'Class 33: Unsafe resume postcondition verification',
  CLASS_34: 'Class 34: Forged service token',
  CLASS_35: 'Class 35: Replayed service token',
  CLASS_36: 'Class 36: Wrong service audience & excessive scope',
  CLASS_37: 'Class 37: Cross-tenant access denial',
  CLASS_38: 'Class 38: Plugin sandbox escape',
  CLASS_39: 'Class 39: Plugin capability escalation',
  CLASS_40: 'Class 40: Plugin output buffer overflow',
  CLASS_41: 'Class 41: SSRF to private IP',
  CLASS_42: 'Class 42: SSRF to IPv6',
  CLASS_43: 'Class 43: SSRF to IPv4-mapped IPv6',
  CLASS_44: 'Class 44: SSRF to cloud metadata',
  CLASS_45: 'Class 45: DNS rebinding',
  CLASS_46: 'Class 46: Redirect to private IP',
  CLASS_47: 'Class 47: Revoked language pack key',
  CLASS_48: 'Class 48: Language pack metadata tampering',
  CLASS_49: 'Class 49: Placeholder injection',
  CLASS_50: 'Class 50: Token collision'
};

class AdversarialHelpers {
  static simulateTest(testName, testFn) {
    try {
      testFn();
      console.log(`${CONSTANTS.MSG_PASS} ${testName}`);
    } catch (err) {
      console.error(`${CONSTANTS.MSG_FAIL} ${testName}: ${err.message}`);
      process.exitCode = 1;
    }
  }
}

module.exports = {
  CONSTANTS,
  AdversarialHelpers
};

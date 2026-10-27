/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Release / Native JUnit Report Parser & Schema Validator
 * File           : junit-parser.mjs
 * Version        : 2.2.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers SASU
 * Created Date   : 2026-10-20
 * Last Modified  : 2026-10-20
 * Classification : ENTERPRISE | INTERNAL
 *
 * Governance:
 * - Corporate Policy Governed
 * - Security Reviewed
 * - Architecture Controlled
 * - Protocol Frozen
 * - Modularization Enforced
 *
 * Standards:
 * - ISO 27001 / SOC 2 / OWASP ASVS 5.0 / NIST SP 800-53
 *
 * Copyright (c) 2026 Air Roofers SASU. All Rights Reserved.
 ******************************************************************************/

import fs from 'node:fs';
import crypto from 'node:crypto';

function sha256Buffer(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

/**
 * Extracts key-value attributes from an XML attribute string.
 */
function parseAttributes(attrString) {
  const attrs = {};
  const attrRegex = /([a-zA-Z0-9_:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
  let match;
  while ((match = attrRegex.exec(attrString)) !== null) {
    attrs[match[1]] = match[2] !== undefined ? match[2] : match[3];
  }
  return attrs;
}

/**
 * Quote-aware XML tokenizer that handles '>' inside quoted attribute values.
 */
function tokenizeXmlTags(xml) {
  const tokens = [];
  let i = 0;
  while (i < xml.length) {
    if (xml.startsWith('<!--', i)) {
      const end = xml.indexOf('-->', i);
      i = end === -1 ? xml.length : end + 3;
      continue;
    }
    if (xml.startsWith('<?', i)) {
      const end = xml.indexOf('?>', i);
      i = end === -1 ? xml.length : end + 2;
      continue;
    }
    if (xml[i] === '<') {
      let j = i + 1;
      let inQuote = false;
      let quoteChar = '';
      while (j < xml.length) {
        const c = xml[j];
        if (!inQuote && (c === '"' || c === "'")) {
          inQuote = true;
          quoteChar = c;
        } else if (inQuote && c === quoteChar) {
          inQuote = false;
        } else if (!inQuote && c === '>') {
          break;
        }
        j++;
      }
      const rawTag = xml.slice(i, j + 1);
      i = j + 1;

      const inner = rawTag.slice(1, -1).trim();
      if (!inner) continue;

      const isClosing = inner.startsWith('/');
      const isSelfClosing = !isClosing && inner.endsWith('/');
      const body = isClosing ? inner.slice(1).trim() : (isSelfClosing ? inner.slice(0, -1).trim() : inner);

      const spaceIdx = body.search(/\s/);
      const tagName = spaceIdx === -1 ? body : body.slice(0, spaceIdx);
      const attrString = spaceIdx === -1 ? '' : body.slice(spaceIdx).trim();

      tokens.push({
        rawTag,
        tagName,
        isClosing,
        isSelfClosing,
        attrString
      });
      continue;
    }
    i++;
  }
  return tokens;
}

/**
 * Strict stack-based XML tag validator and JUnit structural extractor.
 * Rejects DOCTYPE/ENTITY (XXE), invalid hierarchy, duplicate testcases,
 * and attribute count discrepancies.
 */
function parseAndValidateXmlTokens(xml, sourceRef) {
  // 1. Anti-XXE & malicious directive checks
  if (/<!DOCTYPE/i.test(xml) || /<!ENTITY/i.test(xml) || /<\?xml-stylesheet/i.test(xml)) {
    throw new Error(`Security violation: XML contains prohibited DOCTYPE/ENTITY declaration in ${sourceRef}`);
  }

  // 2. Tokenize tags using quote-aware tokenizer
  const tokens = tokenizeXmlTags(xml);
  const stack = [];
  const testcases = [];
  const seenTestcaseNames = new Set();
  let rootTag = null;
  let rootAttrs = {};
  let failureCount = 0;
  let errorCount = 0;
  let skippedCount = 0;
  let currentTestcase = null;

  for (const token of tokens) {
    const { tagName, isClosing, isSelfClosing, attrString } = token;

    if (!isClosing) {
      const attrs = parseAttributes(attrString);
      if (!rootTag) {
        rootTag = tagName;
        rootAttrs = attrs;
      }

      if (tagName === 'testcase') {
        const name = attrs.name || '';
        const classname = attrs.classname || '';
        const key = `${classname}:::${name}`;
        if (seenTestcaseNames.has(key)) {
          throw new Error(`Duplicate testcase detected: "${name}" (${classname}) in ${sourceRef}`);
        }
        seenTestcaseNames.add(key);
        currentTestcase = {
          name,
          classname,
          time: attrs.time ? Number.parseFloat(attrs.time) : 0,
          failures: [],
          errors: []
        };
        testcases.push(currentTestcase);
      } else if (tagName === 'failure') {
        failureCount++;
        if (currentTestcase) {
          currentTestcase.failures.push(attrs);
        }
      } else if (tagName === 'error') {
        errorCount++;
        if (currentTestcase) {
          currentTestcase.errors.push(attrs);
        }
      } else if (tagName === 'skipped') {
        skippedCount++;
      }

      if (!isSelfClosing) {
        stack.push(tagName);
      } else if (tagName === 'testcase') {
        currentTestcase = null;
      }
    } else {
      if (stack.length === 0) {
        throw new Error(`Mismatched closing tag </${tagName}> without open tag in ${sourceRef}`);
      }
      const expected = stack.pop();
      if (expected !== tagName) {
        throw new Error(`Mismatched tag: expected </${expected}>, found </${tagName}> in ${sourceRef}`);
      }
      if (tagName === 'testcase') {
        currentTestcase = null;
      }
    }
  }

  if (stack.length > 0) {
    throw new Error(`Unclosed XML tags remaining: ${stack.join(', ')} in ${sourceRef}`);
  }

  if (!rootTag || (rootTag !== 'testsuite' && rootTag !== 'testsuites')) {
    throw new Error(`Report is not a valid native JUnit document (root must be <testsuite> or <testsuites>): ${sourceRef}`);
  }

  // 3. Verify declared counts vs actual counts if attributes exist on root
  if (rootAttrs.tests !== undefined) {
    const declaredTests = Number.parseInt(rootAttrs.tests, 10);
    if (!Number.isNaN(declaredTests) && declaredTests !== testcases.length) {
      throw new Error(`Attribute 'tests' (${declaredTests}) does not match actual <testcase> count (${testcases.length}) in ${sourceRef}`);
    }
  }
  if (rootAttrs.failures !== undefined) {
    const declaredFailures = Number.parseInt(rootAttrs.failures, 10);
    if (!Number.isNaN(declaredFailures) && declaredFailures !== failureCount) {
      throw new Error(`Attribute 'failures' (${declaredFailures}) does not match actual <failure> count (${failureCount}) in ${sourceRef}`);
    }
  }
  if (rootAttrs.errors !== undefined) {
    const declaredErrors = Number.parseInt(rootAttrs.errors, 10);
    if (!Number.isNaN(declaredErrors) && declaredErrors !== errorCount) {
      throw new Error(`Attribute 'errors' (${declaredErrors}) does not match actual <error> count (${errorCount}) in ${sourceRef}`);
    }
  }

  return {
    rootTag,
    rootAttrs,
    testcases,
    totalTests: testcases.length,
    totalFailures: failureCount,
    totalErrors: errorCount,
    totalSkipped: skippedCount
  };
}

/**
 * Validates and parses a native JUnit XML report document according
 * to COR-RE-001 requirements. Fails closed on missing, empty, malformed,
 * commit-mismatched, or failing reports.
 */
export function parseAndValidateNativeJUnit({ file, xmlString, expectedCommit, actualCommit }) {
  if (expectedCommit && actualCommit && expectedCommit !== actualCommit) {
    throw new Error(`Evidence commit mismatch: expected ${expectedCommit}, actual checked out is ${actualCommit}`);
  }

  let xml = xmlString;
  let bytes;
  const sourceRef = file || '<in-memory-xml>';

  if (xml === undefined) {
    if (!file || !fs.existsSync(file)) {
      throw new Error(`Required native test report missing: ${file}`);
    }
    bytes = fs.readFileSync(file);
    if (bytes.length === 0) {
      throw new Error(`Native test report is empty: ${file}`);
    }
    xml = bytes.toString('utf8');
  } else {
    bytes = Buffer.from(xml, 'utf8');
    if (bytes.length === 0) {
      throw new Error(`Native test report is empty: ${sourceRef}`);
    }
  }

  const reportSha256 = sha256Buffer(bytes);

  // Strict token validation
  const parsed = parseAndValidateXmlTokens(xml, sourceRef);

  // Check commit attribute if present in XML or properties
  const docCommit = parsed.rootAttrs.commit || (xml.match(/commit="([^"]+)"/) || [])[1];
  if (docCommit && expectedCommit && docCommit !== expectedCommit) {
    throw new Error(`Report commit attribute (${docCommit}) does not match expected source commit (${expectedCommit})`);
  }

  if (parsed.totalTests === 0) {
    throw new Error(`Native test report contains 0 test cases: ${sourceRef}`);
  }

  if (parsed.totalFailures > 0 || parsed.totalErrors > 0) {
    throw new Error(`Native test suite failed with ${parsed.totalFailures} failures and ${parsed.totalErrors} errors in ${sourceRef}`);
  }

  return {
    file: file || null,
    reportSha256,
    byteLength: bytes.length,
    totalTests: parsed.totalTests,
    totalFailures: parsed.totalFailures,
    totalErrors: parsed.totalErrors,
    totalSkipped: parsed.totalSkipped,
    testcases: parsed.testcases,
    status: 'PASS',
    xml
  };
}

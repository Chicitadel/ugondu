/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : Tests / Adversarial Testing Helpers
 * File           : adversarial-helpers.js
 * Version        : 2.1.0
 * Author         : Security & Adversarial Testing Authority
 * Organization   : Air Roofers Ltd
 * Created Date   : 2026-09-30
 * Last Modified  : 2026-09-30
 * Classification : ENTERPRISE | INTERNAL
 *
 * Standards: ISO 27001, SOC 2, OWASP ASVS 5.0, NIST SP 800-53
 * Copyright (c) 2026 Air Roofers Ltd. All Rights Reserved.
 ******************************************************************************/

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class MemoryReplayLedger {
  constructor() {
    this.seenTuples = new Set();
    this.seenNonces = new Set();
  }
  record(issuer, keyId, txId, execId, nonce) {
    const tupleKey = `${issuer}:${keyId}:${txId}:${execId}:${nonce}`;
    const nonceKey = `${issuer}:${keyId}:${nonce}`;
    if (this.seenTuples.has(tupleKey) || this.seenNonces.has(nonceKey)) {
      throw new Error('DUPLICATE_REPLAY_DETECTED');
    }
    this.seenTuples.add(tupleKey);
    this.seenNonces.add(nonceKey);
  }
}

class SafePathValidator {
  static resolve(baseDir, userInput) {
    if (!userInput || typeof userInput !== 'string') {
      throw new Error('PATH_EMPTY_OR_INVALID');
    }
    if (userInput.includes('\0')) {
      throw new Error('NULL_BYTE_INJECTION');
    }
    // Windows ADS
    if (userInput.includes(':') && !/^[a-zA-Z]:[/\\]/.test(userInput)) {
      throw new Error('WINDOWS_ADS_DETECTED');
    }
    // UNC Paths
    if (userInput.startsWith('\\\\') || userInput.startsWith('//')) {
      throw new Error('UNC_PATH_DETECTED');
    }
    // Windows device names
    const devMatch = userInput.match(/(?:^|[\\/])(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\.[^\\/]*)?(?:$|[\\/])/i);
    if (devMatch) {
      throw new Error('WINDOWS_RESERVED_DEVICE_NAME');
    }
    // Path traversal
    const normalized = path.normalize(userInput);
    const resolved = path.resolve(baseDir, normalized);
    const rel = path.relative(baseDir, resolved);
    if (rel.startsWith('..') || path.isAbsolute(rel)) {
      throw new Error('PATH_TRAVERSAL_DETECTED');
    }
    return resolved;
  }
}

class ArchiveSecurityChecker {
  static inspectHeader(headerPath, uncompressedBytes, compressedBytes) {
    if (headerPath.includes('..') || path.isAbsolute(headerPath) || headerPath.startsWith('/') || headerPath.startsWith('\\')) {
      throw new Error('ZIP_SLIP_TRAVERSAL_DETECTED');
    }
    if (compressedBytes > 0 && (uncompressedBytes / compressedBytes) > 100) {
      throw new Error('DECOMPRESSION_BOMB_DETECTED');
    }
    return true;
  }
}

class TransactionLockManager {
  static acquire(lockPath) {
    if (fs.existsSync(lockPath)) {
      throw new Error('LOCK_COLLISION_DETECTED');
    }
    fs.writeFileSync(lockPath, `${process.pid}:${Date.now()}`, { flag: 'wx', mode: 0o600 });
    return true;
  }
  static release(lockPath) {
    try {
      if (fs.existsSync(lockPath)) fs.unlinkSync(lockPath);
    } catch {}
  }
}

function createTempHttpServer(handler) {
  const http = require('http');
  const server = http.createServer(handler);
  server.listen(0, '127.0.0.1');
  const port = server.address().port;
  const close = () => new Promise(resolve => server.close(resolve));
  return { port, close };
}

module.exports = {
  MemoryReplayLedger,
  SafePathValidator,
  ArchiveSecurityChecker,
  TransactionLockManager,
  createTempHttpServer
};

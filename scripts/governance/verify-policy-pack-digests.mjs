#!/usr/bin/env node
/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Governance / Policy Pack Provenance Gate & Ed25519 Verifier
 * File           : verify-policy-pack-digests.mjs
 * Version        : 2.0.0
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
 *
 * Usage:
 *   node scripts/governance/verify-policy-pack-digests.mjs [--write] [packDir]
 *   --write  recompute digests, rewrite declared values, and sign pack.sig
 *
 * Pack digest = SHA-256 over the sorted lines "<relative-path>:<sha256>" of every
 * templatePath referenced by pack.yaml (policies and roles), newline-joined.
 * Cryptographic provenance is verified via Ed25519 signature in pack.sig anchored
 * to externally injected UGONDU_PACK_PUBLIC_KEY.
 *
 * Copyright (c) 2026 Air Roofers SASU. All Rights Reserved.
 ******************************************************************************/
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const args = process.argv.slice(2);
const write = args.includes('--write');
const packDir = path.resolve(ROOT, args.find((a) => !a.startsWith('--')) ?? 'policy-packs/aws/cor');
const packFile = path.join(packDir, 'pack.yaml');
const sigFile = path.join(packDir, 'pack.sig');

const sha = (buf) => crypto.createHash('sha256').update(buf).digest('hex');

export function resolvePackPublicKey() {
  if (process.env.UGONDU_PACK_PUBLIC_KEY) {
    const raw = process.env.UGONDU_PACK_PUBLIC_KEY.trim();
    if (raw.includes('BEGIN')) {
      return crypto.createPublicKey(raw);
    }
    return crypto.createPublicKey({
      key: Buffer.from(raw, 'base64'),
      format: 'der',
      type: 'spki'
    });
  }
  // In local offline verification mode, fall back to the pinned trust authority anchor
  const localAnchor = path.join(ROOT, 'config/trust/uplm_pack_authority.pub.pem');
  if (fs.existsSync(localAnchor)) {
    const raw = fs.readFileSync(localAnchor, 'utf8').trim();
    if (raw.includes('BEGIN')) {
      return crypto.createPublicKey(raw);
    }
  }
  return null;
}

export function resolvePackPrivateKey() {
  if (process.env.UGONDU_PACK_PRIVATE_KEY) {
    return crypto.createPrivateKey(process.env.UGONDU_PACK_PRIVATE_KEY);
  }
  // Private signing material must be injected from managed key custody.
  // Never sign release artifacts with a repository-local private key.
  return null;
}

export function verifyPolicyPack(yamlText, baseDir) {
  const problems = [];
  const entries = [];
  const re = /templatePath:\s*(\S+)\s*\r?\n\s*sha256:\s*"?([0-9a-fA-F]*)"?/g;
  let m;
  while ((m = re.exec(yamlText))) {
    const rel = m[1];
    const file = path.join(baseDir, rel);
    if (!fs.existsSync(file)) {
      problems.push(`missing template ${rel}`);
      continue;
    }
    const actual = sha(fs.readFileSync(file));
    entries.push({ rel, declared: m[2], actual });
    if (actual !== m[2]) problems.push(`digest mismatch ${rel}: declared ${m[2]} actual ${actual}`);
  }
  if (entries.length === 0) problems.push('no templatePath entries found');
  const packDigest = sha(
    Buffer.from(
      entries
        .map((e) => `${e.rel}:${e.actual}`)
        .sort()
        .join('\n'),
      'utf8'
    )
  );
  const declaredPack = /packDigestSha256:\s*"?([0-9a-fA-F]+)"?/.exec(yamlText)?.[1];
  if (declaredPack !== packDigest) {
    problems.push(`pack digest mismatch: declared ${declaredPack} actual ${packDigest}`);
  }

  // Cryptographic Ed25519 signature verification against trusted key anchor
  const currentSigFile = path.join(baseDir, 'pack.sig');
  if (!fs.existsSync(currentSigFile)) {
    problems.push(`missing pack signature file: ${path.relative(ROOT, currentSigFile)}`);
  } else {
    try {
      const sigData = JSON.parse(fs.readFileSync(currentSigFile, 'utf8'));
      if (sigData.algorithm !== 'Ed25519') {
        problems.push(`unsupported signature algorithm in pack.sig: ${sigData.algorithm}`);
      }
      if (sigData.signingKeyId !== 'ugondu-uplm-pack-signing-key-v1') {
        problems.push(`untrusted or unexpected signingKeyId in pack.sig: ${sigData.signingKeyId}`);
      }
      if (sigData.packDigestSha256 !== packDigest) {
        problems.push(`pack.sig digest mismatch: sig has ${sigData.packDigestSha256}, actual is ${packDigest}`);
      }
      const pubKey = resolvePackPublicKey();
      if (!pubKey) {
        problems.push('no trusted UPLM pack public key found in environment or keys directories');
      } else {
        const sigBuf = Buffer.from(sigData.signatureBase64, 'base64');
        const valid = crypto.verify(null, Buffer.from(packDigest, 'utf8'), pubKey, sigBuf);
        if (!valid) {
          problems.push('Ed25519 cryptographic signature verification FAILED for pack.sig against trusted key anchor');
        }
      }
    } catch (e) {
      problems.push(`failed to verify pack.sig: ${e.message}`);
    }
  }

  return { entries, packDigest, declaredPack, problems };
}

function main() {
  let text = fs.readFileSync(packFile, 'utf8');
  let result = verifyPolicyPack(text, packDir);
  if (write) {
    for (const e of result.entries) {
      text = text.replace(`sha256: "${e.declared}"`, `sha256: "${e.actual}"`);
    }
    text = text.replace(/packDigestSha256:\s*"?[0-9a-fA-F]+"?/, `packDigestSha256: "${result.packDigest}"`);
    fs.writeFileSync(packFile, text, 'utf8');

    const privKey = resolvePackPrivateKey();
    if (privKey) {
      const sig = crypto.sign(null, Buffer.from(result.packDigest, 'utf8'), privKey);
      const sigEnvelope = {
        schemaVersion: '1.0.0',
        algorithm: 'Ed25519',
        signingKeyId: 'ugondu-uplm-pack-signing-key-v1',
        packDigestSha256: result.packDigest,
        signatureBase64: sig.toString('base64'),
        signedAt: new Date().toISOString()
      };
      fs.writeFileSync(sigFile, JSON.stringify(sigEnvelope, null, 2) + '\n', 'utf8');
      console.log(`[WRITE] Signed and wrote ${path.relative(ROOT, sigFile)}.`);
    }

    result = verifyPolicyPack(text, packDir);
    console.log(`[WRITE] Rewrote ${result.entries.length} template digests, pack digest, and signature.`);
  }
  if (result.problems.length) {
    for (const p of result.problems) console.error(`[FAIL] ${p}`);
    process.exit(1);
  }
  console.log(`[PASS] Policy pack ${path.relative(ROOT, packDir)}: ${result.entries.length} templates, pack digest ${result.packDigest}, and Ed25519 signature cryptographically verified.`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();

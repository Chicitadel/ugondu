/******************************************************************************
 * Project        : Ugondu Universal Deployment Intelligence Platform
 * Module         : Commercial Policy Catalogue
 * File           : src/catalogue/ugondu.policies.js
 * Version        : 4.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : AIR ROOFERS (Societe par actions simplifiee, RCS Paris 943 432 534)
 * Created Date   : 2026-10-01
 * Last Modified  : 2026-10-18
 * Classification : ENTERPRISE | PLATFORM POLICY AUTHORITY
 *
 * Governance:
 * - Corporate Policy Governed
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
 * Copyright (c) 2025-2026 AIR ROOFERS. All Rights Reserved.
 ******************************************************************************/

'use strict';

const fs = require('fs');
const path = require('path');

function resolveProductIdentity() {
  const workspaceRoot = path.resolve(__dirname, '../..');
  const registryPath = path.join(workspaceRoot, '.governance', 'standards', 'product-registry.json');
  const workspaceSlug = path.basename(workspaceRoot).toLowerCase();

  const rawRegistry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
  const products = Array.isArray(rawRegistry.products) ? rawRegistry.products : [];
  const targetId = (process.env.PRODUCT_ID || rawRegistry.activeProductId || workspaceSlug).toLowerCase();

  const entry = products.find((item) => {
    const candidates = [
      item.id,
      item.slug,
      item.productId,
      item.code,
      item.metadata && item.metadata.repositoryPath
        ? path.basename(item.metadata.repositoryPath)
        : undefined
    ]
      .filter(Boolean)
      .map((val) => String(val).toLowerCase());
    return candidates.includes(targetId) || candidates.includes(workspaceSlug);
  });

  if (!entry) {
    throw new Error(`Unable to resolve product identity from governance registry at ${registryPath}`);
  }

  const slug = String(entry.slug || entry.id || entry.productId).toLowerCase();
  const displayName = String(entry.code || entry.productId).toUpperCase();
  const fullName = String(entry.fullName || entry.name);
  const version = String(entry.version || rawRegistry.version || '1.0.0');
  const publisher = String(entry.publisher || rawRegistry.organization || 'AIR ROOFERS');
  const repoPath = (entry.metadata && entry.metadata.repositoryPath) || `products/${slug}`;
  const docsRoot = (entry.metadata && entry.metadata.docsRoot) || `${repoPath}/docs/commercial`;

  return {
    product: slug,
    displayName,
    fullName,
    version,
    publisher,
    docsRoot
  };
}

const identity = resolveProductIdentity();

module.exports = {
  // Dynamically Resolved Product Identity
  product:     identity.product,
  displayName: identity.displayName,
  fullName:    identity.fullName,
  version:     identity.version,
  publisher:   identity.publisher,

  // Source Root (workspace-relative)
  docsRoot: identity.docsRoot,

  // Policy Entries
  policies: [
    {
      id:        'POL-EULA',
      name:      'End User License Agreement',
      class:     'CLASS_B',
      version:   '1.0.0',
      status:    'ACTIVE',
      slug:      'eula',
      file:      'EULA.md',
      languages: ['en']
    },
    {
      id:        'POL-TOS',
      name:      'Terms of Service',
      class:     'CLASS_B',
      version:   '1.0.0',
      status:    'ACTIVE',
      slug:      'terms',
      file:      'Terms_of_Service.md',
      languages: ['en']
    },
    {
      id:        'POL-PRIV',
      name:      'Privacy Policy',
      class:     'CLASS_B',
      version:   '1.0.0',
      status:    'ACTIVE',
      slug:      'privacy',
      file:      'Privacy_Policy.md',
      languages: ['en']
    },
    {
      id:        'POL-DPA',
      name:      'Data Processing Agreement',
      class:     'CLASS_B',
      version:   '1.0.0',
      status:    'ACTIVE',
      slug:      'dpa',
      file:      'Ugondu_Data_Processing_Agreement.md',
      languages: ['en']
    },
    {
      id:        'POL-PAY',
      name:      'Payment, Cancellation, Refund & Withdrawal Policy',
      class:     'CLASS_B',
      version:   '1.1.0',
      status:    'ACTIVE',
      slug:      'payment',
      file:      'Payment_Cancellation_Refund_Withdrawal_Policy.md',
      languages: ['en']
    },
    {
      id:        'POL-SLA',
      name:      'Support & Service Level Agreement Schedule',
      class:     'CLASS_A',
      version:   '1.0.0',
      status:    'ACTIVE',
      slug:      'sla',
      file:      'Support_SLA_Schedule.md',
      languages: ['en']
    },
    {
      id:        'POL-SECR',
      name:      'Security & Responsible Disclosure Policy',
      class:     'CLASS_A',
      version:   '1.2.0',
      status:    'ACTIVE',
      slug:      'security',
      file:      'Security_Responsible_Disclosure_Policy.md',
      languages: ['en']
    }
  ]
};

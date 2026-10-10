/******************************************************************************
 * Project        : [PROJECT_NAME]
 * Module         : [MODULE_NAME]
 * File           : ugondu.policies.js
 * Version        : [VERSION]
 * Author         : [AUTHOR_NAME]
 * Organization   : [ORGANIZATION]
 * Created Date   : [YYYY-MM-DD]
 * Last Modified  : [YYYY-MM-DD]
 * Classification : GOVERNMENT | ENTERPRISE | PUBLIC | INTERNAL
 *
 * Governance:
 * - AI Governed
 * - Security Reviewed
 * - Architecture Controlled
 * - Protocol Frozen
 * - Modularization Enforced
 *
 * Standards:
 * - ISO 27001
 * - SOC 2
 * - OWASP ASVS
 * - NIST
 *
 * Signatures:
 * - Architecture Authority
 * - Security Authority
 * - Governance Authority
 * - Deployment Authority
 *
 * Copyright (c) [YEAR] [ORGANIZATION]
 * All Rights Reserved.
 ******************************************************************************/
/******************************************************************************
 * Project        : Universal Autonomous AI Governance Operating System (UAIGOS)
 * Module         : Policy Catalogue
 * File           : src/catalogue/ugondu.policies.js
 * Version        : 1.0.0
 * Author         : Ignatus Chika Ujomor | Founder & System Architect
 * Organization   : AIR ROOFERS (Societe par actions simplifiee, RCS Paris 943 432 534)
 * Created Date   : 2026-10-01
 * Classification : ENTERPRISE | PLATFORM POLICY AUTHORITY
 *
 * Copyright (c) 2025-2026 AIR ROOFERS. All Rights Reserved.
 ******************************************************************************/

'use strict';

module.exports = {

  // Product Identity
  product:     'ugondu',
  displayName: 'UGONDU',
  fullName:    'Universal Autonomous AI Governance Operating System',
  version:     '1.0.0',
  publisher:   'AIR ROOFERS',

  // Source Root (workspace-relative)
  docsRoot: 'products/ugondu/docs/commercial',

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


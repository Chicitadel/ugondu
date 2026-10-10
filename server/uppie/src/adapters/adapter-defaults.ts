/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : UPPIE — Default Adapter Registration
 * File           : adapter-defaults.ts
 * Version        : 1.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers (Société par actions simplifiée, RCS Paris 943 432 534)
 * Created Date   : 2026-10-02
 * Last Modified  : 2026-10-02
 * Classification : ENTERPRISE
 *
 * Governance:
 * - Corporate Governed
 * - Security Reviewed
 * - Architecture Controlled
 * - Protocol Frozen
 *
 * Standards:
 * - ISO 27001 / SOC 2 / OWASP ASVS 5.0 / NIST SP 800-53
 *
 * Copyright (c) 2026 Air Roofers. All Rights Reserved.
 ******************************************************************************/

import { AdapterRegistry }       from './AdapterRegistry';
import { AwsIamPolicyAdapter }   from './aws-iam/AwsIamPolicyAdapter';
import { AzureRbacAdapter }      from './azure-rbac/AzureRbacAdapter';
import { GcpIamAdapter }         from './gcp-iam/GcpIamAdapter';
import { CpanelAdapter }         from './cpanel/CpanelAdapter';
import { KubernetesRbacAdapter } from './kubernetes-rbac/KubernetesRbacAdapter';
import { LinuxAclAdapter }       from './linux-acl/LinuxAclAdapter';

/**
 * Register all built-in Ugondu UPPIE provider adapters into the registry.
 *
 * Each adapter is registered only if not already present (idempotent).
 * Adapters remain independently activatable/deactivatable per tenant edition.
 *
 * Built-in providers: AWS IAM, Azure RBAC, GCP IAM, cPanel, Kubernetes RBAC, Linux ACL
 */
export function registerDefaultAdapters(registry: AdapterRegistry): void {
  const adapters = [
    new AwsIamPolicyAdapter(),
    new AzureRbacAdapter(),
    new GcpIamAdapter(),
    new CpanelAdapter(),
    new KubernetesRbacAdapter(),
    new LinuxAclAdapter(),
  ];

  const registered = new Set(registry.listRegistered());

  for (const adapter of adapters) {
    // Only register if not already present — supports custom adapter overrides
    if (!registered.has(adapter.providerType)) {
      registry.register(adapter);
    }
    // Activate all built-in adapters — CEG lifecycle can call registry.deactivate() per edition
    if (!registry.isActive(adapter.providerType)) {
      registry.activate(adapter.providerType);
    }
  }
}

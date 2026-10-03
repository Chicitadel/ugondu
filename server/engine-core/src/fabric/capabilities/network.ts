/******************************************************************************
 * Project        : Ugondu Platform
 * Module         : Fabric Capabilities Engine
 * File           : network.ts
 * Version        : 2.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers (Société par actions simplifiée, RCS Paris 943 432 534)
 * Created Date   : 2026-10-01
 * Last Modified  : 2026-10-03
 * Classification : ENTERPRISE
 *
 * Governance:
 * - Corporate Governed
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
 * Copyright (c) 2026 Air Roofers
 * All Rights Reserved.
 ******************************************************************************/
import type { ProviderOptions, ResolvedValues } from './compute';

/**
 * @interface NetworkCapability
 * @description A logical network boundary. Topology beyond the CIDR (subnets, routing, gateways) belongs to the
 * provider extension, not to the portable model.
 * @classification ENTERPRISE
 */
export interface NetworkCapability {
  createVirtualNetwork(config: NetworkConfig, options: ProviderOptions): Promise<NetworkResult>;
  deleteVirtualNetwork(id: string): Promise<void>;
  createSubnet(networkId: string, cidr: string): Promise<SubnetResult>;
}

/**
 * @interface NetworkConfig
 * @description Corporate Governed interface implementation for NetworkConfig
 * @classification ENTERPRISE
 */
export interface NetworkConfig { name: string; cidrBlock: string; }

/**
 * @interface NetworkResult
 * @description Corporate Governed interface implementation for NetworkResult
 * @classification ENTERPRISE
 */
export interface NetworkResult { id: string; state: string; resolved?: ResolvedValues; }

/**
 * @interface SubnetResult
 * @description Corporate Governed interface implementation for SubnetResult
 * @classification ENTERPRISE
 */
export interface SubnetResult { id: string; cidr: string; }

/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : UPPIE — cPanel/WHM Client Boundary
 * File           : CpanelClient.ts
 * Version        : 2.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers (Société par actions simplifiée, RCS Paris 943 432 534)
 * Created Date   : 2026-10-03
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
 * - ISO 27001 / SOC 2 / OWASP ASVS 5.0 / NIST SP 800-53
 *
 * Signatures:
 * - Architecture Authority : Ujomor Systems Engineering
 * - Security Authority     : Ujomor Systems Governance
 * - Governance Authority   : Air Roofers Corporate Governance
 *
 * Copyright (c) 2026 Air Roofers. All Rights Reserved.
 ******************************************************************************/

/** A WHM feature list: every feature the server knows, enabled (true) or not (false). Features a provider disables server-wide read as false. */
export interface WhmFeatureList { name: string; features: Record<string, boolean> }

/** A hosting package. `attributes` holds every package setting other than name and feature list (quota, limits, shell, ...), keyed in lower case. */
export interface WhmPackage { name: string; featureList: string; attributes: Record<string, string> }

/** A hosting account; `plan` is the name of its package. */
export interface WhmAccount { user: string; plan: string; domain: string; owner: string; suspended: boolean }

/** Failure raised by the client; `status` is the HTTP status when the server answered. */
export class WhmApiError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = 'WhmApiError';
  }
}

/**
 * Minimal WHM surface used by the adapter; implemented by the HTTPS client and by test doubles.
 * An account holds exactly one package and a package exactly one feature list, so a feature list reaches an account only through a package.
 */
export interface WhmClient {
  listFeatureLists(): Promise<string[]>;
  /** The list with every feature, or undefined when no list of that name exists. */
  getFeatureList(name: string): Promise<WhmFeatureList | undefined>;
  /** Writes the complete feature map; with `overwrite` an existing list is replaced, otherwise an existing list is an error. */
  saveFeatureList(name: string, features: Record<string, boolean>, overwrite: boolean): Promise<void>;
  deleteFeatureList(name: string): Promise<void>;
  listPackages(): Promise<WhmPackage[]>;
  createPackage(pkg: WhmPackage): Promise<void>;
  deletePackage(name: string): Promise<void>;
  listAccounts(): Promise<WhmAccount[]>;
  /** The account of that user name, or undefined when there is none. */
  getAccount(user: string): Promise<WhmAccount | undefined>;
  changePackage(user: string, packageName: string): Promise<void>;
  listResellers(): Promise<string[]>;
}

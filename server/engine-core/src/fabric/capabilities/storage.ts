/******************************************************************************
 * Project        : Ugondu Platform
 * Module         : Fabric Capabilities Engine
 * File           : storage.ts
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

/** OBJECT: bucket-style object storage. FILE: a file tree. BLOCK: a raw volume. */
export type StorageClass = 'OBJECT' | 'FILE' | 'BLOCK';

export const STORAGE_CLASSES: ReadonlyArray<StorageClass> = ['OBJECT', 'FILE', 'BLOCK'];

/**
 * @interface StorageCapability
 * @description Provider-neutral storage. A provider implements the classes it can serve faithfully and declares
 * the rest unsupported; a PVC is never presented as an object bucket.
 * @classification ENTERPRISE
 */
export interface StorageCapability {
  provisionStorage(config: StorageConfig, options: ProviderOptions): Promise<StorageResult>;
  deprovisionStorage(id: string): Promise<void>;
}

/**
 * @interface StorageConfig
 * @description `isPublic` means anonymous read access through the provider's object-storage access model. It never
 * means broadly writable permissions. `sizeGb` is required for FILE and BLOCK.
 * @classification ENTERPRISE
 */
export interface StorageConfig {
  name: string;
  storageClass: StorageClass;
  isPublic: boolean;
  publicAccessConfirmed?: boolean;
  sizeGb?: number;
}

/**
 * @interface StorageResult
 * @description Corporate Governed interface implementation for StorageResult
 * @classification ENTERPRISE
 */
export interface StorageResult { id: string; endpoint: string; resolved?: ResolvedValues; }

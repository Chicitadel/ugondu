/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : engine-core/tenant/scim
 * File           : IScimAdapter.ts
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

import { z } from "zod";

export const ScimUserSchema = z.object({
  id: z.string(),
  userName: z.string(),
  active: z.boolean(),
  emails: z.array(z.object({
    value: z.string(),
    primary: z.boolean().optional(),
  })).optional(),
});

export type IScimUser = z.infer<typeof ScimUserSchema>;

export const ScimGroupSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  members: z.array(z.object({
    value: z.string(),
    display: z.string().optional(),
  })).optional(),
});

export type IScimGroup = z.infer<typeof ScimGroupSchema>;

/**
 * @interface IScimAdapter
 * @description Corporate Governed interface implementation for IScimAdapter
 * @classification ENTERPRISE
 */
export interface IScimAdapter {
  getProviderName(): string;
  createUser(user: IScimUser): Promise<IScimUser>;
  updateUser(id: string, user: Partial<IScimUser>): Promise<IScimUser>;
  deleteUser(id: string): Promise<void>;
  getUser(id: string): Promise<IScimUser | null>;
  createGroup(group: IScimGroup): Promise<IScimGroup>;
  updateGroup(id: string, group: Partial<IScimGroup>): Promise<IScimGroup>;
  deleteGroup(id: string): Promise<void>;
  getGroup(id: string): Promise<IScimGroup | null>;
}

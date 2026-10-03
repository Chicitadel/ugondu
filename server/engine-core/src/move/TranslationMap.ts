/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : engine-core/move
 * File           : TranslationMap.ts
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

// Mocking translation function for UI/Error strings
declare function __t(key: string, args?: Record<string, string | number>): string;

export const CPanelConfigSchema = z.object({
  apache: z.object({
    version: z.string(),
    vhosts: z.number(),
  }),
  php: z.object({
    version: z.string(),
    modules: z.array(z.string()),
  }),
  mysql: z.object({
    version: z.string(),
    databases: z.number(),
    sizeGb: z.number(),
  }),
  accounts: z.number(),
});

export type CPanelConfig = z.infer<typeof CPanelConfigSchema>;

/**
 * @interface AwsConstructs
 * @description Corporate Governed interface implementation for AwsConstructs
 * @classification ENTERPRISE
 */
export interface AwsConstructs {
  alb: {
    targetGroups: number;
    listeners: number;
  };
  ec2: {
    instanceType: string;
    ami: string;
  };
  rds: {
    instanceClass: string;
    engine: string;
    engineVersion: string;
    allocatedStorageGb: number;
  };
  iam: {
    rolesCount: number;
  };
}

/**
 * @class TranslationMap
 * @description Corporate Governed class implementation for TranslationMap
 * @classification ENTERPRISE
 */
export class TranslationMap {
  public mapCPanelToAws(config: CPanelConfig): AwsConstructs {
    const parsedConfig: CPanelConfig = CPanelConfigSchema.parse(config);

    if (!parsedConfig) {
      throw new Error(__t('messages.error.invalid_config'));
    }

    return {
      alb: this.mapAlb(parsedConfig),
      ec2: this.mapEc2(parsedConfig),
      rds: this.mapRds(parsedConfig),
      iam: this.mapIam(parsedConfig),
    };
  }

  private mapAlb(config: CPanelConfig): AwsConstructs['alb'] {
    if (config.apache.vhosts < 0) {
      throw new Error(__t('messages.error.invalid_vhosts_count'));
    }
    return {
      targetGroups: config.apache.vhosts,
      listeners: config.apache.vhosts > 0 ? 2 : 0,
    };
  }

  private mapEc2(config: CPanelConfig): AwsConstructs['ec2'] {
    let instanceType: string = 't3.micro';
    if (config.accounts > 50) {
      instanceType = 't3.large';
    } else if (config.accounts > 10) {
      instanceType = 't3.medium';
    }

    return {
      instanceType,
      ami: 'ami-amazon-linux-2023',
    };
  }

  private mapRds(config: CPanelConfig): AwsConstructs['rds'] {
    if (config.mysql.sizeGb < 0) {
        throw new Error(__t('messages.error.invalid_db_size'));
    }
    
    let instanceClass: string = 'db.t3.micro';
    if (config.mysql.sizeGb > 100) {
      instanceClass = 'db.r5.large';
    } else if (config.mysql.sizeGb > 20) {
      instanceClass = 'db.t3.medium';
    }

    return {
      instanceClass,
      engine: 'mysql',
      engineVersion: config.mysql.version,
      allocatedStorageGb: Math.max(20, config.mysql.sizeGb),
    };
  }

  private mapIam(config: CPanelConfig): AwsConstructs['iam'] {
    return {
      rolesCount: config.accounts,
    };
  }
}

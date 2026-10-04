/******************************************************************************
 * Project        : Universal Autonomous AI Governance Operating System
 * Module         : Passport API
 * File           : execution-endpoints.ts
 * Version        : 1.0.0
 * Author         : Air Roofers Engineering
 * Organization   : Air Roofers
 * Created Date   : 2026-10-01
 * Last Modified  : 2026-10-01
 * Classification : ENTERPRISE
 *
 * Governance:
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

// @ts-ignore
import { __t } from '@ugondu/shared';
import { Router, Request, Response } from 'express';
import { GatekeeperService } from '../gatekeeper/gatekeeper-service';

export function setupExecutionEndpoints(router: Router): void {
  const gatekeeper = new GatekeeperService();

  router.post('/execute/:passportId', async (req: Request, res: Response) => {
    try {
      const { passportId } = req.params;
      const executionContext = req.body.context || {};
      
      const receipt = await gatekeeper.execute(passportId, executionContext);
      
      res.status(200).json({
        success: true,
        data: receipt
      });
    } catch (error) {
      res.status(403).json({
        success: false,
        error: error instanceof Error ? error.message: __t('ui.responses.execution_denied_by_gatekeeper')
      });
    }
  });
}

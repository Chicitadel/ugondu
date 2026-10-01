/******************************************************************************
 * Project        : Universal Autonomous AI Governance Operating System
 * Module         : Passport API
 * File           : passport-endpoints.ts
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
import { Router, Request, Response } from 'express';
import { PassportCompiler } from '../compiler/passport-compiler';
import { IntentParser } from '../parser/intent-parser';

export function setupPassportEndpoints(router: Router): void {
  const compiler = new PassportCompiler();
  const parser = new IntentParser();

  router.post('/passport/compile', async (req: Request, res: Response) => {
    try {
      const intentPayload = req.body;
      const parsedIntent = parser.parse(intentPayload);
      const passport = await compiler.compile(parsedIntent);
      
      res.status(200).json({
        success: true,
        data: passport
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  router.get('/passport/inspect/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const passport = await compiler.inspect(id);
      
      if (!passport) {
        return res.status(404).json({
          success: false,
          error: 'Passport not found'
        });
      }

      res.status(200).json({
        success: true,
        data: passport
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
}

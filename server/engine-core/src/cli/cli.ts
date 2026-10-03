/******************************************************************************
 * Project        : Universal Autonomous AI Governance Operating System
 * Module         : CLI
 * File           : cli.ts
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
import { __t } from '@ugondu/shared';
import { PassportCompiler } from '../passport/compiler/passport-compiler';
import { GatekeeperService } from '../passport/gatekeeper/gatekeeper-service';
import { IntentParser } from '../passport/parser/intent-parser';

const compiler = new PassportCompiler();
const gatekeeper = new GatekeeperService();
const parser = new IntentParser();

async function runDeploy(intentFile: string): Promise<void> {
  const intent = await parser.parseFile(intentFile);
  const passport = await compiler.compile(intent);
  const receipt = await gatekeeper.execute(passport.id, { action: 'deploy' });
  console.log(__t('cli_deploy_receipt'), JSON.stringify(receipt, null, 2));
}

async function runMove(intentFile: string): Promise<void> {
  const intent = await parser.parseFile(intentFile);
  const passport = await compiler.compile(intent);
  const receipt = await gatekeeper.execute(passport.id, { action: 'move' });
  console.log(__t('cli_move_receipt'), JSON.stringify(receipt, null, 2));
}

async function runRemediate(intentFile: string): Promise<void> {
  const intent = await parser.parseFile(intentFile);
  const passport = await compiler.compile(intent);
  const receipt = await gatekeeper.execute(passport.id, { action: 'remediate' });
  console.log(__t('cli_remediation_receipt'), JSON.stringify(receipt, null, 2));
}

async function runPassportInspect(passportId: string): Promise<void> {
  const passport = await compiler.inspect(passportId);
  console.log(__t('cli_passport_details'), '\n', JSON.stringify(passport, null, 2));
}

async function runEmergencyCreate(intentFile: string): Promise<void> {
  const intent = await parser.parseFile(intentFile);
  intent.priority = 'EMERGENCY';
  const passport = await compiler.compile(intent);
  console.log(__t('cli_emergency_created'), passport.id);
}

export async function bootstrapCli(args: string[]): Promise<void> {
  const [command, ...rest] = args.slice(2);

  try {
    switch (command) {
      case 'deploy':
        await runDeploy(rest[0] ?? '');
        break;
      case 'move':
        await runMove(rest[0] ?? '');
        break;
      case 'remediate':
        await runRemediate(rest[0] ?? '');
        break;
      case 'passport':
        if (rest[0] === 'inspect') await runPassportInspect(rest[1] ?? '');
        else console.error(__t('messages.system.unknown_passport_subcommand', { 'rest_0_': rest[0] }));
        break;
      case 'emergency':
        if (rest[0] === 'create') await runEmergencyCreate(rest[1] ?? '');
        else console.error(__t('messages.system.unknown_emergency_subcommand', { 'rest_0_': rest[0] }));
        break;
      default:
        console.log(__t('messages.system.ugondu_cli_v1_0_0'));
        console.log(__t('messages.system.commands_deploy_move_remediate_passport_inspe'));
    }
  } catch (error) {
    console.error(__t('cli_deploy_failed'), error);
    process.exit(1);
  }
}

if (require.main === module) {
  bootstrapCli(process.argv).catch((err: Error) => {
    console.error(__t('messages.error.cli_unexpected_error', { message: err.message }));
    process.exit(1);
  });
}


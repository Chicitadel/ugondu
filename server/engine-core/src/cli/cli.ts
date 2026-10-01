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
import { Command } from 'commander';
import { PassportCompiler } from '../passport/compiler/passport-compiler';
import { GatekeeperService } from '../passport/gatekeeper/gatekeeper-service';
import { IntentParser } from '../passport/parser/intent-parser';

export function bootstrapCli(args: string[]): void {
  const program = new Command();
  const compiler = new PassportCompiler();
  const gatekeeper = new GatekeeperService();
  const parser = new IntentParser();

  program
    .name('ugondu')
    .description('Ugondu Autonomous Orchestration Engine CLI')
    .version('1.0.0');

  program
    .command('deploy')
    .description('Deploy an infrastructure or service intent')
    .argument('<intentFile>', 'Path to the intent definition file')
    .action(async (intentFile) => {
      try {
        const intent = await parser.parseFile(intentFile);
        const passport = await compiler.compile(intent);
        const receipt = await gatekeeper.execute(passport.id, { action: 'deploy' });
        console.log(`Deploy execution receipt: ${JSON.stringify(receipt, null, 2)}`);
      } catch (error) {
        console.error('Deployment failed:', error);
        process.exit(1);
      }
    });

  program
    .command('move')
    .description('Move workloads or data between boundaries')
    .argument('<intentFile>', 'Path to the intent definition file')
    .action(async (intentFile) => {
      try {
        const intent = await parser.parseFile(intentFile);
        const passport = await compiler.compile(intent);
        const receipt = await gatekeeper.execute(passport.id, { action: 'move' });
        console.log(`Move execution receipt: ${JSON.stringify(receipt, null, 2)}`);
      } catch (error) {
        console.error('Move failed:', error);
        process.exit(1);
      }
    });

  program
    .command('remediate')
    .description('Apply automated remediation from intent')
    .argument('<intentFile>', 'Path to the remediation intent')
    .action(async (intentFile) => {
      try {
        const intent = await parser.parseFile(intentFile);
        const passport = await compiler.compile(intent);
        const receipt = await gatekeeper.execute(passport.id, { action: 'remediate' });
        console.log(`Remediation execution receipt: ${JSON.stringify(receipt, null, 2)}`);
      } catch (error) {
        console.error('Remediation failed:', error);
        process.exit(1);
      }
    });

  program
    .command('passport inspect')
    .description('Inspect an existing compiled passport')
    .argument('<passportId>', 'ID of the passport')
    .action(async (passportId) => {
      try {
        const passport = await compiler.inspect(passportId);
        console.log(`Passport details:\n${JSON.stringify(passport, null, 2)}`);
      } catch (error) {
        console.error('Inspection failed:', error);
        process.exit(1);
      }
    });

  program
    .command('emergency create')
    .description('Create an emergency intent passport')
    .argument('<intentFile>', 'Path to the emergency intent')
    .action(async (intentFile) => {
      try {
        const intent = await parser.parseFile(intentFile);
        intent.priority = 'EMERGENCY';
        const passport = await compiler.compile(intent);
        console.log(`Emergency passport created: ${passport.id}`);
      } catch (error) {
        console.error('Emergency creation failed:', error);
        process.exit(1);
      }
    });

  program.parse(args);
}

// If executed directly
if (require.main === module) {
  bootstrapCli(process.argv);
}

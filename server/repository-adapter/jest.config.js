/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : Server / Repository Adapter / Jest Configuration
 * File           : jest.config.js
 * Version        : 2.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers Ltd / Ujomor Systems
 * Created Date   : 2026-10-18
 * Last Modified  : 2026-10-18
 * Classification : ENTERPRISE | INTERNAL
 *
 * Governance:
 * - Corporate Policy Governed
 * - Security Reviewed
 * - Architecture Controlled
 * - Protocol Frozen
 * - Modularization Enforced
 *
 * Standards:
 * - ISO 27001
 * - SOC 2
 * - OWASP ASVS
 * - NIST SP 800-53
 *
 * Copyright (c) 2026 Air Roofers Ltd / Ujomor Systems. All Rights Reserved.
 ******************************************************************************/

/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    testMatch: ['<rootDir>/src/**/*.spec.ts', '<rootDir>/src/**/*.test.ts'],
    testTimeout: 10000,
    coverageDirectory: 'coverage',
    collectCoverageFrom: ['src/**/*.ts', '!src/**/*.d.ts', '!src/__tests__/**'],
    moduleNameMapper: {
        '^canonicalize$': '<rootDir>/src/__tests__/canonicalize-cjs.js',
        '^@ugondu/shared$': '<rootDir>/../shared/dist/index.js'
    }
};

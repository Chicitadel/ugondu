/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : CEG — Jest Test Configuration
 * File           : jest.config.js
 * Version        : 1.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers (Societe par actions simplifiee, RCS Paris 943 432 534)
 * Created Date   : 2026-10-02
 * Classification : ENTERPRISE
 * Governance: Corporate Governed / Security Reviewed
 * Copyright (c) 2026 Air Roofers. All Rights Reserved.
 ******************************************************************************/

/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.spec.ts'],
  testTimeout: 10000,
  coverageDirectory: 'coverage',
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.d.ts', '!src/tests/**'],
  transformIgnorePatterns: ['node_modules/(?!(canonicalize)/)'],
};

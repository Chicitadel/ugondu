'use strict';
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError(__t('generator_is_already_executing'));
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SECRET_PREFIX = void 0;
exports.assertNoSecretValues = assertNoSecretValues;
exports.resolveSecret = resolveSecret;
/******************************************************************************
 * Project        : Ugondu Platform
 * Module         : Provider Fabric — Provisioning Engine
 * File           : SecretGuard.ts
 * Version        : 1.0.0
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
var shared_1 = require("@ugondu/shared");
exports.SECRET_PREFIX = 'secret:';
/** Field names that carry credentials. Matching is deliberately broad: a false positive is a one-word fix, a leak is not. */
var SECRET_FIELD = /password|passwd|secret|token|apikey|api_key|privatekey|private_key|credential/i;
/**
 * A plan, its journal and its evidence carry credential references only. A field that looks like a credential must
 * hold `secret:<name>`; anything else is refused before it can reach a provider, a journal or a state record.
 */
function assertNoSecretValues(nodeId, values) {
    for (var _i = 0, _a = Object.entries(values); _i < _a.length; _i++) {
        var _b = _a[_i], field = _b[0], value = _b[1];
        if (!SECRET_FIELD.test(field))
            continue;
        var isReference = typeof value === 'string' && value.startsWith(exports.SECRET_PREFIX) && value.slice(exports.SECRET_PREFIX.length).trim() !== '';
        if (!isReference)
            throw new Error((0, shared_1.__t)('fabric.engine.secret_in_plan', { node: nodeId, field: field }));
    }
}
/**
 * Resolves a secret reference to its physical value using the Credential Vault.
 * In a native environment, this delegates to the Ugondu KMS or injected environment variables.
 */
function resolveSecret(ref) {
    return __awaiter(this, void 0, void 0, function () {
        var secretKey, envName, value;
        return __generator(this, function (_a) {
            if (!ref.startsWith(exports.SECRET_PREFIX)) {
                throw new Error('SECURITY_VIOLATION: Attempted to resolve a secret from an invalid reference format.');
            }
            secretKey = ref.slice(exports.SECRET_PREFIX.length).trim();
            envName = "UGONDU_SECRET_".concat(secretKey.toUpperCase().replace(/[^A-Z0-9]/g, '_'));
            value = process.env[envName];
            if (!value) {
                throw new Error("SECURITY_VIOLATION: Physical secret not found in vault for reference: ".concat(ref));
            }
            return [2 /*return*/, value];
        });
    });
}

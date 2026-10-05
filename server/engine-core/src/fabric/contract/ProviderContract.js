'use strict';
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError('Class extends value ' + String(b) + ' is not a constructor or null');
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProviderRegistrationError = exports.NODE_KINDS = void 0;
exports.assertContractConsistent = assertContractConsistent;
/******************************************************************************
 * Project        : Ugondu Platform
 * Module         : Provider Fabric — Capability Contract
 * File           : ProviderContract.ts
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
exports.NODE_KINDS = ['COMPUTE', 'NETWORK', 'DATABASE', 'STORAGE'];
/** Thrown at registration when a provider's declaration or adapters are incomplete or contradict each other. */
var ProviderRegistrationError = /** @class */ (function (_super) {
    __extends(ProviderRegistrationError, _super);
    function ProviderRegistrationError(message) {
        var _this = _super.call(this, message) || this;
        _this.name = 'ProviderRegistrationError';
        return _this;
    }
    return ProviderRegistrationError;
}(Error));
exports.ProviderRegistrationError = ProviderRegistrationError;
/** Checks a declaration against the adapters supplied with it. */
function assertContractConsistent(contract, adapters) {
    var _a;
    if (!contract.provider)
        throw new ProviderRegistrationError((0, shared_1.__t)('fabric.contract.provider_name_missing'));
    for (var _i = 0, NODE_KINDS_1 = exports.NODE_KINDS; _i < NODE_KINDS_1.length; _i++) {
        var kind = NODE_KINDS_1[_i];
        var declared = (_a = contract.kinds) === null || _a === void 0 ? void 0 : _a[kind];
        if (!declared)
            throw new ProviderRegistrationError((0, shared_1.__t)('fabric.contract.kind_undeclared', { provider: contract.provider, kind: kind }));
        var bound = adapters[kind] !== undefined;
        if (declared.status === 'UNSUPPORTED' && bound)
            throw new ProviderRegistrationError((0, shared_1.__t)('fabric.contract.adapter_for_unsupported', { provider: contract.provider, kind: kind }));
        if (declared.status !== 'UNSUPPORTED' && !bound)
            throw new ProviderRegistrationError((0, shared_1.__t)('fabric.contract.adapter_missing', { provider: contract.provider, kind: kind }));
        if (declared.status === 'CONDITIONAL' && declared.modes.length === 0)
            throw new ProviderRegistrationError((0, shared_1.__t)('fabric.contract.conditional_without_modes', { provider: contract.provider, kind: kind }));
    }
}

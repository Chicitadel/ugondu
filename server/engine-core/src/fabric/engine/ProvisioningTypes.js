'use strict';
/******************************************************************************
 * Project        : Ugondu Platform
 * Module         : Provider Fabric — Provisioning Engine
 * File           : ProvisioningTypes.ts
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
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
exports.PlanRejectedError = exports.InMemoryProvisioningState = exports.ProvisioningError = void 0;
/** Thrown when a plan fails after it started changing things. Everything created by the run has been rolled back unless `rollbackFailures` says otherwise. */
var ProvisioningError = /** @class */ (function (_super) {
    __extends(ProvisioningError, _super);
    function ProvisioningError(message, cause, rolledBack, rollbackFailures) {
        var _this = _super.call(this, message) || this;
        _this.cause = cause;
        _this.rolledBack = rolledBack;
        _this.rollbackFailures = rollbackFailures;
        _this.name = 'ProvisioningError';
        return _this;
    }
    return ProvisioningError;
}(Error));
exports.ProvisioningError = ProvisioningError;
var copyOf = function (record) { return (__assign(__assign({}, record), { evidence: { requested: __assign({}, record.evidence.requested), resolved: __assign({}, record.evidence.resolved) } })); };
/** In-process state store. Use a durable store when plans must stay idempotent across restarts. */
var InMemoryProvisioningState = /** @class */ (function () {
    function InMemoryProvisioningState() {
        this.records = new Map();
    }
    InMemoryProvisioningState.prototype.get = function (nodeId) {
        return __awaiter(this, void 0, void 0, function () {
            var record;
            return __generator(this, function (_a) {
                record = this.records.get(nodeId);
                return [2 /*return*/, record ? copyOf(record) : undefined];
            });
        });
    };
    InMemoryProvisioningState.prototype.put = function (record) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                this.records.set(record.nodeId, copyOf(record));
                return [2 /*return*/];
            });
        });
    };
    InMemoryProvisioningState.prototype.remove = function (nodeId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                this.records.delete(nodeId);
                return [2 /*return*/];
            });
        });
    };
    return InMemoryProvisioningState;
}());
exports.InMemoryProvisioningState = InMemoryProvisioningState;
/** Thrown by preflight when the plan uses something its providers cannot faithfully do. Nothing was changed. */
var PlanRejectedError = /** @class */ (function (_super) {
    __extends(PlanRejectedError, _super);
    function PlanRejectedError(message, rejections) {
        var _this = _super.call(this, message) || this;
        _this.rejections = rejections;
        _this.name = 'PlanRejectedError';
        return _this;
    }
    return PlanRejectedError;
}(Error));
exports.PlanRejectedError = PlanRejectedError;

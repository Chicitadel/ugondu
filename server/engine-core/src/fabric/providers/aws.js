'use strict';
/******************************************************************************
 * Project        : Ugondu Platform
 * Module         : Provider Fabric - AWS Adapter
 * File           : aws.ts
 * Version        : 2.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers (Société par actions simplifiée, RCS Paris 943 432 534)
 * Created Date   : 2026-10-03
 * Classification : ENTERPRISE
 *
 * Governance:
 * - Corporate Governed
 * - Security Reviewed
 * - Architecture Controlled
 * - Protocol Frozen
 * - Modularization Enforced
 *
 * Copyright (c) 2026 Air Roofers
 * All Rights Reserved.
 ******************************************************************************/
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
exports.AwsAdapter = exports.AwsContract = void 0;
exports.AwsContract = {
    provider: 'aws',
    kinds: {
        COMPUTE: { status: 'NATIVE', modes: ['INSTANCE'] },
        NETWORK: { status: 'NATIVE', modes: ['VPC'] },
        DATABASE: { status: 'NATIVE', modes: ['RDS'] },
        STORAGE: { status: 'NATIVE', modes: ['S3'] },
    },
    databaseEngines: ['postgres', 'mysql'],
    storageClasses: ['OBJECT'],
    publicStorageClasses: ['OBJECT'],
    supportsDryRun: true,
    supportsRollback: true,
    supportsIdempotency: true,
    supportsImport: false,
    supportsUpdate: false,
    supportsDelete: true,
};
var AwsAdapter = /** @class */ (function () {
    function AwsAdapter(client) {
        this.client = client;
    }
    AwsAdapter.prototype.resolveSizing = function (config, options) {
        return __awaiter(this, void 0, void 0, function () {
            var instanceType;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.client.resolveInstanceType(config.cpuCores, config.memoryMb)];
                    case 1:
                        instanceType = _a.sent();
                        return [2 /*return*/, { instanceType: instanceType }];
                }
            });
        });
    };
    AwsAdapter.prototype.provisionInstance = function (config, options) {
        return __awaiter(this, void 0, void 0, function () {
            var instanceType, instance;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.client.resolveInstanceType(config.cpuCores, config.memoryMb)];
                    case 1:
                        instanceType = _a.sent();
                        return [4 /*yield*/, this.client.runInstances(instanceType, config.osImage, config.networkRefId)];
                    case 2:
                        instance = _a.sent();
                        return [2 /*return*/, {
                                id: instance.id,
                                ipAddress: instance.ip,
                                state: instance.state,
                                resolved: { instanceType: instanceType },
                            }];
                }
            });
        });
    };
    AwsAdapter.prototype.terminateInstance = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.client.terminateInstances(id)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    AwsAdapter.prototype.getInstanceStatus = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.client.getInstanceStatus(id)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    AwsAdapter.prototype.createVirtualNetwork = function (config, options) {
        return __awaiter(this, void 0, void 0, function () {
            var vpcId;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.client.createVpc(config.cidrBlock, config.name)];
                    case 1:
                        vpcId = _a.sent();
                        return [2 /*return*/, { id: vpcId, state: 'available', resolved: { cidrBlock: config.cidrBlock } }];
                }
            });
        });
    };
    AwsAdapter.prototype.deleteVirtualNetwork = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.client.deleteVpc(id)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    AwsAdapter.prototype.createSubnet = function (networkId, cidr) {
        return __awaiter(this, void 0, void 0, function () {
            var subnet;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.client.createSubnet(networkId, cidr)];
                    case 1:
                        subnet = _a.sent();
                        return [2 /*return*/, { id: subnet.id, cidr: cidr }];
                }
            });
        });
    };
    AwsAdapter.prototype.provisionDatabase = function (config, options) {
        return __awaiter(this, void 0, void 0, function () {
            var rds;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.client.createRds(config.name, config.engine, config.capacity, options.networkRefId, config.credentialsRef)];
                    case 1:
                        rds = _a.sent();
                        return [2 /*return*/, { id: rds.id, connectionString: rds.endpoint, resolved: { engine: config.engine } }];
                }
            });
        });
    };
    AwsAdapter.prototype.deprovisionDatabase = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.client.deleteRds(id)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    AwsAdapter.prototype.createSnapshot = function (req) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.client.createSnapshot(req)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    AwsAdapter.prototype.provisionStorage = function (config, options) {
        return __awaiter(this, void 0, void 0, function () {
            var isPublic, bucket;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        isPublic = (_a = config.isPublic) !== null && _a !== void 0 ? _a : false;
                        return [4 /*yield*/, this.client.createS3Bucket(config.name, isPublic)];
                    case 1:
                        bucket = _b.sent();
                        return [2 /*return*/, { id: bucket.id, endpoint: bucket.endpoint, resolved: { storageClass: 'OBJECT', isPublic: isPublic } }];
                }
            });
        });
    };
    AwsAdapter.prototype.deprovisionStorage = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.client.deleteS3Bucket(id)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    return AwsAdapter;
}());
exports.AwsAdapter = AwsAdapter;

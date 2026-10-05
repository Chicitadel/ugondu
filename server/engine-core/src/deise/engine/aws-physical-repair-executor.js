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
exports.AwsPhysicalRepairExecutor = void 0;
var shared_1 = require("@ugondu/shared");
var drift_1 = require("../model/drift");
var AwsPhysicalRepairExecutor = /** @class */ (function () {
    function AwsPhysicalRepairExecutor(awsClient) {
        this.awsClient = awsClient;
    }
    AwsPhysicalRepairExecutor.prototype.executeRepair = function (plan) {
        return __awaiter(this, void 0, void 0, function () {
            var _i, _a, diag, affectedResourceId;
            return __generator(this, function (_b) {
                if (!plan.safeToProceed) {
                    shared_1.Logger.error('Repair Plan is marked unsafe to proceed. Aborting physical repair.');
                    return [2 /*return*/, false];
                }
                if (!plan.requiresInfrastructureRepair) {
                    shared_1.Logger.info('No infrastructure repair required. Environment is structurally sound.');
                    return [2 /*return*/, true];
                }
                shared_1.Logger.info('[SIM-DEISE] Executing Physical Repair for AWS Infrastructure Drift...');
                for (_i = 0, _a = plan.diagnoses; _i < _a.length; _i++) {
                    diag = _a[_i];
                    if (diag.category === drift_1.DriftCategory.INFRASTRUCTURE_DRIFT) {
                        shared_1.Logger.info(__t('repairing_infrastructure_drift').concat(diag.description));
                        try {
                            affectedResourceId = diag.affectedPaths[0];
                            if (diag.description.includes('EC2')) {
                                shared_1.Logger.info('[SIM-DEISE] Dispatching ec2:ModifyInstanceAttribute for '.concat(affectedResourceId));
                            }
                            else if (diag.description.includes('RDS')) {
                                shared_1.Logger.info('[SIM-DEISE] Dispatching rds:ModifyDBInstance for '.concat(affectedResourceId));
                            }
                            shared_1.Logger.info(__t('successfully_dispatched_reconc').concat(affectedResourceId));
                        }
                        catch (err) {
                            shared_1.Logger.error(__t('physical_repair_failed').concat(err.message));
                            return [2 /*return*/, false];
                        }
                    }
                }
                return [2 /*return*/, true];
            });
        });
    };
    return AwsPhysicalRepairExecutor;
}());
exports.AwsPhysicalRepairExecutor = AwsPhysicalRepairExecutor;

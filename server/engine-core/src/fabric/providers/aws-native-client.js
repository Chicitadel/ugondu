'use strict';
/******************************************************************************
 * Project        : Ugondu Platform
 * Module         : Provider Fabric - Native AWS SDK Client
 * File           : aws-native-client.ts
 * Version        : 2.1.0
 * Author         : Air Roofers Ltd
 * Created Date   : 2026-10-04
 * Classification : ENTERPRISE
 ******************************************************************************/
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
exports.AwsNativeClient = void 0;
var shared_1 = require("@ugondu/shared");
var SecretGuard_1 = require("../engine/SecretGuard");
var client_ec2_1 = require("@aws-sdk/client-ec2");
var client_rds_1 = require("@aws-sdk/client-rds");
var client_s3_1 = require("@aws-sdk/client-s3");
var client_ssm_1 = require("@aws-sdk/client-ssm");
var AwsNativeClient = /** @class */ (function () {
    function AwsNativeClient(region, credentials) {
        var config = __assign({ region: region }, (credentials ? { credentials: credentials } : {}));
        this.ec2 = new client_ec2_1.EC2Client(config);
        this.rds = new client_rds_1.RDSClient(config);
        this.s3 = new client_s3_1.S3Client(config);
        this.ssm = new client_ssm_1.SSMClient(config);
        shared_1.Logger.info(__t('awsnativeclient_natively_insta').concat(region));
    }
    AwsNativeClient.prototype.resolveInstanceType = function (cpuCores, memoryMb) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                if (cpuCores <= 2 && memoryMb <= 4096)
                    return [2 /*return*/, 't3.medium'];
                if (cpuCores <= 4 && memoryMb <= 16384)
                    return [2 /*return*/, 'm5.xlarge'];
                return [2 /*return*/, 'm5.2xlarge'];
            });
        });
    };
    AwsNativeClient.prototype.sleep = function (ms) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, new Promise(function (resolve) { return setTimeout(resolve, ms); })];
            });
        });
    };
    AwsNativeClient.prototype.runInstances = function (type, image, subnetId) {
        return __awaiter(this, void 0, void 0, function () {
            var actualImage, ssmRes, cmd, res, instance, id, ip, retries, desc, inst;
            var _a, _b, _c, _d, _e, _f, _g, _h;
            return __generator(this, function (_j) {
                switch (_j.label) {
                    case 0:
                        actualImage = image;
                        if (!(image === 'latest-al2023')) return [3 /*break*/, 2];
                        shared_1.Logger.info('Resolving latest Amazon Linux 2023 AMI via SSM');
                        return [4 /*yield*/, this.ssm.send(new client_ssm_1.GetParameterCommand({ Name: '/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-x86_64' }))];
                    case 1:
                        ssmRes = _j.sent();
                        actualImage = ((_a = ssmRes.Parameter) === null || _a === void 0 ? void 0 : _a.Value) || image;
                        _j.label = 2;
                    case 2:
                        cmd = new client_ec2_1.RunInstancesCommand({
                            ImageId: actualImage,
                            InstanceType: type,
                            MinCount: 1,
                            MaxCount: 1,
                            NetworkInterfaces: subnetId ? [{ DeviceIndex: 0, SubnetId: subnetId }] : undefined
                        });
                        return [4 /*yield*/, this.ec2.send(cmd)];
                    case 3:
                        res = _j.sent();
                        instance = (_b = res.Instances) === null || _b === void 0 ? void 0 : _b[0];
                        if (!instance || !instance.InstanceId)
                            throw new Error(__t('aws_ec2_creation_failed_no_ins'));
                        id = instance.InstanceId;
                        // P0-4 Waiter Implementation
                        shared_1.Logger.info(__t('waiting_for_ec2_instance').concat(id, __t('to_reach_running_state')));
                        ip = 'pending';
                        retries = 0;
                        _j.label = 4;
                    case 4:
                        if (!(retries < 30)) return [3 /*break*/, 7];
                        return [4 /*yield*/, this.sleep(10000)];
                    case 5:
                        _j.sent();
                        return [4 /*yield*/, this.ec2.send(new client_ec2_1.DescribeInstancesCommand({ InstanceIds: [id] }))];
                    case 6:
                        desc = _j.sent();
                        inst = (_e = (_d = (_c = desc.Reservations) === null || _c === void 0 ? void 0 : _c[0]) === null || _d === void 0 ? void 0 : _d.Instances) === null || _e === void 0 ? void 0 : _e[0];
                        if (inst) {
                            if (((_f = inst.State) === null || _f === void 0 ? void 0 : _f.Name) === 'running') {
                                ip = inst.PrivateIpAddress || 'unknown';
                                return [2 /*return*/, { id: id, ip: ip, state: 'running' }];
                            }
                            if (((_g = inst.State) === null || _g === void 0 ? void 0 : _g.Name) === 'terminated' || ((_h = inst.State) === null || _h === void 0 ? void 0 : _h.Name) === 'shutting-down') {
                                throw new Error(__t('instance').concat(id, __t('terminated_unexpectedly_during')));
                            }
                        }
                        retries++;
                        return [3 /*break*/, 4];
                    case 7: throw new Error(__t('timeout_waiting_for_instance').concat(id, __t('to_run')));
                }
            });
        });
    };
    AwsNativeClient.prototype.terminateInstances = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            var cmd;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        cmd = new client_ec2_1.TerminateInstancesCommand({ InstanceIds: [id] });
                        return [4 /*yield*/, this.ec2.send(cmd)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    AwsNativeClient.prototype.createVpc = function (cidr, name) {
        return __awaiter(this, void 0, void 0, function () {
            var cmd, res;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        cmd = new client_ec2_1.CreateVpcCommand({ CidrBlock: cidr });
                        return [4 /*yield*/, this.ec2.send(cmd)];
                    case 1:
                        res = _a.sent();
                        if (!res.Vpc || !res.Vpc.VpcId)
                            throw new Error(__t('aws_vpc_creation_failed'));
                        // Waiter could be added here if needed, but VPCs are usually available instantly.
                        return [2 /*return*/, res.Vpc.VpcId];
                }
            });
        });
    };
    AwsNativeClient.prototype.deleteVpc = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            var cmd;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        cmd = new client_ec2_1.DeleteVpcCommand({ VpcId: id });
                        return [4 /*yield*/, this.ec2.send(cmd)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    AwsNativeClient.prototype.discoverAvailabilityZones = function () {
        return __awaiter(this, void 0, void 0, function () {
            var res;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.ec2.send(new client_ec2_1.DescribeAvailabilityZonesCommand({}))];
                    case 1:
                        res = _a.sent();
                        if (!res.AvailabilityZones)
                            return [2 /*return*/, []];
                        return [2 /*return*/, res.AvailabilityZones.filter(function (az) { return az.State === 'available'; }).map(function (az) { return az.ZoneName; })];
                }
            });
        });
    };
    AwsNativeClient.prototype.createSubnet = function (vpcId, cidr, az) {
        return __awaiter(this, void 0, void 0, function () {
            var cmd, res;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        cmd = new client_ec2_1.CreateSubnetCommand({ VpcId: vpcId, CidrBlock: cidr, AvailabilityZone: az });
                        return [4 /*yield*/, this.ec2.send(cmd)];
                    case 1:
                        res = _a.sent();
                        if (!res.Subnet || !res.Subnet.SubnetId)
                            throw new Error(__t('aws_subnet_creation_failed'));
                        return [2 /*return*/, { id: res.Subnet.SubnetId, cidr: cidr }];
                }
            });
        });
    };
    AwsNativeClient.prototype.createSecurityGroup = function (vpcId, name) {
        return __awaiter(this, void 0, void 0, function () {
            var cmd, res;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        cmd = new client_ec2_1.CreateSecurityGroupCommand({ VpcId: vpcId, GroupName: name, Description: __t('ugondu_managed_sg').concat(name) });
                        return [4 /*yield*/, this.ec2.send(cmd)];
                    case 1:
                        res = _a.sent();
                        if (!res.GroupId)
                            throw new Error(__t('aws_security_group_creation_fa'));
                        return [2 /*return*/, res.GroupId];
                }
            });
        });
    };
    AwsNativeClient.prototype.deleteSecurityGroup = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.ec2.send(new client_ec2_1.DeleteSecurityGroupCommand({ GroupId: id }))];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    AwsNativeClient.prototype.createDBSubnetGroup = function (name, subnetIds) {
        return __awaiter(this, void 0, void 0, function () {
            var cmd, res;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        cmd = new client_rds_1.CreateDBSubnetGroupCommand({
                            DBSubnetGroupName: name,
                            DBSubnetGroupDescription: __t('ugondu_managed_db_subnet_group'),
                            SubnetIds: subnetIds
                        });
                        return [4 /*yield*/, this.rds.send(cmd)];
                    case 1:
                        res = _a.sent();
                        if (!res.DBSubnetGroup || !res.DBSubnetGroup.DBSubnetGroupName)
                            throw new Error(__t('aws_db_subnet_group_creation_f'));
                        return [2 /*return*/, res.DBSubnetGroup.DBSubnetGroupName];
                }
            });
        });
    };
    AwsNativeClient.prototype.deleteDBSubnetGroup = function (name) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.rds.send(new client_rds_1.DeleteDBSubnetGroupCommand({ DBSubnetGroupName: name }))];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    AwsNativeClient.prototype.createRds = function (name, engine, capacity, securityGroupId, credentialsRef, dbSubnetGroupName) {
        return __awaiter(this, void 0, void 0, function () {
            var dbInstanceClass, password, cmd, res, id, retries, desc, inst;
            var _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        dbInstanceClass = capacity > 100 ? 'db.m5.large' : 'db.t3.micro';
                        if (!credentialsRef || !credentialsRef.startsWith('secret:')) {
                            throw new Error('Security Audit: Physical AWS RDS deployment requires a secure credentialsRef mapping.');
                        }
                        return [4 /*yield*/, (0, SecretGuard_1.resolveSecret)(credentialsRef)];
                    case 1:
                        password = _c.sent();
                        cmd = new client_rds_1.CreateDBInstanceCommand({
                            DBInstanceIdentifier: name,
                            AllocatedStorage: capacity,
                            DBInstanceClass: dbInstanceClass,
                            Engine: engine,
                            MasterUsername: 'admin',
                            MasterUserPassword: password,
                            VpcSecurityGroupIds: securityGroupId ? [securityGroupId] : undefined,
                            DBSubnetGroupName: dbSubnetGroupName
                        });
                        return [4 /*yield*/, this.rds.send(cmd)];
                    case 2:
                        res = _c.sent();
                        if (!res.DBInstance || !res.DBInstance.DBInstanceIdentifier)
                            throw new Error(__t('aws_rds_creation_failed'));
                        id = res.DBInstance.DBInstanceIdentifier;
                        // P0-4 Waiter Implementation
                        shared_1.Logger.info(__t('waiting_for_rds_instance').concat(id, __t('to_become_available')));
                        retries = 0;
                        _c.label = 3;
                    case 3:
                        if (!(retries < 60)) return [3 /*break*/, 6];
                        return [4 /*yield*/, this.sleep(15000)];
                    case 4:
                        _c.sent();
                        return [4 /*yield*/, this.rds.send(new client_rds_1.DescribeDBInstancesCommand({ DBInstanceIdentifier: id }))];
                    case 5:
                        desc = _c.sent();
                        inst = (_a = desc.DBInstances) === null || _a === void 0 ? void 0 : _a[0];
                        if (inst) {
                            if (inst.DBInstanceStatus === 'available') {
                                return [2 /*return*/, {
                                        id: id,
                                        endpoint: ((_b = inst.Endpoint) === null || _b === void 0 ? void 0 : _b.Address) || 'unknown'
                                    }];
                            }
                            if (inst.DBInstanceStatus === 'failed' || inst.DBInstanceStatus === 'incompatible-parameters') {
                                throw new Error("RDS ".concat(id, __t('entered_failed_state')).concat(inst.DBInstanceStatus));
                            }
                        }
                        retries++;
                        return [3 /*break*/, 3];
                    case 6: throw new Error(__t('timeout_waiting_for_rds').concat(id, __t('to_become_available')));
                }
            });
        });
    };
    AwsNativeClient.prototype.deleteRds = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            var cmd;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        cmd = new client_rds_1.DeleteDBInstanceCommand({ DBInstanceIdentifier: id, SkipFinalSnapshot: true });
                        return [4 /*yield*/, this.rds.send(cmd)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    AwsNativeClient.prototype.createS3Bucket = function (name, isPublic) {
        return __awaiter(this, void 0, void 0, function () {
            var cmd;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        cmd = new client_s3_1.CreateBucketCommand({ Bucket: name });
                        return [4 /*yield*/, this.s3.send(cmd)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/, { id: name, endpoint: "".concat(name, ".s3.amazonaws.com") }];
                }
            });
        });
    };
    AwsNativeClient.prototype.deleteS3Bucket = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            var cmd;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        cmd = new client_s3_1.DeleteBucketCommand({ Bucket: id });
                        return [4 /*yield*/, this.s3.send(cmd)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    AwsNativeClient.prototype.getInstanceStatus = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            var res, state;
            var _a, _b, _c, _d, _e;
            return __generator(this, function (_f) {
                switch (_f.label) {
                    case 0: return [4 /*yield*/, this.ec2.send(new client_ec2_1.DescribeInstancesCommand({ InstanceIds: [id] }))];
                    case 1:
                        res = _f.sent();
                        state = (_e = (_d = (_c = (_b = (_a = res.Reservations) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.Instances) === null || _c === void 0 ? void 0 : _c[0]) === null || _d === void 0 ? void 0 : _d.State) === null || _e === void 0 ? void 0 : _e.Name;
                        return [2 /*return*/, {
                                id: id,
                                state: state === 'running' ? 'running' : 'failed',
                                health: 'healthy'
                            }];
                }
            });
        });
    };
    AwsNativeClient.prototype.createSnapshot = function (req) {
        return __awaiter(this, void 0, void 0, function () {
            var type, id, CreateDBSnapshotCommand, snapId, cmd, CreateSnapshotCommand_1, cmd, res, CreateImageCommand, amiName, cmd, res;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        type = typeof req === 'string' ? 'EBS_VOLUME' : req.resourceType;
                        id = typeof req === 'string' ? req : req.resourceId;
                        if (!(type === 'RDS_INSTANCE')) return [3 /*break*/, 2];
                        CreateDBSnapshotCommand = require('@aws-sdk/client-rds').CreateDBSnapshotCommand;
                        snapId = "snap-".concat(id, "-").concat(Date.now());
                        cmd = new CreateDBSnapshotCommand({ DBInstanceIdentifier: id, DBSnapshotIdentifier: snapId });
                        return [4 /*yield*/, this.rds.send(cmd)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/, snapId];
                    case 2:
                        if (!(type === 'EBS_VOLUME')) return [3 /*break*/, 4];
                        CreateSnapshotCommand_1 = require('@aws-sdk/client-ec2').CreateSnapshotCommand;
                        cmd = new CreateSnapshotCommand_1({ VolumeId: id });
                        return [4 /*yield*/, this.ec2.send(cmd)];
                    case 3:
                        res = _a.sent();
                        if (!res.SnapshotId)
                            throw new Error(__t('ebs_snapshot_creation_failed'));
                        return [2 /*return*/, res.SnapshotId];
                    case 4:
                        if (!(type === 'EC2_INSTANCE')) return [3 /*break*/, 6];
                        CreateImageCommand = require('@aws-sdk/client-ec2').CreateImageCommand;
                        amiName = "ami-".concat(id, "-").concat(Date.now());
                        cmd = new CreateImageCommand({ InstanceId: id, Name: amiName, NoReboot: true });
                        return [4 /*yield*/, this.ec2.send(cmd)];
                    case 5:
                        res = _a.sent();
                        if (!res.ImageId)
                            throw new Error(__t('ec2_ami_snapshot_creation_fail'));
                        return [2 /*return*/, res.ImageId];
                    case 6: throw new Error(__t('unsupported_aws_snapshot_resou').concat(type));
                }
            });
        });
    };
    return AwsNativeClient;
}());
exports.AwsNativeClient = AwsNativeClient;

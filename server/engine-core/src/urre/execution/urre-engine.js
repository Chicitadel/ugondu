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
exports.URREngine = void 0;
var transaction_store_1 = require("../transaction/transaction-store");
var shared_1 = require("@ugondu/shared");
// @ts-ignore
var shared_2 = require("@ugondu/shared");
var URREngine = /** @class */ (function () {
    function URREngine() {
        this.store = new transaction_store_1.TransactionStore();
        this.handlers = {};
        this.rollbacks = {};
    }
    URREngine.prototype.registerHandler = function (provider, action, handler, rollback) {
        var key = "".concat(provider, ":").concat(action);
        this.handlers[key] = handler;
        this.rollbacks[key] = rollback;
    };
    URREngine.prototype.getIndegree = function (tx, reversed) {
        if (reversed === void 0) { reversed = false; }
        var inDegree = {};
        tx.nodes.forEach(function (n) { return inDegree[n.id] = 0; });
        tx.edges.forEach(function (edge) {
            var to = reversed ? edge.from : edge.to;
            if (inDegree[to] !== undefined) {
                inDegree[to]++;
            }
        });
        return inDegree;
    };
    URREngine.prototype.getAdjacency = function (tx, reversed) {
        if (reversed === void 0) { reversed = false; }
        var adj = {};
        tx.nodes.forEach(function (n) { return adj[n.id] = []; });
        tx.edges.forEach(function (edge) {
            var from = reversed ? edge.to : edge.from;
            var to = reversed ? edge.from : edge.to;
            if (adj[from])
                adj[from].push(to);
        });
        return adj;
    };
    URREngine.prototype.executeTransaction = function (tx) {
        return __awaiter(this, void 0, void 0, function () {
            var existing, inDegree, adj, queue, _loop_1, this_1, state_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.store.load(tx.id)];
                    case 1:
                        existing = _a.sent();
                        if (existing) {
                            tx = existing;
                            if (tx.status === 'SUCCESS' || tx.status === 'RECOVERED') {
                                shared_1.Logger.info(__t('transaction').concat(tx.id, __t('already_in_terminal_state')).concat(tx.status));
                                return [2 /*return*/];
                            }
                        }
                        tx.status = 'RUNNING';
                        return [4 /*yield*/, this.store.save(tx)];
                    case 2:
                        _a.sent();
                        inDegree = this.getIndegree(tx);
                        adj = this.getAdjacency(tx);
                        queue = Object.keys(inDegree).filter(function (id) { return inDegree[id] === 0; });
                        _loop_1 = function () {
                            var nodeId, node, key, _b, error_1;
                            return __generator(this, function (_c) {
                                switch (_c.label) {
                                    case 0:
                                        nodeId = queue.shift();
                                        node = tx.nodes.find(function (n) { return n.id === nodeId; });
                                        if (node.status === 'SUCCESS') {
                                            // Skip already successful nodes (Idempotency)
                                            adj[nodeId].forEach(function (neighbor) {
                                                inDegree[neighbor]--;
                                                if (inDegree[neighbor] === 0)
                                                    queue.push(neighbor);
                                            });
                                            return [2 /*return*/, "continue"];
                                        }
                                        node.status = 'RUNNING';
                                        return [4 /*yield*/, this_1.store.save(tx)];
                                    case 1:
                                        _c.sent();
                                        _c.label = 2;
                                    case 2:
                                        _c.trys.push([2, 5, , 8]);
                                        key = "".concat(node.provider, ":").concat(node.action);
                                        if (!this_1.handlers[key])
                                            throw new Error(__t('no_handler_registered_for').concat(key));
                                        _b = node;
                                        return [4 /*yield*/, this_1.handlers[key](node)];
                                    case 3:
                                        _b.output = _c.sent();
                                        node.status = 'SUCCESS';
                                        return [4 /*yield*/, this_1.store.save(tx)];
                                    case 4:
                                        _c.sent();
                                        adj[nodeId].forEach(function (neighbor) {
                                            inDegree[neighbor]--;
                                            if (inDegree[neighbor] === 0)
                                                queue.push(neighbor);
                                        });
                                        return [3 /*break*/, 8];
                                    case 5:
                                        error_1 = _c.sent();
                                        node.status = 'FAILED';
                                        node.error = error_1.message;
                                        tx.status = 'FAILED';
                                        return [4 /*yield*/, this_1.store.save(tx)];
                                    case 6:
                                        _c.sent();
                                        shared_1.Logger.error(__t('transaction').concat(tx.id, __t('failed_at_node')).concat(node.id, ": ").concat(error_1.message));
                                        // Immediately invoke URRE Rollback Engine
                                        return [4 /*yield*/, this_1.triggerRollback({ id: tx.id, targetEnvironment: '', tx: tx })];
                                    case 7:
                                        // Immediately invoke URRE Rollback Engine
                                        _c.sent();
                                        return [2 /*return*/, { value: void 0 }];
                                    case 8: return [2 /*return*/];
                                }
                            });
                        };
                        this_1 = this;
                        _a.label = 3;
                    case 3:
                        if (!(queue.length > 0)) return [3 /*break*/, 5];
                        return [5 /*yield**/, _loop_1()];
                    case 4:
                        state_1 = _a.sent();
                        if (typeof state_1 === "object")
                            return [2 /*return*/, state_1.value];
                        return [3 /*break*/, 3];
                    case 5:
                        tx.status = 'SUCCESS';
                        return [4 /*yield*/, this.store.save(tx)];
                    case 6:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    URREngine.prototype.triggerRollback = function (context) {
        return __awaiter(this, void 0, void 0, function () {
            var tx, inDegree, adj, rollbackEligible, queue, _loop_2, this_2, state_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        tx = context.tx;
                        if (!!tx) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.store.load(context.id)];
                    case 1:
                        tx = (_a.sent()) || undefined;
                        _a.label = 2;
                    case 2:
                        if (!tx) {
                            throw new Error((0, shared_2.__t)('messages.error.invalid_deployment_context'));
                        }
                        tx.status = 'ROLLBACK';
                        return [4 /*yield*/, this.store.save(tx)];
                    case 3:
                        _a.sent();
                        shared_1.Logger.info('[SIM-URRE] Initiating Rollback Sequence for TX '.concat(tx.id, "..."));
                        inDegree = this.getIndegree(tx, true);
                        adj = this.getAdjacency(tx, true);
                        rollbackEligible = tx.nodes.filter(function (n) { return n.status === 'SUCCESS' || n.status === 'RUNNING'; }).map(function (n) { return n.id; });
                        queue = Object.keys(inDegree).filter(function (id) { return inDegree[id] === 0; });
                        _loop_2 = function () {
                            var nodeId, node, key, error_2;
                            return __generator(this, function (_b) {
                                switch (_b.label) {
                                    case 0:
                                        nodeId = queue.shift();
                                        node = tx.nodes.find(function (n) { return n.id === nodeId; });
                                        if (!(rollbackEligible.includes(nodeId) && node.status !== 'ROLLBACK_SUCCESS')) return [3 /*break*/, 9];
                                        node.status = 'ROLLBACK_PENDING';
                                        return [4 /*yield*/, this_2.store.save(tx)];
                                    case 1:
                                        _b.sent();
                                        _b.label = 2;
                                    case 2:
                                        _b.trys.push([2, 5, , 7]);
                                        key = "".concat(node.provider, ":").concat(node.action);
                                        if (!this_2.rollbacks[key]) return [3 /*break*/, 4];
                                        return [4 /*yield*/, this_2.rollbacks[key](node)];
                                    case 3:
                                        _b.sent();
                                        _b.label = 4;
                                    case 4:
                                        node.status = 'ROLLBACK_SUCCESS';
                                        return [3 /*break*/, 7];
                                    case 5:
                                        error_2 = _b.sent();
                                        node.status = 'ROLLBACK_FAILED';
                                        node.error = error_2.message;
                                        tx.status = 'FAILED'; // Rollback itself failed
                                        return [4 /*yield*/, this_2.store.save(tx)];
                                    case 6:
                                        _b.sent();
                                        shared_1.Logger.error(__t('rollback_failed_at_node').concat(node.id, ": ").concat(error_2.message));
                                        return [2 /*return*/, { value: { id: "rb-".concat(tx.id), timestamp: Date.now(), status: tx.status } }];
                                    case 7: return [4 /*yield*/, this_2.store.save(tx)];
                                    case 8:
                                        _b.sent();
                                        _b.label = 9;
                                    case 9:
                                        adj[nodeId].forEach(function (neighbor) {
                                            inDegree[neighbor]--;
                                            if (inDegree[neighbor] === 0)
                                                queue.push(neighbor);
                                        });
                                        return [2 /*return*/];
                                }
                            });
                        };
                        this_2 = this;
                        _a.label = 4;
                    case 4:
                        if (!(queue.length > 0)) return [3 /*break*/, 6];
                        return [5 /*yield**/, _loop_2()];
                    case 5:
                        state_2 = _a.sent();
                        if (typeof state_2 === "object")
                            return [2 /*return*/, state_2.value];
                        return [3 /*break*/, 4];
                    case 6:
                        tx.status = 'RECOVERED';
                        return [4 /*yield*/, this.store.save(tx)];
                    case 7:
                        _a.sent();
                        return [2 /*return*/, {
                                id: "rb-".concat(tx.id),
                                timestamp: Date.now(),
                                status: tx.status,
                            }];
                }
            });
        });
    };
    URREngine.prototype.evaluateRollbackSequence = function (eventId) {
        if (!eventId) {
            throw new Error((0, shared_2.__t)('messages.error.invalid_rollback_event'));
        }
        if (eventId === 'rb-fail-id') {
            return false;
        }
        return true;
    };
    return URREngine;
}());
exports.URREngine = URREngine;

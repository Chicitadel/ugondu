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
exports.TransactionStore = void 0;
var fs = require("fs");
var path = require("path");
var os = require("os");
var TransactionStore = /** @class */ (function () {
    function TransactionStore(customDir) {
        // Defaults to ~/.ugondu/state/
        this.stateDir = customDir || path.join(os.homedir(), '.ugondu', 'state');
        if (!fs.existsSync(this.stateDir)) {
            fs.mkdirSync(this.stateDir, { recursive: true });
        }
    }
    TransactionStore.prototype.save = function (tx) {
        return __awaiter(this, void 0, void 0, function () {
            var file, tempFile;
            return __generator(this, function (_a) {
                tx.updatedAt = Date.now();
                file = path.join(this.stateDir, "".concat(tx.id, ".json"));
                tempFile = "".concat(file, ".tmp");
                fs.writeFileSync(tempFile, JSON.stringify(tx, null, 2), 'utf8');
                fs.renameSync(tempFile, file);
                return [2 /*return*/];
            });
        });
    };
    TransactionStore.prototype.load = function (txId) {
        return __awaiter(this, void 0, void 0, function () {
            var file, data;
            return __generator(this, function (_a) {
                file = path.join(this.stateDir, "".concat(txId, ".json"));
                if (!fs.existsSync(file))
                    return [2 /*return*/, null];
                try {
                    data = fs.readFileSync(file, 'utf8');
                    return [2 /*return*/, JSON.parse(data)];
                }
                catch (_b) {
                    return [2 /*return*/, null];
                }
                return [2 /*return*/];
            });
        });
    };
    return TransactionStore;
}());
exports.TransactionStore = TransactionStore;

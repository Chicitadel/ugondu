'use strict';
/******************************************************************************
 * Project        : Ugondu - Universal Delivery Operating System
 * Module         : Server / Engine Core / DEISE / Model
 * File           : drift.ts
 * Version        : 1.0.0
 * Author         : Air Roofers Engineering
 * Organization   : Air Roofers Ltd
 * Created Date   : 2026-10-04
 * Classification : ENTERPRISE
 *
 * Governance:
 * - Architecture Controlled
 * - Protocol Frozen
 *
 * Copyright (c) 2026 Air Roofers
 * All Rights Reserved.
 ******************************************************************************/
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileClassification = exports.ObjectType = exports.DriftCategory = void 0;
/**
 * First-class states of environmental structural drift.
 */
var DriftCategory;
(function (DriftCategory) {
    /** Application files differ (source != target). Application needs upload. */
    DriftCategory["PAYLOAD_DRIFT"] = "PAYLOAD_DRIFT";
    /** Files intact but deployment structure is wrong (e.g. broken symlink). */
    DriftCategory["TOPOLOGY_DRIFT"] = "TOPOLOGY_DRIFT";
    /** Host environment changed (cPanel -> DirectAdmin, perms, owners). */
    DriftCategory["ENVIRONMENT_DRIFT"] = "ENVIRONMENT_DRIFT";
    /** Execution environment broken (missing extensions, no DB conn). */
    DriftCategory["RUNTIME_DRIFT"] = "RUNTIME_DRIFT";
    DriftCategory["INFRASTRUCTURE_DRIFT"] = "INFRASTRUCTURE_DRIFT";
})(DriftCategory || (exports.DriftCategory = DriftCategory = {}));
var ObjectType;
(function (ObjectType) {
    ObjectType["FILE"] = "FILE";
    ObjectType["DIRECTORY"] = "DIRECTORY";
    ObjectType["SYMLINK"] = "SYMLINK";
    ObjectType["UNKNOWN"] = "UNKNOWN";
})(ObjectType || (exports.ObjectType = ObjectType = {}));
var FileClassification;
(function (FileClassification) {
    FileClassification["EXPECTED"] = "EXPECTED";
    FileClassification["MISSING"] = "MISSING";
    FileClassification["MODIFIED"] = "MODIFIED";
    FileClassification["EXTRA"] = "EXTRA";
    FileClassification["UNKNOWN"] = "UNKNOWN";
    FileClassification["PROTECTED"] = "PROTECTED";
    FileClassification["GENERATED"] = "GENERATED";
    FileClassification["USER_DATA"] = "USER_DATA";
    FileClassification["SYSTEM"] = "SYSTEM";
})(FileClassification || (exports.FileClassification = FileClassification = {}));

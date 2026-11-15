/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : Plugin Manager / Persistence Ledger
 * File           : db.ts
 * Version        : 1.1.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers Ltd
 * Created Date   : 2026-09-29
 * Last Modified  : 2026-10-18
 * Classification : COMMERCIAL | INTERNAL
 *
 * Governance:
 * - Corporate Policy Governed
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
 * Copyright (c) 2026 Air Roofers Ltd. All Rights Reserved.
 ******************************************************************************/

import path from 'path';
import fs from 'fs';
import { __t } from '@ugondu/shared';

const dataDir = path.resolve(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'plugins.json');
const receiptsPath = path.join(dataDir, 'plugin_receipts.json');

/**
 * @interface TenantPluginLedger
 * @description Corporate Policy Governed interface implementation for TenantPluginLedger
 * @classification SOVEREIGN
 */
export interface TenantPluginLedger {
    [tenantId: string]: string[];
}

export interface PluginExecutionReceipt {
    pluginName: string;
    pluginDigest: string;
    signerKeyId: string;
    version: string;
    capabilities: string[];
    tenantId: string;
    executedAt: string;
    receiptHash: string;
}

class PluginDatabase {
    private data: TenantPluginLedger = {};
    private receipts: PluginExecutionReceipt[] = [];

    constructor() {
        this.load();
    }

    private load() {
        if (fs.existsSync(dbPath)) {
            try {
                this.data = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
            } catch {
                this.data = {};
            }
        }
        if (fs.existsSync(receiptsPath)) {
            try {
                const parsed = JSON.parse(fs.readFileSync(receiptsPath, 'utf-8'));
                this.receipts = Array.isArray(parsed) ? parsed : [];
            } catch {
                this.receipts = [];
            }
        }
    }

    private save() {
        try {
            if (!fs.existsSync(dataDir)) {
                fs.mkdirSync(dataDir, { recursive: true });
            }
            fs.writeFileSync(dbPath, JSON.stringify(this.data, null, 2));
        } catch {
            // Retain in-memory state if disk is read-only
        }
    }

    private saveReceipts() {
        try {
            if (!fs.existsSync(dataDir)) {
                fs.mkdirSync(dataDir, { recursive: true });
            }
            fs.writeFileSync(receiptsPath, JSON.stringify(this.receipts.slice(-500), null, 2));
        } catch {
            // Retain in-memory receipts if disk is read-only
        }
    }

    getActivePlugins(tenantId: string): string[] {
        if (!tenantId || typeof tenantId !== 'string') {
            return [];
        }
        return this.data[tenantId] ? [...this.data[tenantId]] : [];
    }

    activatePlugin(tenantId: string, pluginName: string) {
        if (!tenantId || typeof tenantId !== 'string') {
            throw new Error(__t('messages.error.invalid_tenant_id_plugin_activation'));
        }
        if (!this.data[tenantId]) {
            this.data[tenantId] = [];
        }
        if (!this.data[tenantId].includes(pluginName)) {
            this.data[tenantId].push(pluginName);
            this.save();
        }
    }

    deactivatePlugin(tenantId: string, pluginName: string) {
        if (this.data[tenantId]) {
            this.data[tenantId] = this.data[tenantId].filter(p => p !== pluginName);
            this.save();
        }
    }

    recordExecutionReceipt(receipt: PluginExecutionReceipt): void {
        this.receipts.push(receipt);
        this.saveReceipts();
    }

    getExecutionReceipts(tenantId?: string): PluginExecutionReceipt[] {
        if (!tenantId) {
            return [...this.receipts];
        }
        return this.receipts.filter(r => r.tenantId === tenantId);
    }
}

export const pluginStore = new PluginDatabase();

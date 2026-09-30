-- /******************************************************************************
--  * Project        : Ugondu — Universal Deployment Intelligence Platform
--  * Module         : Server / Shared / Database Schema
--  * File           : schema.sql
--  * Version        : 1.0.0
--  * Author         : Server & Cryptography Engineering Authority
--  * Organization   : Air Roofers Ltd
--  * Created Date   : 2026-09-30
--  * Last Modified  : 2026-09-30
--  * Classification : ENTERPRISE | INTERNAL
--  *
--  * Governance:
--  * - Security Reviewed
--  * - Architecture Controlled
--  * - Protocol Frozen
--  * - Modularization Enforced
--  *
--  * Standards:
--  * - ISO 27001
--  * - SOC 2
--  * - OWASP ASVS
--  * - NIST
--  *
--  * Signatures:
--  * - Architecture Authority
--  * - Security Authority
--  * - Governance Authority
--  * - Deployment Authority
--  *
--  * Copyright (c) 2026 Air Roofers Ltd. All Rights Reserved.
--  ******************************************************************************/

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE workspaces (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE environments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE targets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    environment_id UUID NOT NULL REFERENCES environments(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    config JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE recipes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
    content JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE execution_states (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    state VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE plugins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    version VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE trust_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    key_id VARCHAR(255) NOT NULL,
    public_key TEXT NOT NULL,
    status VARCHAR(50) NOT NULL,
    purpose VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE service_identities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    subject VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE audit_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    action VARCHAR(255) NOT NULL,
    actor VARCHAR(255) NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Row-level security (RLS) policies by tenant_id
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_workspaces ON workspaces FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_projects ON projects FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

ALTER TABLE environments ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_environments ON environments FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

ALTER TABLE targets ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_targets ON targets FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_transactions ON transactions FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_recipes ON recipes FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

ALTER TABLE execution_states ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_execution_states ON execution_states FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

ALTER TABLE plugins ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_plugins ON plugins FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

ALTER TABLE trust_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_trust_keys ON trust_keys FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

ALTER TABLE service_identities ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_service_identities ON service_identities FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_audit_events ON audit_events FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

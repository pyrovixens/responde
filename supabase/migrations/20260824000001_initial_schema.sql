-- ============================================================================
-- RESPONDE — Sistema Integrado de Despacho de Emergencias
-- Migration: 001_initial_schema.sql
-- Description: Core Schema, Enums, Tables, Sequences and Triggers
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. ENUMS
-- ----------------------------------------------------------------------------

DO $$ BEGIN
    CREATE TYPE user_role AS ENUM (
        'SUPER_ADMIN',
        'ADMIN',
        'DISPATCHER',
        'SUPERVISOR',
        'UNIT_LEADER',
        'RESPONDER',
        'VIEWER'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE incident_status AS ENUM (
        'NEW',
        'VALIDATING',
        'DISPATCHED',
        'RESPONDING',
        'ON_SCENE',
        'CONTROLLED',
        'CLOSED',
        'CANCELLED',
        'FALSE_ALARM',
        'TRANSFERRED',
        'ESCALATED'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE incident_priority AS ENUM (
        'P1', -- Crítica / Inmediata (Riesgo vital)
        'P2', -- Alta / Urgente
        'P3', -- Media / Ordinaria
        'P4'  -- Baja / Administrativa
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE unit_status AS ENUM (
        'IN_SERVICE',    -- Disponible en cuartel/base
        'DISPATCHED',    -- Despachada
        'EN_ROUTE',      -- En ruta hacia la escena
        'ON_SCENE',      -- En el lugar
        'RETURNING',     -- Regresando a base
        'OUT_OF_SERVICE',-- Fuera de servicio
        'MAINTENANCE'    -- En mantenimiento
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE personnel_status AS ENUM (
        'ON_DUTY',
        'OFF_DUTY',
        'STANDBY',
        'RESPONDING',
        'ON_SCENE'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE notification_status AS ENUM (
        'PENDING',
        'SENT',
        'DELIVERED',
        'SEEN',
        'ACKNOWLEDGED',
        'DECLINED',
        'TIMEOUT'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE device_platform AS ENUM (
        'IOS',
        'ANDROID',
        'WEB'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ----------------------------------------------------------------------------
-- 2. ORGANIZATIONS & USERS
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    code VARCHAR(30) NOT NULL UNIQUE,
    address TEXT,
    phone VARCHAR(50),
    is_active BOOLEAN NOT NULL DEFAULT true,
    settings JSONB DEFAULT '{
        "default_ack_timeout_seconds": 45,
        "auto_escalate_supervisor": true,
        "allow_external_ingestion": true,
        "enable_sound_alerts": true
    }'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY, -- references auth.users(id) in Supabase
    email VARCHAR(255) NOT NULL UNIQUE,
    full_name VARCHAR(255) NOT NULL,
    callsign VARCHAR(50),
    phone VARCHAR(50),
    avatar_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE IF NOT EXISTS organization_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    role user_role NOT NULL DEFAULT 'RESPONDER',
    title VARCHAR(100),
    badge_number VARCHAR(50),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT unique_org_user UNIQUE (organization_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_org_members_org ON organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_members_user ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_role ON organization_members(role);

-- ----------------------------------------------------------------------------
-- 3. SECTORS, UNITS & PERSONNEL
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS sectors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(30) NOT NULL,
    description TEXT,
    polygon_geojson JSONB,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT unique_org_sector_code UNIQUE (organization_id, code)
);

CREATE INDEX IF NOT EXISTS idx_sectors_org ON sectors(organization_id);

CREATE TABLE IF NOT EXISTS unit_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(30) NOT NULL,
    category VARCHAR(50) NOT NULL DEFAULT 'FIRE', -- FIRE, RESCUE, MEDICAL, HAZMAT, COMMAND
    icon VARCHAR(50) DEFAULT 'truck',
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT unique_org_unit_type_code UNIQUE (organization_id, code)
);

CREATE TABLE IF NOT EXISTS units (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    unit_type_id UUID NOT NULL REFERENCES unit_types(id) ON DELETE RESTRICT,
    code VARCHAR(30) NOT NULL, -- e.g. B-1, R-2, Q-4, RX-3
    name VARCHAR(100) NOT NULL,
    callsign VARCHAR(50) NOT NULL,
    status unit_status NOT NULL DEFAULT 'IN_SERVICE',
    current_sector_id UUID REFERENCES sectors(id) ON DELETE SET NULL,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    last_location_update TIMESTAMPTZ,
    capacity INT DEFAULT 6,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT unique_org_unit_code UNIQUE (organization_id, code)
);

CREATE INDEX IF NOT EXISTS idx_units_org ON units(organization_id);
CREATE INDEX IF NOT EXISTS idx_units_status ON units(status);
CREATE INDEX IF NOT EXISTS idx_units_sector ON units(current_sector_id);

CREATE TABLE IF NOT EXISTS personnel (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    unit_id UUID REFERENCES units(id) ON DELETE SET NULL,
    rank VARCHAR(50),
    callsign VARCHAR(50),
    blood_type VARCHAR(10),
    certifications TEXT[] DEFAULT ARRAY[]::TEXT[],
    status personnel_status NOT NULL DEFAULT 'ON_DUTY',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT unique_org_personnel_user UNIQUE (organization_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_personnel_org ON personnel(organization_id);
CREATE INDEX IF NOT EXISTS idx_personnel_unit ON personnel(unit_id);
CREATE INDEX IF NOT EXISTS idx_personnel_status ON personnel(status);

-- ----------------------------------------------------------------------------
-- 4. DEVICES & REMOTE REVOCATION
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    device_id VARCHAR(255) NOT NULL,
    platform device_platform NOT NULL DEFAULT 'WEB',
    push_token TEXT,
    app_version VARCHAR(50),
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    revoked_at TIMESTAMPTZ,
    revoked_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    revocation_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT unique_user_device UNIQUE (user_id, device_id)
);

CREATE INDEX IF NOT EXISTS idx_devices_user ON devices(user_id);
CREATE INDEX IF NOT EXISTS idx_devices_active ON devices(is_active);

-- ----------------------------------------------------------------------------
-- 5. PROTOCOLS & INCIDENT TYPES
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS protocols (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    default_priority incident_priority NOT NULL DEFAULT 'P1',
    ack_timeout_seconds INT NOT NULL DEFAULT 45,
    suggested_unit_type_codes TEXT[] DEFAULT ARRAY[]::TEXT[],
    auto_escalate_supervisor BOOLEAN NOT NULL DEFAULT true,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT unique_org_protocol_code UNIQUE (organization_id, code)
);

CREATE INDEX IF NOT EXISTS idx_protocols_org ON protocols(organization_id);

CREATE TABLE IF NOT EXISTS protocol_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    protocol_id UUID NOT NULL REFERENCES protocols(id) ON DELETE CASCADE,
    step_order INT NOT NULL DEFAULT 1,
    title VARCHAR(150) NOT NULL,
    description TEXT,
    is_mandatory BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_protocol_steps_proto ON protocol_steps(protocol_id, step_order);

CREATE TABLE IF NOT EXISTS incident_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    protocol_id UUID REFERENCES protocols(id) ON DELETE SET NULL,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(150) NOT NULL,
    default_priority incident_priority NOT NULL DEFAULT 'P1',
    icon VARCHAR(50) DEFAULT 'flame',
    color VARCHAR(30) DEFAULT '#DC2626',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT unique_org_incident_type_code UNIQUE (organization_id, code)
);

CREATE INDEX IF NOT EXISTS idx_incident_types_org ON incident_types(organization_id);

-- ----------------------------------------------------------------------------
-- 6. INCIDENTS & DISPATCH
-- ----------------------------------------------------------------------------

-- Global atomic sequence for incident numbers
CREATE SEQUENCE IF NOT EXISTS incident_number_seq START WITH 1 INCREMENT BY 1;

CREATE TABLE IF NOT EXISTS incidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    incident_number VARCHAR(50) NOT NULL,
    external_id VARCHAR(100),
    incident_type_id UUID REFERENCES incident_types(id) ON DELETE SET NULL,
    protocol_id UUID REFERENCES protocols(id) ON DELETE SET NULL,
    priority incident_priority NOT NULL DEFAULT 'P1',
    status incident_status NOT NULL DEFAULT 'NEW',
    sector_id UUID REFERENCES sectors(id) ON DELETE SET NULL,
    location_name VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    description TEXT NOT NULL,
    caller_name VARCHAR(150),
    caller_phone VARCHAR(50),
    metadata JSONB DEFAULT '{}'::jsonb,
    dispatched_at TIMESTAMPTZ,
    controlled_at TIMESTAMPTZ,
    closed_at TIMESTAMPTZ,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT unique_org_incident_number UNIQUE (organization_id, incident_number)
);

-- Idempotency index: one external_id per organization
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_org_external_id 
    ON incidents(organization_id, external_id) 
    WHERE external_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_incidents_org_status ON incidents(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_incidents_priority ON incidents(priority);
CREATE INDEX IF NOT EXISTS idx_incidents_sector ON incidents(sector_id);
CREATE INDEX IF NOT EXISTS idx_incidents_created_at ON incidents(created_at DESC);

-- Incident Number Generator Function
CREATE OR REPLACE FUNCTION generate_incident_number()
RETURNS TRIGGER AS $$
DECLARE
    current_year TEXT;
    seq_val BIGINT;
BEGIN
    IF NEW.incident_number IS NULL OR NEW.incident_number = '' THEN
        current_year := to_char(clock_timestamp(), 'YYYY');
        seq_val := nextval('incident_number_seq');
        NEW.incident_number := 'EMG-' || current_year || '-' || lpad(seq_val::text, 6, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_generate_incident_number
    BEFORE INSERT ON incidents
    FOR EACH ROW
    EXECUTE FUNCTION generate_incident_number();

-- ----------------------------------------------------------------------------
-- 7. INCIDENT UNITS & PERSONNEL
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS incident_units (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
    unit_id UUID NOT NULL REFERENCES units(id) ON DELETE RESTRICT,
    status unit_status NOT NULL DEFAULT 'DISPATCHED',
    dispatched_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    en_route_at TIMESTAMPTZ,
    on_scene_at TIMESTAMPTZ,
    released_at TIMESTAMPTZ,
    assigned_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT unique_incident_unit UNIQUE (incident_id, unit_id)
);

CREATE INDEX IF NOT EXISTS idx_inc_units_inc ON incident_units(incident_id);
CREATE INDEX IF NOT EXISTS idx_inc_units_unit ON incident_units(unit_id);

CREATE TABLE IF NOT EXISTS incident_personnel (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
    personnel_id UUID NOT NULL REFERENCES personnel(id) ON DELETE CASCADE,
    role_in_incident VARCHAR(50) DEFAULT 'RESPONDER',
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    released_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT unique_incident_personnel UNIQUE (incident_id, personnel_id)
);

CREATE INDEX IF NOT EXISTS idx_inc_pers_inc ON incident_personnel(incident_id);
CREATE INDEX IF NOT EXISTS idx_inc_pers_pers ON incident_personnel(personnel_id);

-- ----------------------------------------------------------------------------
-- 8. DISPATCHES, NOTIFICATIONS & ACK MACHINE
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS dispatches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
    dispatched_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    notes TEXT,
    broadcast_type VARCHAR(50) DEFAULT 'SELECTIVE', -- ALL, SECTOR, UNITS, SELECTIVE
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_dispatches_incident ON dispatches(incident_id);

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dispatch_id UUID NOT NULL REFERENCES dispatches(id) ON DELETE CASCADE,
    incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    device_id UUID REFERENCES devices(id) ON DELETE SET NULL,
    status notification_status NOT NULL DEFAULT 'PENDING',
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    seen_at TIMESTAMPTZ,
    acknowledged_at TIMESTAMPTZ,
    declined_at TIMESTAMPTZ,
    timeout_at TIMESTAMPTZ,
    decline_reason TEXT,
    response_latency_ms INT, -- milliseconds between sent_at and acknowledged_at
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_notifications_disp ON notifications(dispatch_id);
CREATE INDEX IF NOT EXISTS idx_notifications_inc ON notifications(incident_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);
CREATE INDEX IF NOT EXISTS idx_notifications_pending_timeout ON notifications(status, sent_at) WHERE status IN ('PENDING', 'SENT', 'DELIVERED', 'SEEN');

-- ----------------------------------------------------------------------------
-- 9. INCIDENT EVENTS (TIMELINE) & AUDIT LOGS (APPEND-ONLY)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS incident_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,
    actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    actor_name VARCHAR(255),
    description TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_incident_events_inc ON incident_events(incident_id, created_at ASC);

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    actor_email VARCHAR(255),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_org ON audit_logs(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);

-- Prevent any modification or deletion of audit logs
CREATE OR REPLACE FUNCTION prevent_audit_log_tampering()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Audit logs are append-only. UPDATE and DELETE operations are strictly prohibited.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_prevent_audit_log_tampering
    BEFORE UPDATE OR DELETE ON audit_logs
    FOR EACH ROW
    EXECUTE FUNCTION prevent_audit_log_tampering();

-- ----------------------------------------------------------------------------
-- 10. SECURITY: API KEYS, NONCES & INTEGRATIONS
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    key_prefix VARCHAR(16) NOT NULL UNIQUE,
    key_hash VARCHAR(128) NOT NULL, -- SHA-256 hash of API Key
    secret_hash VARCHAR(128) NOT NULL, -- SHA-256 hash of API Secret
    permissions TEXT[] DEFAULT ARRAY['incidents:write', 'incidents:read']::TEXT[],
    rate_limit_per_min INT NOT NULL DEFAULT 60,
    last_used_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_api_keys_prefix ON api_keys(key_prefix);
CREATE INDEX IF NOT EXISTS idx_api_keys_org ON api_keys(organization_id);

CREATE TABLE IF NOT EXISTS api_nonces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key_prefix VARCHAR(16) NOT NULL,
    nonce VARCHAR(64) NOT NULL,
    timestamp BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT unique_nonce_per_key UNIQUE (key_prefix, nonce)
);

CREATE INDEX IF NOT EXISTS idx_api_nonces_timestamp ON api_nonces(timestamp);

-- Webhooks for external notifications
CREATE TABLE IF NOT EXISTS integration_webhooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    target_url TEXT NOT NULL,
    secret_token VARCHAR(255) NOT NULL,
    event_types TEXT[] NOT NULL DEFAULT ARRAY['incident.created', 'incident.dispatched', 'dispatch.acknowledged', 'incident.closed']::TEXT[],
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE IF NOT EXISTS webhook_deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    webhook_id UUID NOT NULL REFERENCES integration_webhooks(id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    status_code INT,
    response_body TEXT,
    success BOOLEAN NOT NULL DEFAULT false,
    attempt_count INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_webhook_deliv_hook ON webhook_deliveries(webhook_id, created_at DESC);

-- ----------------------------------------------------------------------------
-- 11. AUTOMATIC UPDATED_AT TRIGGER
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = clock_timestamp();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
    tbl text;
BEGIN
    FOR tbl IN
        SELECT table_name
        FROM information_schema.columns
        WHERE column_name = 'updated_at'
          AND table_schema = 'public'
          AND table_name != 'audit_logs'
    LOOP
        EXECUTE format('
            DROP TRIGGER IF EXISTS trg_update_timestamp_%I ON %I;
            CREATE TRIGGER trg_update_timestamp_%I
                BEFORE UPDATE ON %I
                FOR EACH ROW
                EXECUTE FUNCTION update_timestamp();
        ', tbl, tbl, tbl, tbl);
    END LOOP;
END $$;

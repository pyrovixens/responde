-- ============================================================================
-- RESPONDE — ESQUEMA COMPLETO Y MIGRACIÓN ÚNICA PARA SUPABASE
-- Ejecutar todo este script en: Supabase Dashboard > SQL Editor > New Query > Run
-- ============================================================================

-- 1. EXTENSIONES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. ENUMS
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM (
        'SUPER_ADMIN', 'ADMIN', 'DISPATCHER', 'SUPERVISOR', 'UNIT_LEADER', 'RESPONDER', 'VIEWER'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE incident_status AS ENUM (
        'NEW', 'VALIDATING', 'DISPATCHED', 'RESPONDING', 'ON_SCENE', 'CONTROLLED', 'CLOSED', 'CANCELLED', 'FALSE_ALARM', 'TRANSFERRED', 'ESCALATED'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE incident_priority AS ENUM ('P1', 'P2', 'P3', 'P4');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE unit_status AS ENUM (
        'IN_SERVICE', 'DISPATCHED', 'EN_ROUTE', 'ON_SCENE', 'RETURNING', 'OUT_OF_SERVICE', 'MAINTENANCE'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE personnel_status AS ENUM ('ON_DUTY', 'OFF_DUTY', 'STANDBY', 'RESPONDING', 'ON_SCENE');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE notification_status AS ENUM (
        'PENDING', 'SENT', 'DELIVERED', 'SEEN', 'ACKNOWLEDGED', 'DECLINED', 'TIMEOUT'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE device_platform AS ENUM ('IOS', 'ANDROID', 'WEB');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 3. TABLAS PRINCIPALES
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    code VARCHAR(30) NOT NULL UNIQUE,
    address TEXT,
    phone VARCHAR(50),
    is_active BOOLEAN NOT NULL DEFAULT true,
    settings JSONB DEFAULT '{"default_ack_timeout_seconds": 45, "auto_escalate_supervisor": true, "enable_sound_alerts": true}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY, -- references auth.users(id)
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

CREATE TABLE IF NOT EXISTS unit_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(30) NOT NULL,
    category VARCHAR(50) NOT NULL DEFAULT 'FIRE',
    icon VARCHAR(50) DEFAULT 'truck',
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT unique_org_unit_type_code UNIQUE (organization_id, code)
);

CREATE TABLE IF NOT EXISTS units (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    unit_type_id UUID NOT NULL REFERENCES unit_types(id) ON DELETE RESTRICT,
    code VARCHAR(30) NOT NULL,
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

CREATE TABLE IF NOT EXISTS protocol_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    protocol_id UUID NOT NULL REFERENCES protocols(id) ON DELETE CASCADE,
    step_order INT NOT NULL DEFAULT 1,
    title VARCHAR(150) NOT NULL,
    description TEXT,
    is_mandatory BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT unique_proto_step UNIQUE (protocol_id, step_order)
);

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

CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_org_external_id ON incidents(organization_id, external_id) WHERE external_id IS NOT NULL;

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

CREATE TABLE IF NOT EXISTS dispatches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
    dispatched_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    notes TEXT,
    broadcast_type VARCHAR(50) DEFAULT 'SELECTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

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
    response_latency_ms INT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

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

CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    key_prefix VARCHAR(16) NOT NULL UNIQUE,
    key_hash VARCHAR(128) NOT NULL,
    secret_hash VARCHAR(128) NOT NULL,
    permissions TEXT[] DEFAULT ARRAY['incidents:write', 'incidents:read']::TEXT[],
    rate_limit_per_min INT NOT NULL DEFAULT 60,
    last_used_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- 4. TRIGGERS Y FUNCIONES
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

DROP TRIGGER IF EXISTS trg_generate_incident_number ON incidents;
CREATE TRIGGER trg_generate_incident_number
    BEFORE INSERT ON incidents
    FOR EACH ROW
    EXECUTE FUNCTION generate_incident_number();

-- 5. HABILITAR ROW LEVEL SECURITY (RLS)
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE sectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE unit_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE units ENABLE ROW LEVEL SECURITY;
ALTER TABLE personnel ENABLE ROW LEVEL SECURITY;
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE protocols ENABLE ROW LEVEL SECURITY;
ALTER TABLE protocol_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE incident_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE incident_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE dispatches ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE incident_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- Políticas RLS Permisivas para Acceso Operacional
DROP POLICY IF EXISTS "public_read_orgs" ON organizations;
CREATE POLICY "public_read_orgs" ON organizations FOR SELECT USING (true);

DROP POLICY IF EXISTS "public_read_sectors" ON sectors;
CREATE POLICY "public_read_sectors" ON sectors FOR SELECT USING (true);

DROP POLICY IF EXISTS "public_read_unit_types" ON unit_types;
CREATE POLICY "public_read_unit_types" ON unit_types FOR SELECT USING (true);

DROP POLICY IF EXISTS "public_read_units" ON units;
CREATE POLICY "public_read_units" ON units FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "public_read_protocols" ON protocols;
CREATE POLICY "public_read_protocols" ON protocols FOR SELECT USING (true);

DROP POLICY IF EXISTS "public_read_protocol_steps" ON protocol_steps;
CREATE POLICY "public_read_protocol_steps" ON protocol_steps FOR SELECT USING (true);

DROP POLICY IF EXISTS "public_read_incident_types" ON incident_types;
CREATE POLICY "public_read_incident_types" ON incident_types FOR SELECT USING (true);

DROP POLICY IF EXISTS "authenticated_incidents" ON incidents;
CREATE POLICY "authenticated_incidents" ON incidents FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_incident_units" ON incident_units;
CREATE POLICY "authenticated_incident_units" ON incident_units FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_dispatches" ON dispatches;
CREATE POLICY "authenticated_dispatches" ON dispatches FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_notifications" ON notifications;
CREATE POLICY "authenticated_notifications" ON notifications FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_incident_events" ON incident_events;
CREATE POLICY "authenticated_incident_events" ON incident_events FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_devices" ON devices;
CREATE POLICY "authenticated_devices" ON devices FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_audit_logs" ON audit_logs;
CREATE POLICY "authenticated_audit_logs" ON audit_logs FOR ALL USING (true) WITH CHECK (true);

-- 6. DATOS INICIALES (SEED DATA)
INSERT INTO organizations (id, name, slug, code, address, phone)
VALUES (
    'a0000000-0000-0000-0000-000000000001',
    'Cuerpo de Bomberos & Rescate Metropolitano',
    'cuerpo-bomberos-central',
    'CBC-01',
    'Av. Libertador Bernardo O''Higgins 1450, Santiago, Chile',
    '+56 2 2698 1234'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO sectors (id, organization_id, name, code, description)
VALUES 
    ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Sector 1 - Norte Residencial', 'SEC-NOR', 'Zona habitacional de alta densidad'),
    ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Sector 2 - Centro Cívico / Comercial', 'SEC-CEN', 'Zona gubernamental y comercial'),
    ('b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'Sector 3 - Sur Industrial', 'SEC-SUR', 'Parques logísticos y manufactura'),
    ('b0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'Sector 4 - Oriente / Cordillera', 'SEC-ORI', 'Interfaz urbano-forestal')
ON CONFLICT (id) DO NOTHING;

INSERT INTO unit_types (id, organization_id, name, code, category, icon)
VALUES
    ('c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Bomba de Ataque / Extinción', 'BOMBA', 'FIRE', 'flame'),
    ('c0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Rescate Vehicular y Pesado', 'RESCATE', 'RESCUE', 'shield-alert'),
    ('c0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'Escala Mecánica Telescópica', 'ESCALA', 'FIRE', 'chevrons-up'),
    ('c0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'Ambulancia / Soporte Vital', 'AMBULANCIA', 'MEDICAL', 'activity'),
    ('c0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', 'Materiales Peligrosos HazMat', 'HAZMAT', 'HAZMAT', 'alert-triangle'),
    ('c0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000001', 'Puesto de Mando y Control', 'COMANDO', 'COMMAND', 'radio')
ON CONFLICT (id) DO NOTHING;

INSERT INTO units (id, organization_id, unit_type_id, code, name, callsign, status, current_sector_id, latitude, longitude, capacity)
VALUES
    ('d0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'B-1', 'Bomba Urbana Primera', 'BOMBA-1', 'IN_SERVICE', 'b0000000-0000-0000-0000-000000000002', -33.4429, -70.6539, 6),
    ('d0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'B-2', 'Bomba Forestal Segunda', 'BOMBA-2', 'IN_SERVICE', 'b0000000-0000-0000-0000-000000000004', -33.4250, -70.6120, 6),
    ('d0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002', 'R-1', 'Unidad Rescate Técnico', 'RESCATE-1', 'IN_SERVICE', 'b0000000-0000-0000-0000-000000000001', -33.4180, -70.6650, 5),
    ('d0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002', 'RX-3', 'Rescate Pesado Vehicular', 'RESCATE-PESADO', 'IN_SERVICE', 'b0000000-0000-0000-0000-000000000003', -33.4890, -70.6720, 4),
    ('d0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000003', 'Q-4', 'Escala Telescópica 30m', 'ESCALA-4', 'IN_SERVICE', 'b0000000-0000-0000-0000-000000000002', -33.4410, -70.6480, 4),
    ('d0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000004', 'M-1', 'Ambulancia Avanzada SAMU', 'MED-1', 'IN_SERVICE', 'b0000000-0000-0000-0000-000000000001', -33.4210, -70.6510, 3),
    ('d0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000005', 'H-1', 'Unidad HazMat Químicos', 'HAZMAT-1', 'IN_SERVICE', 'b0000000-0000-0000-0000-000000000003', -33.4950, -70.6800, 4),
    ('d0000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000006', 'K-1', 'Puesto de Mando Móvil', 'COMANDO-1', 'IN_SERVICE', 'b0000000-0000-0000-0000-000000000002', -33.4380, -70.6500, 4)
ON CONFLICT (id) DO NOTHING;

INSERT INTO protocols (id, organization_id, code, name, description, default_priority, ack_timeout_seconds, suggested_unit_type_codes, auto_escalate_supervisor)
VALUES
    ('e0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'INCENDIO_ESTRUCTURAL', 'Incendio Estructural / Fuego en Edificación', 'Alarma por fuego declarado', 'P1', 45, ARRAY['BOMBA', 'ESCALA', 'RESCATE']::TEXT[], true),
    ('e0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'ACCIDENTE_VEHICULAR', 'Accidente Vehicular con Atrapados (10-4)', 'Colisión con personas atrapadas', 'P1', 45, ARRAY['RESCATE', 'AMBULANCIA', 'BOMBA']::TEXT[], true),
    ('e0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'RESCATE_AGRESTE', 'Rescate en Montaña / Agreste / Desnivel', 'Búsqueda y extracción', 'P2', 60, ARRAY['RESCATE', 'COMANDO']::TEXT[], true),
    ('e0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'DERRAME_QUIMICO', 'Materiales Peligrosos / HazMat (10-5)', 'Fuga de gas o químicos', 'P1', 45, ARRAY['HAZMAT', 'BOMBA', 'COMANDO']::TEXT[], true),
    ('e0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', 'EMERGENCIA_MEDICA', 'Emergencia Médica de Soporte Vital', 'Paro cardiorrespiratorio o trauma', 'P1', 30, ARRAY['AMBULANCIA', 'RESCATE']::TEXT[], true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO protocol_steps (protocol_id, step_order, title, description, is_mandatory)
VALUES
    ('e0000000-0000-0000-0000-000000000001', 1, 'Confirmar Vías de Acceso', 'Verificar accesos libres para material mayor y viento', true),
    ('e0000000-0000-0000-0000-000000000001', 2, 'Establecer Puesto de Mando (CI)', 'Designar Comandante de Incidente y Oficial de Seguridad', true),
    ('e0000000-0000-0000-0000-000000000001', 3, 'Corte de Suministros Críticos', 'Corte preventivo y verificado de electricidad y gas', true),
    ('e0000000-0000-0000-0000-000000000001', 4, 'Búsqueda Primaria y Ventilación', 'Avance simultáneo de rescate con línea de protección', true),
    ('e0000000-0000-0000-0000-000000000001', 5, 'Abastecimiento de Agua', 'Conexión inmediata a red de grifos o cisterna nodriza', true),
    ('e0000000-0000-0000-0000-000000000002', 1, 'Asegurar Zona y Tráfico', 'Posicionar unidades en ángulo de protección de 45°', true),
    ('e0000000-0000-0000-0000-000000000002', 2, 'Línea de Agua Preventiva', 'Línea presurizada con pitón cerrado lista', true),
    ('e0000000-0000-0000-0000-000000000002', 3, 'Estabilización de Vehículos', 'Acuñamiento en cuatro puntos y corte de batería', true),
    ('e0000000-0000-0000-0000-000000000002', 4, 'Extricación Hidráulica', 'Remoción de puertas/techo con cizalla y expansor', true),
    ('e0000000-0000-0000-0000-000000000002', 5, 'Inmovilización Espinal', 'Collar cervical, tabla y entrega a equipo SAMU', true)
ON CONFLICT (protocol_id, step_order) DO NOTHING;

INSERT INTO incident_types (id, organization_id, protocol_id, code, name, default_priority, icon, color)
VALUES
    ('f0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'INC_ESTRUCTURAL', 'Incendio Estructural', 'P1', 'flame', '#DC2626'),
    ('f0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000002', 'ACC_TRANSITO', 'Accidente de Tránsito con Atrapados', 'P1', 'car-crash', '#EA580C'),
    ('f0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000003', 'RESC_AGRESTE', 'Rescate en Quebrada / Montaña', 'P2', 'mountain', '#D97706'),
    ('f0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000004', 'HAZMAT_FUGA', 'Emergencia Química / Fuga de Gas', 'P1', 'alert-triangle', '#7C3AED'),
    ('f0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000005', 'MED_PCR', 'Paro Cardiorrespiratorio / Soporte Vital', 'P1', 'heart-pulse', '#E11D48')
ON CONFLICT (id) DO NOTHING;

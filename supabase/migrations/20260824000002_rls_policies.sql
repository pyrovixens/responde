-- ============================================================================
-- RESPONDE — Sistema Integrado de Despacho de Emergencias
-- Migration: 002_rls_policies.sql
-- Description: Row Level Security (RLS) Policies & RBAC Security Functions
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. SECURITY HELPER FUNCTIONS
-- ----------------------------------------------------------------------------

-- Check if current user is SUPER_ADMIN
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM organization_members
        WHERE user_id = auth.uid()
          AND role = 'SUPER_ADMIN'
          AND is_active = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Check if current user is ADMIN of a specific organization
CREATE OR REPLACE FUNCTION is_org_admin(org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    IF is_super_admin() THEN
        RETURN true;
    END IF;
    RETURN EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_id = org_id
          AND user_id = auth.uid()
          AND role IN ('ADMIN', 'SUPER_ADMIN')
          AND is_active = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Check if user has dispatch privileges (SUPER_ADMIN, ADMIN, DISPATCHER, SUPERVISOR)
CREATE OR REPLACE FUNCTION can_dispatch(org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    IF is_super_admin() THEN
        RETURN true;
    END IF;
    RETURN EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_id = org_id
          AND user_id = auth.uid()
          AND role IN ('SUPER_ADMIN', 'ADMIN', 'DISPATCHER', 'SUPERVISOR')
          AND is_active = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Check if user is member of organization
CREATE OR REPLACE FUNCTION is_org_member(org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    IF is_super_admin() THEN
        RETURN true;
    END IF;
    RETURN EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_id = org_id
          AND user_id = auth.uid()
          AND is_active = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ----------------------------------------------------------------------------
-- 2. ENABLE RLS ON ALL PUBLIC TABLES
-- ----------------------------------------------------------------------------

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
ALTER TABLE incident_personnel ENABLE ROW LEVEL SECURITY;
ALTER TABLE dispatches ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE incident_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_nonces ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- 3. PROFILES POLICIES
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;
CREATE POLICY "profiles_select_policy" ON profiles
    FOR SELECT
    USING (
        id = auth.uid() 
        OR is_super_admin()
        OR EXISTS (
            SELECT 1 FROM organization_members om1
            JOIN organization_members om2 ON om1.organization_id = om2.organization_id
            WHERE om1.user_id = auth.uid() AND om2.user_id = profiles.id
        )
    );

DROP POLICY IF EXISTS "profiles_update_policy" ON profiles;
CREATE POLICY "profiles_update_policy" ON profiles
    FOR UPDATE
    USING (id = auth.uid() OR is_super_admin())
    WITH CHECK (id = auth.uid() OR is_super_admin());

-- ----------------------------------------------------------------------------
-- 4. ORGANIZATIONS POLICIES
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "orgs_select_policy" ON organizations;
CREATE POLICY "orgs_select_policy" ON organizations
    FOR SELECT
    USING (is_org_member(id) OR is_super_admin());

DROP POLICY IF EXISTS "orgs_insert_policy" ON organizations;
CREATE POLICY "orgs_insert_policy" ON organizations
    FOR INSERT
    WITH CHECK (is_super_admin());

DROP POLICY IF EXISTS "orgs_update_policy" ON organizations;
CREATE POLICY "orgs_update_policy" ON organizations
    FOR UPDATE
    USING (is_org_admin(id))
    WITH CHECK (is_org_admin(id));

-- ----------------------------------------------------------------------------
-- 5. ORGANIZATION MEMBERS POLICIES
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "org_members_select" ON organization_members;
CREATE POLICY "org_members_select" ON organization_members
    FOR SELECT
    USING (is_org_member(organization_id) OR is_super_admin());

DROP POLICY IF EXISTS "org_members_admin_write" ON organization_members;
CREATE POLICY "org_members_admin_write" ON organization_members
    FOR ALL
    USING (is_org_admin(organization_id))
    WITH CHECK (is_org_admin(organization_id));

-- ----------------------------------------------------------------------------
-- 6. SECTORS, UNIT TYPES, UNITS & PERSONNEL
-- ----------------------------------------------------------------------------

-- Sectors
DROP POLICY IF EXISTS "sectors_select" ON sectors;
CREATE POLICY "sectors_select" ON sectors
    FOR SELECT USING (is_org_member(organization_id));

DROP POLICY IF EXISTS "sectors_admin_write" ON sectors;
CREATE POLICY "sectors_admin_write" ON sectors
    FOR ALL USING (is_org_admin(organization_id)) WITH CHECK (is_org_admin(organization_id));

-- Unit Types
DROP POLICY IF EXISTS "unit_types_select" ON unit_types;
CREATE POLICY "unit_types_select" ON unit_types
    FOR SELECT USING (is_org_member(organization_id));

DROP POLICY IF EXISTS "unit_types_admin_write" ON unit_types;
CREATE POLICY "unit_types_admin_write" ON unit_types
    FOR ALL USING (is_org_admin(organization_id)) WITH CHECK (is_org_admin(organization_id));

-- Units
DROP POLICY IF EXISTS "units_select" ON units;
CREATE POLICY "units_select" ON units
    FOR SELECT USING (is_org_member(organization_id));

DROP POLICY IF EXISTS "units_dispatcher_update" ON units;
CREATE POLICY "units_dispatcher_update" ON units
    FOR UPDATE USING (can_dispatch(organization_id)) WITH CHECK (can_dispatch(organization_id));

DROP POLICY IF EXISTS "units_admin_all" ON units;
CREATE POLICY "units_admin_all" ON units
    FOR ALL USING (is_org_admin(organization_id)) WITH CHECK (is_org_admin(organization_id));

-- Personnel
DROP POLICY IF EXISTS "personnel_select" ON personnel;
CREATE POLICY "personnel_select" ON personnel
    FOR SELECT USING (is_org_member(organization_id));

DROP POLICY IF EXISTS "personnel_self_update" ON personnel;
CREATE POLICY "personnel_self_update" ON personnel
    FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "personnel_admin_all" ON personnel;
CREATE POLICY "personnel_admin_all" ON personnel
    FOR ALL USING (is_org_admin(organization_id)) WITH CHECK (is_org_admin(organization_id));

-- ----------------------------------------------------------------------------
-- 7. DEVICES POLICIES
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "devices_user_select" ON devices;
CREATE POLICY "devices_user_select" ON devices
    FOR SELECT
    USING (
        user_id = auth.uid() 
        OR is_super_admin()
        OR EXISTS (
            SELECT 1 FROM organization_members om_admin
            JOIN organization_members om_target ON om_admin.organization_id = om_target.organization_id
            WHERE om_admin.user_id = auth.uid() 
              AND om_admin.role IN ('ADMIN', 'SUPER_ADMIN')
              AND om_target.user_id = devices.user_id
        )
    );

DROP POLICY IF EXISTS "devices_user_insert" ON devices;
CREATE POLICY "devices_user_insert" ON devices
    FOR INSERT
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "devices_update" ON devices;
CREATE POLICY "devices_update" ON devices
    FOR UPDATE
    USING (
        user_id = auth.uid()
        OR is_super_admin()
        OR EXISTS (
            SELECT 1 FROM organization_members om_admin
            JOIN organization_members om_target ON om_admin.organization_id = om_target.organization_id
            WHERE om_admin.user_id = auth.uid() 
              AND om_admin.role IN ('ADMIN', 'SUPER_ADMIN')
              AND om_target.user_id = devices.user_id
        )
    );

-- ----------------------------------------------------------------------------
-- 8. PROTOCOLS & INCIDENT TYPES
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "protocols_select" ON protocols;
CREATE POLICY "protocols_select" ON protocols
    FOR SELECT USING (is_org_member(organization_id));

DROP POLICY IF EXISTS "protocols_admin_write" ON protocols;
CREATE POLICY "protocols_admin_write" ON protocols
    FOR ALL USING (is_org_admin(organization_id)) WITH CHECK (is_org_admin(organization_id));

DROP POLICY IF EXISTS "protocol_steps_select" ON protocol_steps;
CREATE POLICY "protocol_steps_select" ON protocol_steps
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM protocols p
            WHERE p.id = protocol_steps.protocol_id
              AND is_org_member(p.organization_id)
        )
    );

DROP POLICY IF EXISTS "protocol_steps_admin_write" ON protocol_steps;
CREATE POLICY "protocol_steps_admin_write" ON protocol_steps
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM protocols p
            WHERE p.id = protocol_steps.protocol_id
              AND is_org_admin(p.organization_id)
        )
    );

DROP POLICY IF EXISTS "incident_types_select" ON incident_types;
CREATE POLICY "incident_types_select" ON incident_types
    FOR SELECT USING (is_org_member(organization_id));

DROP POLICY IF EXISTS "incident_types_admin_write" ON incident_types;
CREATE POLICY "incident_types_admin_write" ON incident_types
    FOR ALL USING (is_org_admin(organization_id)) WITH CHECK (is_org_admin(organization_id));

-- ----------------------------------------------------------------------------
-- 9. INCIDENTS & DISPATCH POLICIES (CORE)
-- ----------------------------------------------------------------------------

-- Incidents SELECT:
-- Dispatchers/Admins see all incidents in their org.
-- Responders see incidents if they are assigned to it via notification or unit assignment.
DROP POLICY IF EXISTS "incidents_select" ON incidents;
CREATE POLICY "incidents_select" ON incidents
    FOR SELECT
    USING (
        is_super_admin()
        OR can_dispatch(organization_id)
        OR (
            is_org_member(organization_id)
            AND (
                status NOT IN ('CLOSED', 'CANCELLED', 'FALSE_ALARM')
                OR EXISTS (
                    SELECT 1 FROM notifications n
                    WHERE n.incident_id = incidents.id AND n.user_id = auth.uid()
                )
            )
        )
    );

-- Incidents INSERT / UPDATE: Dispatchers & Admins
DROP POLICY IF EXISTS "incidents_insert" ON incidents;
CREATE POLICY "incidents_insert" ON incidents
    FOR INSERT
    WITH CHECK (can_dispatch(organization_id));

DROP POLICY IF EXISTS "incidents_update" ON incidents;
CREATE POLICY "incidents_update" ON incidents
    FOR UPDATE
    USING (can_dispatch(organization_id))
    WITH CHECK (can_dispatch(organization_id));

-- Incident Units
DROP POLICY IF EXISTS "incident_units_select" ON incident_units;
CREATE POLICY "incident_units_select" ON incident_units
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM incidents i
            WHERE i.id = incident_units.incident_id
              AND (is_org_member(i.organization_id) OR is_super_admin())
        )
    );

DROP POLICY IF EXISTS "incident_units_write" ON incident_units;
CREATE POLICY "incident_units_write" ON incident_units
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM incidents i
            WHERE i.id = incident_units.incident_id
              AND can_dispatch(i.organization_id)
        )
    );

-- Incident Personnel
DROP POLICY IF EXISTS "incident_personnel_select" ON incident_personnel;
CREATE POLICY "incident_personnel_select" ON incident_personnel
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM incidents i
            WHERE i.id = incident_personnel.incident_id
              AND (is_org_member(i.organization_id) OR is_super_admin())
        )
    );

DROP POLICY IF EXISTS "incident_personnel_write" ON incident_personnel;
CREATE POLICY "incident_personnel_write" ON incident_personnel
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM incidents i
            WHERE i.id = incident_personnel.incident_id
              AND can_dispatch(i.organization_id)
        )
    );

-- Dispatches
DROP POLICY IF EXISTS "dispatches_select" ON dispatches;
CREATE POLICY "dispatches_select" ON dispatches
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM incidents i
            WHERE i.id = dispatches.incident_id
              AND (is_org_member(i.organization_id) OR is_super_admin())
        )
    );

DROP POLICY IF EXISTS "dispatches_insert" ON dispatches;
CREATE POLICY "dispatches_insert" ON dispatches
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM incidents i
            WHERE i.id = dispatches.incident_id
              AND can_dispatch(i.organization_id)
        )
    );

-- ----------------------------------------------------------------------------
-- 10. NOTIFICATIONS & ACK MACHINE POLICIES
-- ----------------------------------------------------------------------------

-- Responders can view their own notifications. Dispatchers can view all notifications for their org incidents.
DROP POLICY IF EXISTS "notifications_select" ON notifications;
CREATE POLICY "notifications_select" ON notifications
    FOR SELECT
    USING (
        user_id = auth.uid()
        OR is_super_admin()
        OR EXISTS (
            SELECT 1 FROM incidents i
            WHERE i.id = notifications.incident_id
              AND can_dispatch(i.organization_id)
        )
    );

DROP POLICY IF EXISTS "notifications_insert" ON notifications;
CREATE POLICY "notifications_insert" ON notifications
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM incidents i
            WHERE i.id = notifications.incident_id
              AND can_dispatch(i.organization_id)
        )
    );

-- Responders can update ONLY their own notification (to mark DELIVERED, SEEN, ACKNOWLEDGED, DECLINED)
DROP POLICY IF EXISTS "notifications_update" ON notifications;
CREATE POLICY "notifications_update" ON notifications
    FOR UPDATE
    USING (
        user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM incidents i
            WHERE i.id = notifications.incident_id
              AND can_dispatch(i.organization_id)
        )
    )
    WITH CHECK (
        user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM incidents i
            WHERE i.id = notifications.incident_id
              AND can_dispatch(i.organization_id)
        )
    );

-- ----------------------------------------------------------------------------
-- 11. TIMELINE EVENTS & AUDIT LOGS
-- ----------------------------------------------------------------------------

-- Incident Events
DROP POLICY IF EXISTS "incident_events_select" ON incident_events;
CREATE POLICY "incident_events_select" ON incident_events
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM incidents i
            WHERE i.id = incident_events.incident_id
              AND (is_org_member(i.organization_id) OR is_super_admin())
        )
    );

DROP POLICY IF EXISTS "incident_events_insert" ON incident_events;
CREATE POLICY "incident_events_insert" ON incident_events
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM incidents i
            WHERE i.id = incident_events.incident_id
              AND is_org_member(i.organization_id)
        )
    );

-- Audit Logs (SELECT: Org Admin & Supervisors; INSERT: All Authenticated members)
DROP POLICY IF EXISTS "audit_logs_select" ON audit_logs;
CREATE POLICY "audit_logs_select" ON audit_logs
    FOR SELECT
    USING (
        is_super_admin()
        OR (
            organization_id IS NOT NULL 
            AND EXISTS (
                SELECT 1 FROM organization_members
                WHERE organization_id = audit_logs.organization_id
                  AND user_id = auth.uid()
                  AND role IN ('ADMIN', 'SUPER_ADMIN', 'SUPERVISOR')
                  AND is_active = true
            )
        )
    );

DROP POLICY IF EXISTS "audit_logs_insert" ON audit_logs;
CREATE POLICY "audit_logs_insert" ON audit_logs
    FOR INSERT
    WITH CHECK (true); -- Triggers and backend services insert audit events

-- ----------------------------------------------------------------------------
-- 12. API KEYS, NONCES & WEBHOOKS
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "api_keys_admin" ON api_keys;
CREATE POLICY "api_keys_admin" ON api_keys
    FOR ALL
    USING (is_org_admin(organization_id))
    WITH CHECK (is_org_admin(organization_id));

DROP POLICY IF EXISTS "webhooks_admin" ON integration_webhooks;
CREATE POLICY "webhooks_admin" ON integration_webhooks
    FOR ALL
    USING (is_org_admin(organization_id))
    WITH CHECK (is_org_admin(organization_id));

DROP POLICY IF EXISTS "webhook_deliveries_admin" ON webhook_deliveries;
CREATE POLICY "webhook_deliveries_admin" ON webhook_deliveries
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM integration_webhooks w
            WHERE w.id = webhook_deliveries.webhook_id
              AND is_org_admin(w.organization_id)
        )
    );

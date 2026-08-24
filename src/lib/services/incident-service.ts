import { createAdminClient } from '@/lib/supabase/admin';
import { Incident, IncidentStatus, IncidentPriority } from '@/types/database';
import { CreateIncidentInput } from '@/types/emergency';
import { logAuditEvent } from './audit-service';

export class IncidentService {
  /**
   * Creates an incident or returns an existing one if idempotency key (org_id + external_id) matches.
   */
  static async createIncident(
    input: CreateIncidentInput,
    actor?: { id?: string; email?: string }
  ): Promise<{ incident: Incident; isExisting: boolean }> {
    const supabase = createAdminClient();
    const orgId = input.organization_id || 'a0000000-0000-0000-0000-000000000001'; // Default demo org if omitted

    // 1. Idempotency check: if external_id is present, look for existing record
    if (input.external_id) {
      const { data: existingIncident } = await supabase
        .from('incidents')
        .select('*, incident_type:incident_types(*), protocol:protocols(*), sector:sectors(*)')
        .eq('organization_id', orgId)
        .eq('external_id', input.external_id)
        .maybeSingle();

      if (existingIncident) {
        return { incident: existingIncident as Incident, isExisting: true };
      }
    }

    // 2. Resolve protocol and priority defaults if protocol_id or incident_type_id is provided
    let protocolId = input.protocol_id || null;
    let priority: IncidentPriority = input.priority || 'P1';

    if (input.incident_type_id && !protocolId) {
      const { data: incType } = await supabase
        .from('incident_types')
        .select('protocol_id, default_priority')
        .eq('id', input.incident_type_id)
        .maybeSingle();

      if (incType) {
        protocolId = incType.protocol_id;
        if (!input.priority) priority = incType.default_priority;
      }
    }

    // 3. Insert incident
    const { data: newIncident, error: insertError } = await supabase
      .from('incidents')
      .insert({
        organization_id: orgId,
        external_id: input.external_id || null,
        incident_type_id: input.incident_type_id || null,
        protocol_id: protocolId,
        priority: priority,
        status: 'NEW' as IncidentStatus,
        sector_id: input.sector_id || null,
        location_name: input.location_name,
        address: input.address,
        latitude: input.latitude || null,
        longitude: input.longitude || null,
        description: input.description,
        caller_name: input.caller_name || null,
        caller_phone: input.caller_phone || null,
        metadata: input.metadata || {},
        created_by: actor?.id || null,
      })
      .select('*, incident_type:incident_types(*), protocol:protocols(*), sector:sectors(*)')
      .single();

    if (insertError || !newIncident) {
      throw new Error(`Failed to create incident: ${insertError?.message || 'Unknown database error'}`);
    }

    // 4. Record Incident Timeline Event
    await supabase.from('incident_events').insert({
      incident_id: newIncident.id,
      event_type: 'INCIDENT_CREATED',
      actor_id: actor?.id || null,
      actor_name: actor?.email || 'Sistema de Despacho',
      description: `Incidente ${newIncident.incident_number} creado con prioridad ${newIncident.priority}. Ubicación: ${newIncident.location_name}`,
      metadata: { initial_status: 'NEW', priority: newIncident.priority },
    });

    // 5. Audit Log
    await logAuditEvent({
      organization_id: orgId,
      actor_id: actor?.id,
      actor_email: actor?.email,
      action: 'CREATE_INCIDENT',
      entity_type: 'incidents',
      entity_id: newIncident.id,
      new_values: newIncident,
    });

    return { incident: newIncident as Incident, isExisting: false };
  }

  /**
   * Retrieves all incidents for an organization with full details and related assignments.
   */
  static async getIncidents(orgId: string = 'a0000000-0000-0000-0000-000000000001'): Promise<Incident[]> {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('incidents')
      .select(`
        *,
        incident_type:incident_types(*),
        protocol:protocols(
          *,
          steps:protocol_steps(*)
        ),
        sector:sectors(*),
        units:incident_units(
          *,
          unit:units(*)
        ),
        dispatches:dispatches(
          *,
          notifications:notifications(
            *,
            user:profiles(*)
          )
        ),
        events:incident_events(*)
      `)
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[IncidentService] Error getting incidents:', error);
      return [];
    }

    return (data || []) as Incident[];
  }

  /**
   * Retrieves single incident by ID.
   */
  static async getIncidentById(incidentId: string): Promise<Incident | null> {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('incidents')
      .select(`
        *,
        incident_type:incident_types(*),
        protocol:protocols(
          *,
          steps:protocol_steps(*)
        ),
        sector:sectors(*),
        units:incident_units(
          *,
          unit:units(*)
        ),
        dispatches:dispatches(
          *,
          notifications:notifications(
            *,
            user:profiles(*)
          )
        ),
        events:incident_events(*)
      `)
      .eq('id', incidentId)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return data as Incident;
  }

  /**
   * Updates incident status (e.g. DISPATCHED, RESPONDING, ON_SCENE, CONTROLLED, CLOSED).
   */
  static async updateStatus(
    incidentId: string,
    newStatus: IncidentStatus,
    actor?: { id?: string; email?: string },
    notes?: string
  ): Promise<Incident | null> {
    const supabase = createAdminClient();

    const updatePayload: Record<string, unknown> = {
      status: newStatus,
      updated_by: actor?.id || null,
    };

    const now = new Date().toISOString();
    if (newStatus === 'DISPATCHED') updatePayload.dispatched_at = now;
    if (newStatus === 'CONTROLLED') updatePayload.controlled_at = now;
    if (['CLOSED', 'CANCELLED', 'FALSE_ALARM'].includes(newStatus)) updatePayload.closed_at = now;

    const { data: updated, error } = await supabase
      .from('incidents')
      .update(updatePayload)
      .eq('id', incidentId)
      .select('*, incident_type:incident_types(*), protocol:protocols(*)')
      .single();

    if (error || !updated) {
      throw new Error(`Failed to update incident status: ${error?.message}`);
    }

    // Record Event
    await supabase.from('incident_events').insert({
      incident_id: incidentId,
      event_type: 'STATUS_CHANGED',
      actor_id: actor?.id || null,
      actor_name: actor?.email || 'Despachador',
      description: `Estado cambiado a ${newStatus}.${notes ? ` Nota: ${notes}` : ''}`,
      metadata: { new_status: newStatus, notes },
    });

    // Audit Log
    await logAuditEvent({
      organization_id: updated.organization_id,
      actor_id: actor?.id,
      actor_email: actor?.email,
      action: 'CHANGE_STATUS',
      entity_type: 'incidents',
      entity_id: incidentId,
      new_values: { status: newStatus, notes },
    });

    return updated as Incident;
  }
}

import { createAdminClient } from '@/lib/supabase/admin';
import { Dispatch, IncidentUnit, Notification } from '@/types/database';
import { DispatchExecutionInput } from '@/types/emergency';
import { logAuditEvent } from './audit-service';

export class DispatchService {
  /**
   * Executes a dispatch for an incident: links units, finds responders, creates notifications with SENT timestamp.
   */
  static async executeDispatch(
    input: DispatchExecutionInput,
    actor?: { id?: string; email?: string }
  ): Promise<{
    dispatch: Dispatch;
    assignedUnits: IncidentUnit[];
    notifications: Notification[];
  }> {
    const supabase = createAdminClient();

    // 1. Verify incident exists
    const { data: incident, error: incError } = await supabase
      .from('incidents')
      .select('id, organization_id, incident_number, priority, status, protocol:protocols(*)')
      .eq('id', input.incident_id)
      .single();

    if (incError || !incident) {
      throw new Error(`Incident not found: ${input.incident_id}`);
    }

    const now = new Date().toISOString();

    // 2. Create dispatch record
    const { data: dispatch, error: dispError } = await supabase
      .from('dispatches')
      .insert({
        incident_id: input.incident_id,
        dispatched_by: actor?.id || null,
        notes: input.notes || 'Despacho operacional inmediato',
        broadcast_type: 'SELECTIVE',
      })
      .select('*')
      .single();

    if (dispError || !dispatch) {
      throw new Error(`Failed to create dispatch: ${dispError?.message}`);
    }

    // 3. Assign units & update unit statuses
    const assignedUnits: IncidentUnit[] = [];
    for (const unitId of input.unit_ids) {
      // Upsert incident_units
      const { data: incUnit } = await supabase
        .from('incident_units')
        .upsert(
          {
            incident_id: input.incident_id,
            unit_id: unitId,
            status: 'DISPATCHED',
            dispatched_at: now,
            assigned_by: actor?.id || null,
            notes: input.notes || null,
          },
          { onConflict: 'incident_id,unit_id' }
        )
        .select('*, unit:units(*)')
        .single();

      if (incUnit) {
        assignedUnits.push(incUnit as IncidentUnit);
      }

      // Update unit current status in units table
      await supabase
        .from('units')
        .update({ status: 'DISPATCHED', updated_at: now })
        .eq('id', unitId);
    }

    // 4. Update Incident status to DISPATCHED if in initial states
    if (['NEW', 'VALIDATING'].includes(incident.status)) {
      await supabase
        .from('incidents')
        .update({ status: 'DISPATCHED', dispatched_at: now })
        .eq('id', input.incident_id);
    }

    // 5. Discover responders (Personnel on-duty or members of the organization)
    const { data: members } = await supabase
      .from('organization_members')
      .select('user_id, role, profile:profiles(*)')
      .eq('organization_id', incident.organization_id)
      .eq('is_active', true)
      .in('role', ['RESPONDER', 'UNIT_LEADER', 'DISPATCHER', 'SUPERVISOR']);

    const targetUserIds = new Set<string>();

    if (input.personnel_ids && input.personnel_ids.length > 0) {
      input.personnel_ids.forEach((id) => targetUserIds.add(id));
    } else if (members && members.length > 0) {
      members.forEach((m) => targetUserIds.add(m.user_id));
    }

    // If no specific users found, include actor or dummy fallback responder
    if (targetUserIds.size === 0 && actor?.id) {
      targetUserIds.add(actor.id);
    }

    // 6. Create Notifications for each recipient with initial status 'SENT'
    const notifications: Notification[] = [];
    for (const userId of targetUserIds) {
      // Find active device for this user if available
      const { data: device } = await supabase
        .from('devices')
        .select('id')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('last_seen_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const { data: notif } = await supabase
        .from('notifications')
        .insert({
          dispatch_id: dispatch.id,
          incident_id: input.incident_id,
          user_id: userId,
          device_id: device?.id || null,
          status: 'SENT',
          sent_at: now,
        })
        .select('*, user:profiles(*)')
        .single();

      if (notif) {
        notifications.push(notif as Notification);
      }
    }

    // 7. Timeline Event
    const unitCodes = assignedUnits.map((u) => u.unit?.code || u.unit_id).join(', ');
    await supabase.from('incident_events').insert({
      incident_id: input.incident_id,
      event_type: 'UNITS_DISPATCHED',
      actor_id: actor?.id || null,
      actor_name: actor?.email || 'Central de Despacho',
      description: `Despacho emitido. Unidades asignadas: [${unitCodes}]. Notificaciones enviadas a ${notifications.length} respondedores.`,
      metadata: {
        units: input.unit_ids,
        recipients_count: notifications.length,
      },
    });

    // 8. Audit Log
    await logAuditEvent({
      organization_id: incident.organization_id,
      actor_id: actor?.id,
      actor_email: actor?.email,
      action: 'DISPATCH_UNIT',
      entity_type: 'dispatches',
      entity_id: dispatch.id,
      new_values: {
        incident_id: input.incident_id,
        unit_ids: input.unit_ids,
        recipients_count: notifications.length,
      },
    });

    return {
      dispatch: dispatch as Dispatch,
      assignedUnits,
      notifications,
    };
  }
}

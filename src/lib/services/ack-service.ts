import { createAdminClient } from '@/lib/supabase/admin';
import { Notification } from '@/types/database';
import { AckNotificationInput } from '@/types/emergency';
import { logAuditEvent } from './audit-service';

export class AckService {
  /**
   * Processes responder action on an emergency dispatch notification (SEEN, ACKNOWLEDGED, DECLINED).
   */
  static async processAck(
    input: AckNotificationInput,
    actor?: { id?: string; email?: string }
  ): Promise<Notification> {
    const supabase = createAdminClient();

    // 1. Fetch notification
    const { data: notification, error: notifError } = await supabase
      .from('notifications')
      .select('*, user:profiles(*), incident:incidents(*)')
      .eq('id', input.notification_id)
      .single();

    if (notifError || !notification) {
      throw new Error(`Notification not found: ${input.notification_id}`);
    }

    const now = new Date();
    const nowIso = now.toISOString();

    const updatePayload: Record<string, unknown> = {
      updated_at: nowIso,
    };

    if (input.device_id) {
      updatePayload.device_id = input.device_id;
    }

    let eventDescription = '';
    let eventType = '';
    const responderName = notification.user?.full_name || notification.user?.callsign || actor?.email || 'Respondedor';

    if (input.action === 'SEEN') {
      if (!['ACKNOWLEDGED', 'DECLINED'].includes(notification.status)) {
        updatePayload.status = 'SEEN';
        updatePayload.seen_at = nowIso;
      }
    } else if (input.action === 'ACKNOWLEDGED') {
      updatePayload.status = 'ACKNOWLEDGED';
      updatePayload.acknowledged_at = nowIso;

      // Calculate latency
      if (notification.sent_at) {
        const sentTime = new Date(notification.sent_at).getTime();
        const latencyMs = Math.max(0, now.getTime() - sentTime);
        updatePayload.response_latency_ms = latencyMs;
        const latencySec = (latencyMs / 1000).toFixed(1);
        eventDescription = `🚨 CONFIRMACIÓN: ${responderName} aceptó el despacho (Tiempo de respuesta: ${latencySec}s)`;
      } else {
        eventDescription = `🚨 CONFIRMACIÓN: ${responderName} aceptó el despacho`;
      }
      eventType = 'DISPATCH_ACKNOWLEDGED';

      // Update incident to RESPONDING if currently DISPATCHED
      if (notification.incident?.status === 'DISPATCHED') {
        await supabase
          .from('incidents')
          .update({ status: 'RESPONDING' })
          .eq('id', notification.incident_id);
      }
    } else if (input.action === 'DECLINED') {
      updatePayload.status = 'DECLINED';
      updatePayload.declined_at = nowIso;
      updatePayload.decline_reason = input.decline_reason || 'No disponible para responder';
      eventType = 'DISPATCH_DECLINED';
      eventDescription = `⚠️ RECHAZADO: ${responderName} no puede responder. Motivo: ${updatePayload.decline_reason}`;
    }

    // 2. Update notification row
    const { data: updated, error: updateError } = await supabase
      .from('notifications')
      .update(updatePayload)
      .eq('id', input.notification_id)
      .select('*, user:profiles(*), incident:incidents(*)')
      .single();

    if (updateError || !updated) {
      throw new Error(`Failed to update notification: ${updateError?.message}`);
    }

    // 3. Record Incident Event if ACK or DECLINE
    if (eventType) {
      await supabase.from('incident_events').insert({
        incident_id: notification.incident_id,
        event_type: eventType,
        actor_id: actor?.id || notification.user_id,
        actor_name: responderName,
        description: eventDescription,
        metadata: {
          notification_id: input.notification_id,
          latency_ms: updatePayload.response_latency_ms || null,
          decline_reason: updatePayload.decline_reason || null,
        },
      });

      // 4. Audit Log
      await logAuditEvent({
        organization_id: notification.incident?.organization_id,
        actor_id: actor?.id || notification.user_id,
        actor_email: actor?.email || notification.user?.email,
        action: eventType,
        entity_type: 'notifications',
        entity_id: input.notification_id,
        new_values: updatePayload,
      });
    }

    return updated as Notification;
  }
}

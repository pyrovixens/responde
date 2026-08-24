import { createAdminClient } from '@/lib/supabase/admin';
import { logAuditEvent } from './audit-service';

export interface TimeoutEscalationResult {
  evaluatedCount: number;
  timedOutCount: number;
  escalatedNotifications: Array<{
    id: string;
    incident_id: string;
    incident_number: string;
    user_name: string;
    timeout_seconds: number;
  }>;
}

export class EscalationService {
  /**
   * Evaluates pending notifications against protocol timeout thresholds and triggers escalation.
   */
  static async evaluateTimeouts(orgId: string = 'a0000000-0000-0000-0000-000000000001'): Promise<TimeoutEscalationResult> {
    const supabase = createAdminClient();
    const now = new Date();
    const nowIso = now.toISOString();

    // 1. Fetch pending notifications for active incidents
    const { data: pendingNotifications, error } = await supabase
      .from('notifications')
      .select(`
        id,
        status,
        sent_at,
        created_at,
        incident_id,
        user_id,
        user:profiles(id, full_name, callsign, email),
        incident:incidents(
          id,
          incident_number,
          organization_id,
          status,
          protocol:protocols(ack_timeout_seconds, auto_escalate_supervisor)
        )
      `)
      .in('status', ['PENDING', 'SENT', 'DELIVERED', 'SEEN'])
      .not('sent_at', 'is', null);

    if (error || !pendingNotifications) {
      console.error('[EscalationService] Error fetching pending notifications:', error);
      return { evaluatedCount: 0, timedOutCount: 0, escalatedNotifications: [] };
    }

    const escalatedNotifications: TimeoutEscalationResult['escalatedNotifications'] = [];

    const notifs = (pendingNotifications as unknown as Array<{
      id: string;
      status: string;
      sent_at: string | null;
      created_at: string;
      incident_id: string;
      user_id: string;
      user?: { id?: string; full_name?: string | null; callsign?: string | null; email?: string | null } | null;
      incident?: {
        id?: string;
        incident_number?: string;
        organization_id?: string;
        status?: string;
        protocol?: { ack_timeout_seconds?: number; auto_escalate_supervisor?: boolean } | null;
      } | null;
    }>) || [];

    for (const notif of notifs) {
      const sentTime = notif.sent_at ? new Date(notif.sent_at).getTime() : new Date(notif.created_at).getTime();
      const elapsedSeconds = Math.floor((now.getTime() - sentTime) / 1000);

      // Default timeout: 45s unless configured in protocol
      const timeoutThreshold = notif.incident?.protocol?.ack_timeout_seconds || 45;

      if (elapsedSeconds >= timeoutThreshold) {
        // Mark as TIMEOUT
        await supabase
          .from('notifications')
          .update({
            status: 'TIMEOUT',
            timeout_at: nowIso,
            updated_at: nowIso,
          })
          .eq('id', notif.id);

        const responderName = notif.user?.full_name || notif.user?.callsign || notif.user?.email || 'Respondedor';
        const incNum = notif.incident?.incident_number || 'EMG';

        // Add incident timeline event
        await supabase.from('incident_events').insert({
          incident_id: notif.incident_id,
          event_type: 'ACK_TIMEOUT_ESCALATED',
          actor_name: 'Motor de Escalamiento',
          description: `⚠️ TIMEOUT: ${responderName} no confirmó en el tiempo límite (${timeoutThreshold}s). Alerta escalada al supervisor/despachador.`,
          metadata: {
            notification_id: notif.id,
            elapsed_seconds: elapsedSeconds,
            timeout_threshold: timeoutThreshold,
          },
        });

        // Record Audit Log
        await logAuditEvent({
          organization_id: notif.incident?.organization_id || orgId,
          action: 'TIMEOUT_ESCALATION',
          entity_type: 'notifications',
          entity_id: notif.id,
          new_values: {
            status: 'TIMEOUT',
            elapsed_seconds: elapsedSeconds,
            timeout_threshold: timeoutThreshold,
          },
        });

        escalatedNotifications.push({
          id: notif.id,
          incident_id: notif.incident_id,
          incident_number: incNum,
          user_name: responderName,
          timeout_seconds: timeoutThreshold,
        });
      }
    }

    return {
      evaluatedCount: pendingNotifications.length,
      timedOutCount: escalatedNotifications.length,
      escalatedNotifications,
    };
  }
}

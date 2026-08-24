import { createAdminClient } from '@/lib/supabase/admin';
import { AuditLog } from '@/types/database';

export interface LogAuditParams {
  organization_id?: string | null;
  actor_id?: string | null;
  actor_email?: string | null;
  action: string;
  entity_type: string;
  entity_id?: string | null;
  old_values?: Record<string, unknown> | null;
  new_values?: Record<string, unknown> | null;
  ip_address?: string | null;
  user_agent?: string | null;
}

export async function logAuditEvent(params: LogAuditParams): Promise<AuditLog | null> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('audit_logs')
      .insert({
        organization_id: params.organization_id || null,
        actor_id: params.actor_id || null,
        actor_email: params.actor_email || null,
        action: params.action,
        entity_type: params.entity_type,
        entity_id: params.entity_id || null,
        old_values: params.old_values || null,
        new_values: params.new_values || null,
        ip_address: params.ip_address || null,
        user_agent: params.user_agent || null,
      })
      .select('*')
      .single();

    if (error) {
      console.error('[AuditService] Failed to insert audit log:', error);
      return null;
    }

    return data as AuditLog;
  } catch (err) {
    console.error('[AuditService] Unexpected error recording audit event:', err);
    return null;
  }
}

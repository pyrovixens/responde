import { createAdminClient } from '@/lib/supabase/admin';
import { Device, DevicePlatform } from '@/types/database';
import { logAuditEvent } from './audit-service';

export interface RegisterDeviceInput {
  userId: string;
  deviceId: string;
  platform: DevicePlatform;
  pushToken?: string;
  appVersion?: string;
}

export class DeviceService {
  /**
   * Registers or updates a responder's device.
   */
  static async registerDevice(input: RegisterDeviceInput): Promise<Device> {
    const supabase = createAdminClient();
    const now = new Date().toISOString();

    const { data: existing } = await supabase
      .from('devices')
      .select('*')
      .eq('user_id', input.userId)
      .eq('device_id', input.deviceId)
      .maybeSingle();

    if (existing) {
      if (existing.revoked_at && !existing.is_active) {
        throw new Error('Este dispositivo ha sido revocado por un administrador y no puede ser re-registrado sin autorización.');
      }

      const { data: updated, error } = await supabase
        .from('devices')
        .update({
          platform: input.platform,
          push_token: input.pushToken || existing.push_token,
          app_version: input.appVersion || existing.app_version,
          is_active: true,
          last_seen_at: now,
          updated_at: now,
        })
        .eq('id', existing.id)
        .select('*')
        .single();

      if (error || !updated) {
        throw new Error(`Failed to update device: ${error?.message}`);
      }

      return updated as Device;
    }

    const { data: created, error } = await supabase
      .from('devices')
      .insert({
        user_id: input.userId,
        device_id: input.deviceId,
        platform: input.platform,
        push_token: input.pushToken || null,
        app_version: input.appVersion || null,
        is_active: true,
        last_seen_at: now,
      })
      .select('*')
      .single();

    if (error || !created) {
      throw new Error(`Failed to register device: ${error?.message}`);
    }

    return created as Device;
  }

  /**
   * Remotely revokes a device (e.g. lost phone, stolen hardware, decommissioned responder).
   */
  static async revokeDevice(
    deviceId: string,
    adminActor: { id: string; email?: string },
    reason: string = 'Dispositivo extraviado o revocado por administrador'
  ): Promise<Device> {
    const supabase = createAdminClient();
    const now = new Date().toISOString();

    const { data: revoked, error } = await supabase
      .from('devices')
      .update({
        is_active: false,
        revoked_at: now,
        revoked_by: adminActor.id,
        revocation_reason: reason,
        updated_at: now,
      })
      .eq('id', deviceId)
      .select('*, user:profiles(*)')
      .single();

    if (error || !revoked) {
      throw new Error(`Failed to revoke device: ${error?.message}`);
    }

    // Record Audit Log
    await logAuditEvent({
      actor_id: adminActor.id,
      actor_email: adminActor.email,
      action: 'REVOKE_DEVICE',
      entity_type: 'devices',
      entity_id: deviceId,
      new_values: { is_active: false, revoked_at: now, reason },
    });

    return revoked as Device;
  }

  /**
   * Lists devices for an organization.
   */
  static async listOrganizationDevices(orgId: string = 'a0000000-0000-0000-0000-000000000001'): Promise<Device[]> {
    const supabase = createAdminClient();

    const { data: members } = await supabase
      .from('organization_members')
      .select('user_id')
      .eq('organization_id', orgId);

    if (!members || members.length === 0) return [];

    const userIds = members.map((m) => m.user_id);
    const { data: devices, error } = await supabase
      .from('devices')
      .select('*, user:profiles(*)')
      .in('user_id', userIds)
      .order('last_seen_at', { ascending: false });

    if (error) {
      console.error('[DeviceService] Error fetching org devices:', error);
      return [];
    }

    return (devices || []) as Device[];
  }
}

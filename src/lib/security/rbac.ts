import { UserRole } from '@/types/database';

export type Permission =
  | 'incident:create'
  | 'incident:read_all'
  | 'incident:read_assigned'
  | 'incident:update_status'
  | 'incident:close'
  | 'dispatch:create'
  | 'dispatch:ack'
  | 'units:manage'
  | 'units:update_status'
  | 'personnel:manage'
  | 'protocols:manage'
  | 'devices:revoke'
  | 'audit:read'
  | 'api_keys:manage'
  | 'settings:manage';

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  SUPER_ADMIN: [
    'incident:create',
    'incident:read_all',
    'incident:read_assigned',
    'incident:update_status',
    'incident:close',
    'dispatch:create',
    'dispatch:ack',
    'units:manage',
    'units:update_status',
    'personnel:manage',
    'protocols:manage',
    'devices:revoke',
    'audit:read',
    'api_keys:manage',
    'settings:manage',
  ],
  ADMIN: [
    'incident:create',
    'incident:read_all',
    'incident:read_assigned',
    'incident:update_status',
    'incident:close',
    'dispatch:create',
    'dispatch:ack',
    'units:manage',
    'units:update_status',
    'personnel:manage',
    'protocols:manage',
    'devices:revoke',
    'audit:read',
    'api_keys:manage',
    'settings:manage',
  ],
  DISPATCHER: [
    'incident:create',
    'incident:read_all',
    'incident:read_assigned',
    'incident:update_status',
    'incident:close',
    'dispatch:create',
    'units:update_status',
    'audit:read',
  ],
  SUPERVISOR: [
    'incident:create',
    'incident:read_all',
    'incident:read_assigned',
    'incident:update_status',
    'incident:close',
    'dispatch:create',
    'units:update_status',
    'audit:read',
  ],
  UNIT_LEADER: [
    'incident:read_assigned',
    'units:update_status',
    'dispatch:ack',
  ],
  RESPONDER: [
    'incident:read_assigned',
    'dispatch:ack',
  ],
  VIEWER: [
    'incident:read_all',
  ],
};

export function hasPermission(role: UserRole | undefined | null, permission: Permission): boolean {
  if (!role) return false;
  const permissions = ROLE_PERMISSIONS[role] || [];
  return permissions.includes(permission);
}

export function canDispatchIncident(role: UserRole | undefined | null): boolean {
  return hasPermission(role, 'dispatch:create');
}

export function canManageDevices(role: UserRole | undefined | null): boolean {
  return hasPermission(role, 'devices:revoke');
}

export function canReadAuditLogs(role: UserRole | undefined | null): boolean {
  return hasPermission(role, 'audit:read');
}

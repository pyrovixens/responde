import { describe, it, expect } from 'vitest';
import {
  hasPermission,
  canDispatchIncident,
  canManageDevices,
  canReadAuditLogs,
} from '@/lib/security/rbac';

describe('RBAC Authorization Matrix', () => {
  it('should grant full privileges to SUPER_ADMIN and ADMIN', () => {
    expect(canDispatchIncident('SUPER_ADMIN')).toBe(true);
    expect(canDispatchIncident('ADMIN')).toBe(true);
    expect(canManageDevices('SUPER_ADMIN')).toBe(true);
    expect(canManageDevices('ADMIN')).toBe(true);
    expect(canReadAuditLogs('SUPER_ADMIN')).toBe(true);
    expect(canReadAuditLogs('ADMIN')).toBe(true);
    expect(hasPermission('ADMIN', 'protocols:manage')).toBe(true);
  });

  it('should grant operational dispatch privileges to DISPATCHER and SUPERVISOR', () => {
    expect(canDispatchIncident('DISPATCHER')).toBe(true);
    expect(canDispatchIncident('SUPERVISOR')).toBe(true);
    expect(hasPermission('DISPATCHER', 'incident:create')).toBe(true);
    expect(hasPermission('DISPATCHER', 'incident:update_status')).toBe(true);
    expect(hasPermission('DISPATCHER', 'api_keys:manage')).toBe(false);
  });

  it('should restrict RESPONDER to only ACK and assigned incident view', () => {
    expect(canDispatchIncident('RESPONDER')).toBe(false);
    expect(canManageDevices('RESPONDER')).toBe(false);
    expect(canReadAuditLogs('RESPONDER')).toBe(false);
    expect(hasPermission('RESPONDER', 'dispatch:ack')).toBe(true);
    expect(hasPermission('RESPONDER', 'incident:read_assigned')).toBe(true);
    expect(hasPermission('RESPONDER', 'incident:read_all')).toBe(false);
  });

  it('should restrict VIEWER to read-only access', () => {
    expect(canDispatchIncident('VIEWER')).toBe(false);
    expect(hasPermission('VIEWER', 'incident:create')).toBe(false);
    expect(hasPermission('VIEWER', 'incident:read_all')).toBe(true);
  });
});

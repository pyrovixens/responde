import { IncidentPriority, IncidentStatus, UnitStatus, NotificationStatus } from './database';

export interface CreateIncidentInput {
  organization_id?: string;
  external_id?: string;
  incident_type_id?: string;
  protocol_id?: string;
  priority: IncidentPriority;
  sector_id?: string;
  location_name: string;
  address: string;
  latitude?: number;
  longitude?: number;
  description: string;
  caller_name?: string;
  caller_phone?: string;
  metadata?: Record<string, unknown>;
  requested_units?: string[]; // Array of unit codes, e.g. ["B-1", "R-1"]
}

export interface DispatchExecutionInput {
  incident_id: string;
  unit_ids: string[];
  personnel_ids?: string[];
  notes?: string;
  dispatched_by?: string;
}

export interface AckNotificationInput {
  notification_id: string;
  action: 'SEEN' | 'ACKNOWLEDGED' | 'DECLINED';
  decline_reason?: string;
  device_id?: string;
}

export interface ExternalIncidentPayload {
  external_id?: string;
  type: string; // e.g. "INCENDIO_ESTRUCTURAL"
  priority: IncidentPriority;
  sector_code?: string;
  location_name: string;
  address: string;
  latitude?: number;
  longitude?: number;
  description: string;
  caller_name?: string;
  caller_phone?: string;
  requested_units?: string[];
  metadata?: Record<string, unknown>;
}

export interface OperationalMetrics {
  active_incidents_count: number;
  p1_incidents_count: number;
  units_dispatched_count: number;
  units_available_count: number;
  average_ack_latency_ms: number;
  pending_acks_count: number;
}

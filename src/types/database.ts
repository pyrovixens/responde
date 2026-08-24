// ============================================================================
// RESPONDE — Database TypeScript Type Definitions
// ============================================================================

export type UserRole =
  | 'SUPER_ADMIN'
  | 'ADMIN'
  | 'DISPATCHER'
  | 'SUPERVISOR'
  | 'UNIT_LEADER'
  | 'RESPONDER'
  | 'VIEWER';

export type IncidentStatus =
  | 'NEW'
  | 'VALIDATING'
  | 'DISPATCHED'
  | 'RESPONDING'
  | 'ON_SCENE'
  | 'CONTROLLED'
  | 'CLOSED'
  | 'CANCELLED'
  | 'FALSE_ALARM'
  | 'TRANSFERRED'
  | 'ESCALATED';

export type IncidentPriority = 'P1' | 'P2' | 'P3' | 'P4';

export type UnitStatus =
  | 'IN_SERVICE'
  | 'DISPATCHED'
  | 'EN_ROUTE'
  | 'ON_SCENE'
  | 'RETURNING'
  | 'OUT_OF_SERVICE'
  | 'MAINTENANCE';

export type PersonnelStatus =
  | 'ON_DUTY'
  | 'OFF_DUTY'
  | 'STANDBY'
  | 'RESPONDING'
  | 'ON_SCENE';

export type NotificationStatus =
  | 'PENDING'
  | 'SENT'
  | 'DELIVERED'
  | 'SEEN'
  | 'ACKNOWLEDGED'
  | 'DECLINED'
  | 'TIMEOUT';

export type DevicePlatform = 'IOS' | 'ANDROID' | 'WEB';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  code: string;
  address: string | null;
  phone: string | null;
  is_active: boolean;
  settings: {
    default_ack_timeout_seconds: number;
    auto_escalate_supervisor: boolean;
    allow_external_ingestion: boolean;
    enable_sound_alerts: boolean;
  };
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  callsign: string | null;
  phone: string | null;
  avatar_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface OrganizationMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: UserRole;
  title: string | null;
  badge_number: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  profile?: Profile;
}

export interface Sector {
  id: string;
  organization_id: string;
  name: string;
  code: string;
  description: string | null;
  polygon_geojson: Record<string, unknown> | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UnitType {
  id: string;
  organization_id: string;
  name: string;
  code: string;
  category: 'FIRE' | 'RESCUE' | 'MEDICAL' | 'HAZMAT' | 'COMMAND';
  icon: string | null;
  created_at: string;
}

export interface Unit {
  id: string;
  organization_id: string;
  unit_type_id: string;
  code: string;
  name: string;
  callsign: string;
  status: UnitStatus;
  current_sector_id: string | null;
  latitude: number | null;
  longitude: number | null;
  last_location_update: string | null;
  capacity: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  unit_type?: UnitType;
  current_sector?: Sector;
}

export interface Personnel {
  id: string;
  organization_id: string;
  user_id: string;
  unit_id: string | null;
  rank: string | null;
  callsign: string | null;
  blood_type: string | null;
  certifications: string[];
  status: PersonnelStatus;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  profile?: Profile;
  unit?: Unit;
}

export interface Device {
  id: string;
  user_id: string;
  device_id: string;
  platform: DevicePlatform;
  push_token: string | null;
  app_version: string | null;
  is_active: boolean;
  last_seen_at: string;
  revoked_at: string | null;
  revoked_by: string | null;
  revocation_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface Protocol {
  id: string;
  organization_id: string;
  code: string;
  name: string;
  description: string | null;
  default_priority: IncidentPriority;
  ack_timeout_seconds: number;
  suggested_unit_type_codes: string[];
  auto_escalate_supervisor: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  steps?: ProtocolStep[];
}

export interface ProtocolStep {
  id: string;
  protocol_id: string;
  step_order: number;
  title: string;
  description: string | null;
  is_mandatory: boolean;
  created_at: string;
}

export interface IncidentType {
  id: string;
  organization_id: string;
  protocol_id: string | null;
  code: string;
  name: string;
  default_priority: IncidentPriority;
  icon: string;
  color: string;
  is_active: boolean;
  created_at: string;
  protocol?: Protocol;
}

export interface Incident {
  id: string;
  organization_id: string;
  incident_number: string;
  external_id: string | null;
  incident_type_id: string | null;
  protocol_id: string | null;
  priority: IncidentPriority;
  status: IncidentStatus;
  sector_id: string | null;
  location_name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  description: string;
  caller_name: string | null;
  caller_phone: string | null;
  metadata: Record<string, unknown>;
  dispatched_at: string | null;
  controlled_at: string | null;
  closed_at: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  incident_type?: IncidentType;
  protocol?: Protocol;
  sector?: Sector;
  units?: IncidentUnit[];
  dispatches?: Dispatch[];
  events?: IncidentEvent[];
}

export interface IncidentUnit {
  id: string;
  incident_id: string;
  unit_id: string;
  status: UnitStatus;
  dispatched_at: string;
  en_route_at: string | null;
  on_scene_at: string | null;
  released_at: string | null;
  assigned_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  unit?: Unit;
}

export interface IncidentPersonnel {
  id: string;
  incident_id: string;
  personnel_id: string;
  role_in_incident: string;
  assigned_at: string;
  released_at: string | null;
  created_at: string;
  personnel?: Personnel;
}

export interface Dispatch {
  id: string;
  incident_id: string;
  dispatched_by: string | null;
  notes: string | null;
  broadcast_type: string;
  created_at: string;
  notifications?: Notification[];
}

export interface Notification {
  id: string;
  dispatch_id: string;
  incident_id: string;
  user_id: string;
  device_id: string | null;
  status: NotificationStatus;
  sent_at: string | null;
  delivered_at: string | null;
  seen_at: string | null;
  acknowledged_at: string | null;
  declined_at: string | null;
  timeout_at: string | null;
  decline_reason: string | null;
  response_latency_ms: number | null;
  created_at: string;
  updated_at: string;
  user?: Profile;
  incident?: Incident;
}

export interface IncidentEvent {
  id: string;
  incident_id: string;
  event_type: string;
  actor_id: string | null;
  actor_name: string | null;
  description: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface AuditLog {
  id: string;
  organization_id: string | null;
  actor_id: string | null;
  actor_email: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface ApiKey {
  id: string;
  organization_id: string;
  name: string;
  key_prefix: string;
  key_hash: string;
  secret_hash: string;
  permissions: string[];
  rate_limit_per_min: number;
  last_used_at: string | null;
  expires_at: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
}

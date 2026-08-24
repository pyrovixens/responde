'use client';

import React, { useState } from 'react';
import {
  ShieldAlert,
  Flame,
  Truck,
  Users,
  Activity,
  CheckCircle2,
  Clock,
  Radio,
  MapPin,
} from 'lucide-react';
import {
  INITIAL_INCIDENTS,
  INITIAL_UNITS,
  INITIAL_SECTORS,
  INITIAL_PROTOCOLS,
} from '@/lib/store/emergency-store';
import { Incident, Unit, IncidentStatus, UnitStatus } from '@/types/database';
import { CreateIncidentInput } from '@/types/emergency';
import { ActiveIncidentsList } from '@/components/dispatch/ActiveIncidentsList';
import { CreateIncidentModal } from '@/components/dispatch/CreateIncidentModal';
import { IncidentDetailModal } from '@/components/dispatch/IncidentDetailModal';
import { UnitFleetStatus } from '@/components/dispatch/UnitFleetStatus';
import { TacticalMap } from '@/components/dispatch/TacticalMap';

export default function DispatchCenterPage() {
  const [incidents, setIncidents] = useState<Incident[]>(INITIAL_INCIDENTS);
  const [units, setUnits] = useState<Unit[]>(INITIAL_UNITS);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);

  // Handle New Incident Creation & Immediate Dispatch
  const handleCreateIncident = async (
    input: CreateIncidentInput,
    selectedUnitIds: string[]
  ) => {
    const now = new Date().toISOString();
    const newIncNumber = `EMG-2026-${String(incidents.length + 186).padStart(6, '0')}`;
    const matchedProtocol = INITIAL_PROTOCOLS.find((p) => p.id === input.protocol_id) || INITIAL_PROTOCOLS[0];
    const matchedSector = INITIAL_SECTORS.find((s) => s.id === input.sector_id) || INITIAL_SECTORS[0];

    // Assigned Units
    const assignedUnits = selectedUnitIds.map((uid) => {
      const u = units.find((item) => item.id === uid);
      return {
        id: `iu-${Date.now()}-${uid}`,
        incident_id: `inc-${Date.now()}`,
        unit_id: uid,
        status: 'DISPATCHED' as UnitStatus,
        dispatched_at: now,
        en_route_at: null,
        on_scene_at: null,
        released_at: null,
        assigned_by: null,
        notes: 'Despacho Inicial Operador',
        created_at: now,
        updated_at: now,
        unit: u,
      };
    });

    // Create notifications for demo responders
    const newNotifications = [
      {
        id: `notif-${Date.now()}-1`,
        dispatch_id: `disp-${Date.now()}`,
        incident_id: `inc-${Date.now()}`,
        user_id: 'usr-001',
        device_id: 'dev-001',
        status: 'SENT' as const,
        sent_at: now,
        delivered_at: now,
        seen_at: null,
        acknowledged_at: null,
        declined_at: null,
        timeout_at: null,
        decline_reason: null,
        response_latency_ms: null,
        created_at: now,
        updated_at: now,
        user: {
          id: 'usr-001',
          email: 'capitan.b1@responde.cl',
          full_name: 'Capitán Rodrigo Valenzuela',
          callsign: 'B-1 OFICIAL',
          phone: '+56 9 9123 4567',
          avatar_url: null,
          is_active: true,
          created_at: now,
          updated_at: now,
        },
      },
      {
        id: `notif-${Date.now()}-2`,
        dispatch_id: `disp-${Date.now()}`,
        incident_id: `inc-${Date.now()}`,
        user_id: 'usr-002',
        device_id: 'dev-002',
        status: 'SENT' as const,
        sent_at: now,
        delivered_at: now,
        seen_at: null,
        acknowledged_at: null,
        declined_at: null,
        timeout_at: null,
        decline_reason: null,
        response_latency_ms: null,
        created_at: now,
        updated_at: now,
        user: {
          id: 'usr-002',
          email: 'teniente.q4@responde.cl',
          full_name: 'Teniente Matías Carrasco',
          callsign: 'Q-4 MAQUINISTA',
          phone: '+56 9 8234 5678',
          avatar_url: null,
          is_active: true,
          created_at: now,
          updated_at: now,
        },
      },
    ];

    const newIncident: Incident = {
      id: `inc-${Date.now()}`,
      organization_id: 'a0000000-0000-0000-0000-000000000001',
      incident_number: newIncNumber,
      external_id: input.external_id || null,
      incident_type_id: null,
      protocol_id: matchedProtocol.id,
      priority: input.priority,
      status: 'DISPATCHED',
      sector_id: matchedSector.id,
      location_name: input.location_name,
      address: input.address,
      latitude: -33.4450 + (Math.random() - 0.5) * 0.05,
      longitude: -70.6500 + (Math.random() - 0.5) * 0.05,
      description: input.description,
      caller_name: input.caller_name || null,
      caller_phone: input.caller_phone || null,
      metadata: input.metadata || {},
      dispatched_at: now,
      controlled_at: null,
      closed_at: null,
      created_by: null,
      updated_by: null,
      created_at: now,
      updated_at: now,
      protocol: matchedProtocol,
      sector: matchedSector,
      units: assignedUnits,
      dispatches: [
        {
          id: `disp-${Date.now()}`,
          incident_id: `inc-${Date.now()}`,
          dispatched_by: null,
          notes: 'Despacho Inicial de Emergencia',
          broadcast_type: 'SELECTIVE',
          created_at: now,
          notifications: newNotifications,
        },
      ],
      events: [
        {
          id: `evt-${Date.now()}-1`,
          incident_id: `inc-${Date.now()}`,
          event_type: 'INCIDENT_CREATED',
          actor_id: null,
          actor_name: 'Despachador Central',
          description: `Incidente ${newIncNumber} creado y despachado con prioridad ${input.priority}`,
          metadata: {},
          created_at: now,
        },
      ],
    };

    // Update Incidents and Units status
    setIncidents((prev) => [newIncident, ...prev]);
    setUnits((prev) =>
      prev.map((u) =>
        selectedUnitIds.includes(u.id) ? { ...u, status: 'DISPATCHED' as UnitStatus } : u
      )
    );
  };

  // Update Status of Incident
  const handleUpdateStatus = async (
    incidentId: string,
    newStatus: IncidentStatus,
    notes?: string
  ) => {
    const now = new Date().toISOString();
    setIncidents((prev) =>
      prev.map((inc) => {
        if (inc.id === incidentId) {
          const updated = {
            ...inc,
            status: newStatus,
            updated_at: now,
            controlled_at: newStatus === 'CONTROLLED' ? now : inc.controlled_at,
            closed_at: ['CLOSED', 'CANCELLED'].includes(newStatus) ? now : inc.closed_at,
            events: [
              ...(inc.events || []),
              {
                id: `evt-${Date.now()}`,
                incident_id: incidentId,
                event_type: 'STATUS_CHANGED',
                actor_id: null,
                actor_name: 'Despachador Central',
                description: `Estado actualizado a ${newStatus}.${notes ? ` Nota: ${notes}` : ''}`,
                metadata: {},
                created_at: now,
              },
            ],
          };
          if (selectedIncident?.id === incidentId) setSelectedIncident(updated);
          return updated;
        }
        return inc;
      })
    );
  };

  // Simulate ACK on notification
  const handleTriggerSimulatedAck = async (notificationId: string) => {
    const now = new Date();
    setIncidents((prev) =>
      prev.map((inc) => {
        const hasNotif = inc.dispatches?.some((d) =>
          d.notifications?.some((n) => n.id === notificationId)
        );
        if (hasNotif) {
          const updatedDispatches = inc.dispatches?.map((disp) => ({
            ...disp,
            notifications: disp.notifications?.map((n) => {
              if (n.id === notificationId) {
                const latency = n.sent_at
                  ? now.getTime() - new Date(n.sent_at).getTime()
                  : 4500;
                return {
                  ...n,
                  status: 'ACKNOWLEDGED' as const,
                  acknowledged_at: now.toISOString(),
                  response_latency_ms: latency,
                };
              }
              return n;
            }),
          }));

          const updated = {
            ...inc,
            status: inc.status === 'DISPATCHED' ? ('RESPONDING' as IncidentStatus) : inc.status,
            dispatches: updatedDispatches,
            events: [
              ...(inc.events || []),
              {
                id: `evt-${Date.now()}`,
                incident_id: inc.id,
                event_type: 'DISPATCH_ACKNOWLEDGED',
                actor_id: null,
                actor_name: 'Respondedor de Guardia',
                description: '🚨 CONFIRMACIÓN: Respondedor confirmó despacho exitosamente.',
                metadata: {},
                created_at: now.toISOString(),
              },
            ],
          };
          if (selectedIncident?.id === inc.id) setSelectedIncident(updated);
          return updated;
        }
        return inc;
      })
    );
  };

  // Update unit status
  const handleUpdateUnitStatus = async (unitId: string, newStatus: UnitStatus) => {
    setUnits((prev) =>
      prev.map((u) => (u.id === unitId ? { ...u, status: newStatus } : u))
    );
  };

  // Operational metrics
  const activeCount = incidents.filter(
    (i) => !['CLOSED', 'CANCELLED', 'FALSE_ALARM'].includes(i.status)
  ).length;
  const p1Count = incidents.filter(
    (i) => i.priority === 'P1' && !['CLOSED', 'CANCELLED'].includes(i.status)
  ).length;
  const dispatchedUnitsCount = units.filter((u) => u.status !== 'IN_SERVICE').length;
  const availableUnitsCount = units.filter((u) => u.status === 'IN_SERVICE').length;

  return (
    <div className="flex-1 p-3 sm:p-5 flex flex-col gap-4 max-w-7xl mx-auto w-full">
      {/* Tactical KPI / Telemetry Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-dispatch-900 border border-dispatch-700/80 p-3 rounded-xl flex items-center gap-3 shadow-md">
          <div className="w-10 h-10 rounded-lg bg-emergency-950 border border-emergency-800 flex items-center justify-center text-emergency-500">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider font-mono">
              Emergencias Activas
            </div>
            <div className="text-xl font-bold text-slate-100 font-mono">{activeCount}</div>
          </div>
        </div>

        <div className="bg-dispatch-900 border border-dispatch-700/80 p-3 rounded-xl flex items-center gap-3 shadow-md">
          <div className="w-10 h-10 rounded-lg bg-emergency-950 border border-emergency-800 flex items-center justify-center text-emergency-400 animate-pulse-fast">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider font-mono">
              Prioridad P1 Vital
            </div>
            <div className="text-xl font-bold text-emergency-400 font-mono">{p1Count}</div>
          </div>
        </div>

        <div className="bg-dispatch-900 border border-dispatch-700/80 p-3 rounded-xl flex items-center gap-3 shadow-md">
          <div className="w-10 h-10 rounded-lg bg-dispatch-800 border border-dispatch-700 flex items-center justify-center text-warning-500">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider font-mono">
              Unidades Despachadas
            </div>
            <div className="text-xl font-bold text-slate-100 font-mono">{dispatchedUnitsCount}</div>
          </div>
        </div>

        <div className="bg-dispatch-900 border border-dispatch-700/80 p-3 rounded-xl flex items-center gap-3 shadow-md">
          <div className="w-10 h-10 rounded-lg bg-success-950 border border-success-800 flex items-center justify-center text-success-500">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider font-mono">
              Flota Disponible
            </div>
            <div className="text-xl font-bold text-success-400 font-mono">{availableUnitsCount}</div>
          </div>
        </div>
      </div>

      {/* Main Operations Grid: Incidents & Map */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 min-h-[480px]">
        {/* Left Column: Active Incidents Stream (7 cols) */}
        <div className="lg:col-span-7 flex flex-col h-full">
          <ActiveIncidentsList
            incidents={incidents}
            onSelectIncident={(inc) => setSelectedIncident(inc)}
            onOpenCreateModal={() => setIsCreateModalOpen(true)}
          />
        </div>

        {/* Right Column: Tactical Map (5 cols) */}
        <div className="lg:col-span-5 flex flex-col h-full min-h-[380px]">
          <TacticalMap
            incidents={incidents.filter((i) => !['CLOSED', 'CANCELLED'].includes(i.status))}
            units={units}
            sectors={INITIAL_SECTORS}
            onSelectIncident={(inc) => setSelectedIncident(inc)}
          />
        </div>
      </div>

      {/* Bottom Row: Apparatus Fleet Status */}
      <div>
        <UnitFleetStatus
          units={units}
          onUpdateUnitStatus={handleUpdateUnitStatus}
        />
      </div>

      {/* Modals */}
      <CreateIncidentModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        protocols={INITIAL_PROTOCOLS}
        sectors={INITIAL_SECTORS}
        units={units}
        onSubmit={handleCreateIncident}
      />

      <IncidentDetailModal
        incident={selectedIncident}
        onClose={() => setSelectedIncident(null)}
        onUpdateStatus={handleUpdateStatus}
        onUpdateUnitStatus={handleUpdateUnitStatus}
        onTriggerSimulatedAck={handleTriggerSimulatedAck}
      />
    </div>
  );
}

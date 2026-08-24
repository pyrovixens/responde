'use client';

import React, { useState } from 'react';
import {
  ShieldAlert,
  Flame,
  Clock,
  MapPin,
  Truck,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  Filter,
  Eye,
} from 'lucide-react';
import { Incident, IncidentPriority, IncidentStatus } from '@/types/database';

interface ActiveIncidentsListProps {
  incidents: Incident[];
  onSelectIncident: (incident: Incident) => void;
  onOpenCreateModal: () => void;
}

export function ActiveIncidentsList({
  incidents,
  onSelectIncident,
  onOpenCreateModal,
}: ActiveIncidentsListProps) {
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ACTIVE');

  // Filter incidents
  const filteredIncidents = incidents.filter((inc) => {
    if (priorityFilter !== 'ALL' && inc.priority !== priorityFilter) return false;
    if (statusFilter === 'ACTIVE') {
      return !['CLOSED', 'CANCELLED', 'FALSE_ALARM'].includes(inc.status);
    }
    if (statusFilter !== 'ALL' && inc.status !== statusFilter) return false;
    return true;
  });

  const getPriorityBadge = (p: IncidentPriority) => {
    switch (p) {
      case 'P1':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold font-mono bg-emergency-950 text-emergency-400 border border-emergency-700 animate-pulse-fast">
            P1 CRÍTICA
          </span>
        );
      case 'P2':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold font-mono bg-warning-950 text-warning-400 border border-warning-700">
            P2 ALTA
          </span>
        );
      case 'P3':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold font-mono bg-dispatch-800 text-slate-300 border border-dispatch-600">
            P3 MEDIA
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold font-mono bg-dispatch-850 text-slate-400 border border-dispatch-700">
            P4 BAJA
          </span>
        );
    }
  };

  const getStatusBadge = (s: IncidentStatus) => {
    switch (s) {
      case 'NEW':
      case 'VALIDATING':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-warning-950 text-warning-400 border border-warning-800">
            VALIDANDO
          </span>
        );
      case 'DISPATCHED':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emergency-950 text-emergency-400 border border-emergency-800">
            DESPACHADA
          </span>
        );
      case 'RESPONDING':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-success-950 text-success-400 border border-success-800">
            EN RUTA
          </span>
        );
      case 'ON_SCENE':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-950 text-blue-400 border border-blue-800">
            EN LA ESCENA
          </span>
        );
      case 'CONTROLLED':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-950 text-indigo-400 border border-indigo-800">
            CONTROLADO
          </span>
        );
      case 'CLOSED':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-dispatch-800 text-slate-400 border border-dispatch-700">
            CERRADO
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-dispatch-800 text-slate-300">
            {s}
          </span>
        );
    }
  };

  return (
    <div className="bg-dispatch-900 border border-dispatch-700 rounded-xl shadow-lg flex flex-col h-full overflow-hidden">
      {/* Header & Quick Action */}
      <div className="p-3.5 sm:p-4 bg-dispatch-850 border-b border-dispatch-700 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Flame className="w-5 h-5 text-emergency-500" />
          <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider font-mono">
            Emergencias Activas ({filteredIncidents.length})
          </h2>
        </div>

        <button
          onClick={onOpenCreateModal}
          className="px-3.5 py-1.5 rounded-lg bg-emergency-600 hover:bg-emergency-500 text-white font-bold text-xs tracking-wider flex items-center gap-1.5 shadow hover:shadow-emergency-700/50 transition-all uppercase"
        >
          <ShieldAlert className="w-4 h-4" />
          <span>Nuevo Despacho</span>
        </button>
      </div>

      {/* Filters Bar */}
      <div className="px-3.5 py-2 bg-dispatch-950/60 border-b border-dispatch-700/60 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-1.5">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-slate-400 text-[11px] font-semibold">Prioridad:</span>
          {['ALL', 'P1', 'P2', 'P3'].map((p) => (
            <button
              key={p}
              onClick={() => setPriorityFilter(p)}
              className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold transition-colors ${
                priorityFilter === p
                  ? 'bg-dispatch-700 text-white border border-dispatch-500'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-dispatch-800'
              }`}
            >
              {p === 'ALL' ? 'TODAS' : p}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setStatusFilter(statusFilter === 'ACTIVE' ? 'ALL' : 'ACTIVE')}
            className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold transition-colors ${
              statusFilter === 'ACTIVE'
                ? 'bg-emergency-950 text-emergency-400 border border-emergency-800'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {statusFilter === 'ACTIVE' ? 'SOLO ACTIVAS' : 'TODOS ESTADOS'}
          </button>
        </div>
      </div>

      {/* Incidents Feed */}
      <div className="divide-y divide-dispatch-800 overflow-y-auto flex-1 p-2 space-y-2">
        {filteredIncidents.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-xs">
            <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-slate-600" />
            <p className="font-semibold">No hay incidentes activos en este momento</p>
            <p className="text-[11px] text-slate-600 mt-1">
              Las nuevas emergencias recibidas vía API o despacho aparecerán aquí en tiempo real.
            </p>
          </div>
        ) : (
          filteredIncidents.map((incident) => {
            // Count notifications and acknowledgments
            const allNotifications =
              incident.dispatches?.flatMap((d) => d.notifications || []) || [];
            const ackCount = allNotifications.filter(
              (n) => n.status === 'ACKNOWLEDGED'
            ).length;
            const totalRecipients = allNotifications.length;

            return (
              <div
                key={incident.id}
                onClick={() => onSelectIncident(incident)}
                className={`p-3.5 rounded-lg border transition-all cursor-pointer group ${
                  incident.priority === 'P1'
                    ? 'bg-dispatch-850/90 border-emergency-900/60 hover:border-emergency-500 hover:shadow-lg hover:shadow-emergency-950/50'
                    : 'bg-dispatch-850 border-dispatch-700/70 hover:border-dispatch-500'
                }`}
              >
                {/* Top Row: Incident Number, Status, Priority */}
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-sm text-slate-100 tracking-wider">
                      {incident.incident_number}
                    </span>
                    {getPriorityBadge(incident.priority)}
                    {getStatusBadge(incident.status)}
                  </div>

                  <div className="flex items-center gap-1 text-xs text-slate-400 font-mono">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    <span>
                      {new Date(incident.created_at).toLocaleTimeString('es-CL', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>

                {/* Protocol & Location */}
                <div className="mb-2">
                  <div className="text-xs font-bold text-slate-200 group-hover:text-emergency-400 transition-colors flex items-center gap-1.5">
                    <span>{incident.protocol?.name || 'Emergencia Operacional'}</span>
                  </div>
                  <div className="flex items-start gap-1.5 text-xs text-slate-400 mt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-emergency-500 flex-shrink-0 mt-0.5" />
                    <span className="truncate">
                      <strong className="text-slate-300">{incident.location_name}</strong> —{' '}
                      {incident.address}
                    </span>
                  </div>
                </div>

                {/* Bottom Row: Units & ACK Status */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-dispatch-800/80 text-xs">
                  {/* Units */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Truck className="w-3.5 h-3.5 text-slate-500" />
                    {incident.units && incident.units.length > 0 ? (
                      incident.units.map((u) => (
                        <span
                          key={u.id}
                          className="px-1.5 py-0.5 rounded bg-dispatch-800 border border-dispatch-700 text-[10px] font-mono font-bold text-slate-300"
                        >
                          {u.unit?.code || u.unit_id}
                        </span>
                      ))
                    ) : (
                      <span className="text-[11px] text-slate-500 italic">
                        Sin unidades asignadas
                      </span>
                    )}
                  </div>

                  {/* ACK Meter */}
                  {totalRecipients > 0 && (
                    <div className="flex items-center gap-1.5 text-[11px] font-mono">
                      <span
                        className={`font-semibold ${
                          ackCount === totalRecipients
                            ? 'text-success-400'
                            : ackCount > 0
                            ? 'text-warning-400'
                            : 'text-emergency-400'
                        }`}
                      >
                        {ackCount}/{totalRecipients} ACK (
                        {Math.round((ackCount / totalRecipients) * 100)}%)
                      </span>
                    </div>
                  )}

                  <div className="flex items-center gap-1 text-emergency-500 text-xs font-semibold group-hover:translate-x-1 transition-transform">
                    <span>Ver Mando</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

'use client';

import React, { useState } from 'react';
import {
  X,
  ShieldAlert,
  Flame,
  Clock,
  MapPin,
  Truck,
  CheckCircle2,
  AlertTriangle,
  Radio,
  Phone,
  User,
  Activity,
  CheckSquare,
  Square,
  RefreshCw,
  Send,
} from 'lucide-react';
import { Incident, IncidentStatus, UnitStatus, NotificationStatus } from '@/types/database';

interface IncidentDetailModalProps {
  incident: Incident | null;
  onClose: () => void;
  onUpdateStatus: (incidentId: string, newStatus: IncidentStatus, notes?: string) => Promise<void>;
  onUpdateUnitStatus?: (unitId: string, newStatus: UnitStatus) => Promise<void> | void;
  onTriggerSimulatedAck?: (notificationId: string) => Promise<void>;
}

export function IncidentDetailModal({
  incident,
  onClose,
  onUpdateStatus,
  onTriggerSimulatedAck,
}: IncidentDetailModalProps) {
  const [activeTab, setActiveTab] = useState<'RESPONDE' | 'APPARATUS' | 'CHECKLIST' | 'TIMELINE'>('RESPONDE');
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);

  if (!incident) return null;

  const toggleChecklistStep = (stepId: string) => {
    setCompletedSteps((prev) =>
      prev.includes(stepId) ? prev.filter((id) => id !== stepId) : [...prev, stepId]
    );
  };

  const handleStatusChange = async (newStatus: IncidentStatus) => {
    try {
      setIsUpdating(true);
      await onUpdateStatus(incident.id, newStatus);
    } finally {
      setIsUpdating(false);
    }
  };

  const allNotifications = incident.dispatches?.flatMap((d) => d.notifications || []) || [];
  const ackCount = allNotifications.filter((n) => n.status === 'ACKNOWLEDGED').length;

  const getNotifStatusBadge = (status: NotificationStatus) => {
    switch (status) {
      case 'ACKNOWLEDGED':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-success-950 text-success-400 border border-success-700">
            CONFIRMADO (ACK)
          </span>
        );
      case 'SEEN':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-950 text-blue-400 border border-blue-700">
            VISTO (SEEN)
          </span>
        );
      case 'SENT':
      case 'DELIVERED':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-warning-950 text-warning-400 border border-warning-700 animate-pulse">
            ENVIADO / TIMEOUT...
          </span>
        );
      case 'DECLINED':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emergency-950 text-emergency-400 border border-emergency-700">
            NO DISPONIBLE
          </span>
        );
      case 'TIMEOUT':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emergency-900 text-emergency-200 border border-emergency-600">
            TIMEOUT ESCALADO
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-dispatch-800 text-slate-400">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-sm overflow-y-auto">
      <div className="bg-dispatch-900 border border-dispatch-700 w-full max-w-4xl rounded-xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[94vh]">
        {/* Incident Command Header */}
        <div className="bg-dispatch-850 p-4 border-b border-dispatch-700">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded bg-emergency-600 flex items-center justify-center text-white font-bold">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-lg text-slate-100 tracking-wider">
                    {incident.incident_number}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-mono font-bold ${
                      incident.priority === 'P1'
                        ? 'bg-emergency-950 text-emergency-400 border border-emergency-700 animate-pulse-fast'
                        : 'bg-warning-950 text-warning-400 border border-warning-700'
                    }`}
                  >
                    {incident.priority} {incident.priority === 'P1' ? 'CRÍTICA' : 'ALTA'}
                  </span>
                  <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-dispatch-800 text-slate-200 border border-dispatch-600">
                    {incident.status}
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-medium">
                  {incident.protocol?.name || 'Protocolo Estándar de Emergencia'}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-dispatch-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Location & Summary Bar */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 bg-dispatch-900/80 p-2.5 rounded-lg border border-dispatch-800 text-xs">
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-emergency-500 flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-slate-200">{incident.location_name}</div>
                <div className="text-slate-400 font-mono text-[11px]">{incident.address}</div>
                {incident.sector && (
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    Sector: {incident.sector.name} ({incident.sector.code})
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col justify-between text-slate-400 text-[11px]">
              <div>
                <strong className="text-slate-300">Descripción:</strong> {incident.description}
              </div>
              {incident.caller_name && (
                <div className="mt-1 text-[10px] text-slate-400 flex items-center gap-2">
                  <span>Informante: {incident.caller_name}</span>
                  {incident.caller_phone && <span>Tel: {incident.caller_phone}</span>}
                </div>
              )}
            </div>
          </div>

          {/* Operational Status Actions */}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-dispatch-800">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">
              Comando de Estado:
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={() => handleStatusChange('RESPONDING')}
                disabled={isUpdating}
                className="px-2.5 py-1 rounded bg-success-950 hover:bg-success-900 text-success-300 border border-success-700 text-xs font-mono font-bold transition-all"
              >
                EN RUTA
              </button>
              <button
                onClick={() => handleStatusChange('ON_SCENE')}
                disabled={isUpdating}
                className="px-2.5 py-1 rounded bg-blue-950 hover:bg-blue-900 text-blue-300 border border-blue-700 text-xs font-mono font-bold transition-all"
              >
                EN LA ESCENA
              </button>
              <button
                onClick={() => handleStatusChange('CONTROLLED')}
                disabled={isUpdating}
                className="px-2.5 py-1 rounded bg-indigo-950 hover:bg-indigo-900 text-indigo-300 border border-indigo-700 text-xs font-mono font-bold transition-all"
              >
                CONTROLADO
              </button>
              <button
                onClick={() => handleStatusChange('CLOSED')}
                disabled={isUpdating}
                className="px-2.5 py-1 rounded bg-dispatch-800 hover:bg-dispatch-700 text-slate-300 border border-dispatch-600 text-xs font-mono font-bold transition-all"
              >
                CERRAR INCIDENTE
              </button>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-dispatch-700 bg-dispatch-850 px-4 gap-2 text-xs font-bold">
          <button
            onClick={() => setActiveTab('RESPONDE')}
            className={`py-2.5 px-3 border-b-2 font-mono tracking-wider transition-colors flex items-center gap-1.5 ${
              activeTab === 'RESPONDE'
                ? 'border-emergency-500 text-slate-100 bg-dispatch-800/40'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-3.5 h-3.5 text-emergency-500" />
            <span>Telemetría ACK ({ackCount}/{allNotifications.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('APPARATUS')}
            className={`py-2.5 px-3 border-b-2 font-mono tracking-wider transition-colors flex items-center gap-1.5 ${
              activeTab === 'APPARATUS'
                ? 'border-emergency-500 text-slate-100 bg-dispatch-800/40'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Truck className="w-3.5 h-3.5 text-emergency-500" />
            <span>Unidades ({incident.units?.length || 0})</span>
          </button>

          <button
            onClick={() => setActiveTab('CHECKLIST')}
            className={`py-2.5 px-3 border-b-2 font-mono tracking-wider transition-colors flex items-center gap-1.5 ${
              activeTab === 'CHECKLIST'
                ? 'border-emergency-500 text-slate-100 bg-dispatch-800/40'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <CheckSquare className="w-3.5 h-3.5 text-emergency-500" />
            <span>Protocolo & Checklist</span>
          </button>

          <button
            onClick={() => setActiveTab('TIMELINE')}
            className={`py-2.5 px-3 border-b-2 font-mono tracking-wider transition-colors flex items-center gap-1.5 ${
              activeTab === 'TIMELINE'
                ? 'border-emergency-500 text-slate-100 bg-dispatch-800/40'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-emergency-500" />
            <span>Eventos ({incident.events?.length || 0})</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-4 overflow-y-auto flex-1 space-y-4">
          {/* TAB 1: ACK Telemetry & Responders */}
          {activeTab === 'RESPONDE' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
                  Recepción de Notificaciones & Latencia de Respuesta
                </h3>
                <span className="text-[11px] font-mono text-slate-400">
                  Timeout Configurado: {incident.protocol?.ack_timeout_seconds || 45}s
                </span>
              </div>

              {allNotifications.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-xs">
                  Sin respondedores notificados en este despacho.
                </div>
              ) : (
                <div className="border border-dispatch-700 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-dispatch-800 text-slate-300 font-mono text-[11px] uppercase border-b border-dispatch-700">
                      <tr>
                        <th className="p-2.5">Respondedor</th>
                        <th className="p-2.5">Estado ACK</th>
                        <th className="p-2.5">Latencia</th>
                        <th className="p-2.5">Enviado</th>
                        <th className="p-2.5 text-right">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-dispatch-800 bg-dispatch-850">
                      {allNotifications.map((notif) => (
                        <tr key={notif.id} className="hover:bg-dispatch-800/50">
                          <td className="p-2.5">
                            <div className="font-bold text-slate-200">
                              {notif.user?.full_name || 'Respondedor'}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              {notif.user?.callsign || notif.user?.email}
                            </div>
                          </td>
                          <td className="p-2.5">{getNotifStatusBadge(notif.status)}</td>
                          <td className="p-2.5 font-mono">
                            {notif.response_latency_ms ? (
                              <span className="text-success-400 font-bold">
                                {(notif.response_latency_ms / 1000).toFixed(1)}s
                              </span>
                            ) : (
                              <span className="text-slate-500">--</span>
                            )}
                          </td>
                          <td className="p-2.5 font-mono text-slate-400 text-[11px]">
                            {notif.sent_at
                              ? new Date(notif.sent_at).toLocaleTimeString('es-CL')
                              : '--'}
                          </td>
                          <td className="p-2.5 text-right">
                            {notif.status !== 'ACKNOWLEDGED' && onTriggerSimulatedAck && (
                              <button
                                onClick={() => onTriggerSimulatedAck(notif.id)}
                                className="px-2 py-1 rounded bg-emergency-900/60 hover:bg-emergency-800 text-emergency-300 text-[10px] font-bold font-mono transition-colors"
                              >
                                Forzar ACK
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Apparatus / Units */}
          {activeTab === 'APPARATUS' && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
                Material Mayor Despachado al Incidente
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {incident.units?.map((iu) => (
                  <div
                    key={iu.id}
                    className="bg-dispatch-850 border border-dispatch-700 p-3 rounded-lg flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded bg-dispatch-800 border border-dispatch-700 flex items-center justify-center font-mono font-bold text-sm text-slate-200">
                        {iu.unit?.code || iu.unit_id}
                      </div>
                      <div>
                        <div className="font-bold text-sm text-slate-200">
                          {iu.unit?.name || 'Unidad de Rescate'}
                        </div>
                        <div className="text-xs text-slate-400 font-mono">
                          Estado: <span className="text-slate-200 font-semibold">{iu.status}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: Operational Checklist */}
          {activeTab === 'CHECKLIST' && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
                Lista de Verificación Operacional — {incident.protocol?.name}
              </h3>

              <div className="space-y-2">
                {incident.protocol?.steps?.map((step) => {
                  const isChecked = completedSteps.includes(step.id);
                  return (
                    <div
                      key={step.id}
                      onClick={() => toggleChecklistStep(step.id)}
                      className={`p-3 rounded-lg border cursor-pointer transition-all flex items-start gap-3 ${
                        isChecked
                          ? 'bg-success-950/30 border-success-800 text-slate-300'
                          : 'bg-dispatch-850 border-dispatch-700 text-slate-300 hover:border-dispatch-500'
                      }`}
                    >
                      <button type="button" className="mt-0.5 text-emergency-500">
                        {isChecked ? (
                          <CheckSquare className="w-4 h-4 text-success-500" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-500" />
                        )}
                      </button>
                      <div className="flex-1 text-xs">
                        <div className={`font-bold ${isChecked ? 'line-through text-slate-400' : 'text-slate-200'}`}>
                          {step.step_order}. {step.title}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {step.description}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 4: Events Timeline */}
          {activeTab === 'TIMELINE' && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
                Bitácora Cronológica del Incidente
              </h3>

              <div className="space-y-2 border-l-2 border-dispatch-700 pl-3 ml-2 text-xs">
                {incident.events?.map((evt) => (
                  <div key={evt.id} className="relative pb-2">
                    <div className="absolute -left-[19px] top-1 w-2.5 h-2.5 rounded-full bg-emergency-500" />
                    <div className="text-[10px] text-slate-500 font-mono">
                      {new Date(evt.created_at).toLocaleTimeString('es-CL')} — {evt.actor_name || 'Sistema'}
                    </div>
                    <div className="text-slate-200 font-medium mt-0.5">{evt.description}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-dispatch-850 px-5 py-3 border-t border-dispatch-700 flex items-center justify-between text-xs text-slate-400 font-mono">
          <span>Idempotencia ID: {incident.external_id || 'LOCAL-CAD'}</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-dispatch-700 hover:bg-dispatch-600 text-white font-semibold transition-colors"
          >
            Cerrar Vista
          </button>
        </div>
      </div>
    </div>
  );
}

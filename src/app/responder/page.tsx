'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Flame,
  Volume2,
  VolumeX,
  MapPin,
  Truck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Radio,
  Wifi,
  WifiOff,
  Navigation,
  Clock,
  CheckSquare,
  Square,
  Smartphone,
  Check,
} from 'lucide-react';
import { siren } from '@/lib/sound/siren-generator';
import { INITIAL_INCIDENTS, INITIAL_PROTOCOLS } from '@/lib/store/emergency-store';
import { NotificationStatus } from '@/types/database';

export default function ResponderMobilePage() {
  const [activeIncident, setActiveIncident] = useState(INITIAL_INCIDENTS[0]);
  const [ackState, setAckState] = useState<NotificationStatus>('SENT');
  const [isSoundActive, setIsSoundActive] = useState<boolean>(true);
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [latencySec, setLatencySec] = useState<string | null>(null);
  const [declineReason, setDeclineReason] = useState<string>('');
  const [showDeclineModal, setShowDeclineModal] = useState<boolean>(false);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('IPHONE-15-PRO-MAX-CB01');
  const [checkedSteps, setCheckedSteps] = useState<string[]>([]);
  const [timeReceived, setTimeReceived] = useState<string>('');

  useEffect(() => {
    setTimeReceived(
      new Date().toLocaleTimeString('es-CL', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    );

    // Monitor online/offline status
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Trigger siren sound alert for initial incoming dispatch
    try {
      siren.playAlarm('HILO');
      setIsSoundActive(true);
    } catch {
      // Ignored if browser requires tap gesture
    }

    return () => {
      siren.stopAlarm();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const toggleSound = () => {
    if (isSoundActive) {
      siren.stopAlarm();
      setIsSoundActive(false);
    } else {
      siren.playAlarm('HILO');
      setIsSoundActive(true);
    }
  };

  const handleAcknowledge = async () => {
    siren.stopAlarm();
    setIsSoundActive(false);
    setAckState('ACKNOWLEDGED');
    setLatencySec('4.2');

    // Call API /ack endpoint in background
    try {
      await fetch('/api/v1/ack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notification_id: '00000000-0000-0000-0000-000000000001',
          action: 'ACKNOWLEDGED',
          device_id: selectedDeviceId,
        }),
      }).catch(() => {});
    } catch {
      // Offline resilient
    }
  };

  const handleDecline = async () => {
    siren.stopAlarm();
    setIsSoundActive(false);
    setAckState('DECLINED');
    setShowDeclineModal(false);

    try {
      await fetch('/api/v1/ack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notification_id: '00000000-0000-0000-0000-000000000001',
          action: 'DECLINED',
          decline_reason: declineReason || 'No disponible',
          device_id: selectedDeviceId,
        }),
      }).catch(() => {});
    } catch {
      // Offline resilient
    }
  };

  const toggleStep = (id: string) => {
    setCheckedSteps((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const protocol = activeIncident?.protocol || INITIAL_PROTOCOLS[0];

  return (
    <div className="flex-1 bg-dispatch-950 text-slate-100 flex flex-col items-center justify-start p-2 sm:p-4 max-w-md mx-auto w-full min-h-screen selection:bg-emergency-600">
      {/* Top Status & Connectivity Bar */}
      <div className="w-full flex items-center justify-between px-3 py-2 bg-dispatch-900 border border-dispatch-700/80 rounded-xl mb-3 text-xs font-mono">
        <div className="flex items-center gap-2">
          {isOnline ? (
            <div className="flex items-center gap-1.5 text-success-400 font-bold">
              <Wifi className="w-3.5 h-3.5 animate-pulse" />
              <span>ONLINE</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-emergency-400 font-bold">
              <WifiOff className="w-3.5 h-3.5" />
              <span>OFFLINE (CACHE)</span>
            </div>
          )}
          <span className="text-slate-500">|</span>
          <span className="text-slate-400 text-[11px] truncate max-w-[120px]">
            {selectedDeviceId}
          </span>
        </div>

        <button
          onClick={toggleSound}
          className={`px-2.5 py-1 rounded flex items-center gap-1 font-bold text-xs transition-colors ${
            isSoundActive
              ? 'bg-emergency-900 text-emergency-300 border border-emergency-600 animate-pulse'
              : 'bg-dispatch-800 text-slate-400 border border-dispatch-700'
          }`}
        >
          {isSoundActive ? (
            <>
              <Volume2 className="w-3.5 h-3.5" />
              <span>SILENCIAR</span>
            </>
          ) : (
            <>
              <VolumeX className="w-3.5 h-3.5" />
              <span>SONIDO OFF</span>
            </>
          )}
        </button>
      </div>

      {/* Main Alert Card */}
      <div
        className={`w-full rounded-2xl border-2 overflow-hidden shadow-2xl transition-all ${
          ackState === 'ACKNOWLEDGED'
            ? 'bg-dispatch-900 border-success-600'
            : ackState === 'DECLINED'
            ? 'bg-dispatch-900 border-dispatch-700 opacity-90'
            : 'bg-emergency-950/40 border-emergency-600 shadow-emergency-900/40 animate-alert-flash'
        }`}
      >
        {/* Emergency Banner Header */}
        <div
          className={`p-4 text-center border-b flex flex-col items-center justify-center gap-1 ${
            ackState === 'ACKNOWLEDGED'
              ? 'bg-success-950 border-success-700 text-success-300'
              : ackState === 'DECLINED'
              ? 'bg-dispatch-800 border-dispatch-700 text-slate-400'
              : 'bg-emergency-600 text-white'
          }`}
        >
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-7 h-7 animate-bounce" />
            <span className="text-xl font-extrabold tracking-widest font-mono">
              {ackState === 'ACKNOWLEDGED'
                ? 'DESPACHO CONFIRMADO'
                : ackState === 'DECLINED'
                ? 'DESPACHO DECLINADO'
                : '🚨 ALERTA DE EMERGENCIA 🚨'}
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono font-bold tracking-wider opacity-90">
            <span>{activeIncident.incident_number}</span>
            <span>•</span>
            <span>PRIORIDAD {activeIncident.priority} CRÍTICA</span>
          </div>
        </div>

        {/* Operational Incident Details */}
        <div className="p-4 space-y-3.5 text-xs">
          {/* Protocol */}
          <div className="bg-dispatch-850 p-3 rounded-xl border border-dispatch-700/80">
            <span className="text-[10px] uppercase font-bold text-slate-400 font-mono tracking-wider block mb-1">
              TIPO DE EMERGENCIA / PROTOCOLO
            </span>
            <div className="text-sm font-extrabold text-slate-100 flex items-center gap-2">
              <Flame className="w-4 h-4 text-emergency-500 flex-shrink-0" />
              <span>{protocol.name}</span>
            </div>
          </div>

          {/* Sector & Exact Location */}
          <div className="bg-dispatch-850 p-3 rounded-xl border border-dispatch-700/80">
            <span className="text-[10px] uppercase font-bold text-slate-400 font-mono tracking-wider block mb-1">
              UBICACIÓN & SECTOR
            </span>
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-emergency-500 flex-shrink-0 mt-0.5" />
              <div>
                <div className="text-sm font-bold text-slate-100">
                  {activeIncident.location_name}
                </div>
                <div className="text-slate-300 font-mono text-xs mt-0.5">
                  {activeIncident.address}
                </div>
                {activeIncident.sector && (
                  <div className="text-[11px] text-slate-400 mt-1 font-semibold">
                    Sector: {activeIncident.sector.name}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Description & Caller */}
          <div className="bg-dispatch-850 p-3 rounded-xl border border-dispatch-700/80">
            <span className="text-[10px] uppercase font-bold text-slate-400 font-mono tracking-wider block mb-1">
              INFORMACIÓN OPERATIVA
            </span>
            <p className="text-slate-200 leading-relaxed font-medium">
              {activeIncident.description}
            </p>
          </div>

          {/* Units Dispatched */}
          <div className="bg-dispatch-850 p-3 rounded-xl border border-dispatch-700/80">
            <span className="text-[10px] uppercase font-bold text-slate-400 font-mono tracking-wider block mb-1.5 flex items-center gap-1.5">
              <Truck className="w-3.5 h-3.5 text-emergency-500" />
              MATERIAL MAYOR DESPACHADO
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {activeIncident.units?.map((u) => (
                <span
                  key={u.id}
                  className="px-2 py-1 rounded-md bg-dispatch-800 border border-dispatch-600 font-mono font-bold text-xs text-slate-200"
                >
                  🚒 {u.unit?.code || u.unit_id}
                </span>
              ))}
            </div>
          </div>

          {/* Protocol Checklist Steps */}
          {protocol.steps && protocol.steps.length > 0 && (
            <div className="bg-dispatch-850 p-3 rounded-xl border border-dispatch-700/80">
              <span className="text-[10px] uppercase font-bold text-slate-400 font-mono tracking-wider block mb-2">
                PASOS DEL PROTOCOLO (ACCIONES INMEDIATAS)
              </span>
              <div className="space-y-1.5">
                {protocol.steps.map((st) => {
                  const isChecked = checkedSteps.includes(st.id);
                  return (
                    <div
                      key={st.id}
                      onClick={() => toggleStep(st.id)}
                      className={`p-2 rounded-lg border text-xs flex items-start gap-2 cursor-pointer transition-all ${
                        isChecked
                          ? 'bg-success-950/40 border-success-800 text-slate-400 line-through'
                          : 'bg-dispatch-800 border-dispatch-700 text-slate-200'
                      }`}
                    >
                      <button type="button" className="mt-0.5 text-emergency-500">
                        {isChecked ? (
                          <CheckSquare className="w-3.5 h-3.5 text-success-500" />
                        ) : (
                          <Square className="w-3.5 h-3.5 text-slate-500" />
                        )}
                      </button>
                      <div>
                        <strong className="text-slate-200">{st.step_order}. {st.title}:</strong>{' '}
                        <span>{st.description}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Large Tactical Action Buttons */}
        <div className="p-4 bg-dispatch-900 border-t border-dispatch-800 space-y-2.5">
          {ackState === 'SENT' ? (
            <>
              {/* Massive Green ACK Button */}
              <button
                onClick={handleAcknowledge}
                className="w-full py-4 px-4 rounded-xl bg-success-600 hover:bg-success-500 active:scale-[0.98] text-white font-extrabold text-base tracking-wider shadow-lg shadow-success-950/80 transition-all flex items-center justify-center gap-2 uppercase font-mono"
              >
                <CheckCircle2 className="w-6 h-6" />
                <span>ACEPTAR DESPACHO (ACK)</span>
              </button>

              {/* Decline Button */}
              <button
                onClick={() => setShowDeclineModal(true)}
                className="w-full py-3 px-4 rounded-xl bg-dispatch-850 hover:bg-dispatch-800 active:scale-[0.98] text-slate-400 hover:text-slate-200 border border-dispatch-700 text-xs font-bold tracking-wider transition-all flex items-center justify-center gap-2 uppercase"
              >
                <XCircle className="w-4 h-4 text-emergency-500" />
                <span>NO PUEDO RESPONDER</span>
              </button>
            </>
          ) : ackState === 'ACKNOWLEDGED' ? (
            <div className="p-3 bg-success-950/80 border border-success-700 rounded-xl text-center">
              <div className="flex items-center justify-center gap-2 text-success-400 font-bold text-sm mb-1 font-mono">
                <Check className="w-5 h-5" />
                <span>RESPUESTA REGISTRADA EN CENTRAL</span>
              </div>
              <p className="text-[11px] text-slate-300">
                Confirmación enviada con latencia de <strong>{latencySec || '4.2'}s</strong>.
                Diríjase a la unidad o cuartel asignado.
              </p>
            </div>
          ) : (
            <div className="p-3 bg-dispatch-850 border border-dispatch-700 rounded-xl text-center text-slate-400 text-xs">
              <span>Ha marcado que no puede responder a este despacho.</span>
            </div>
          )}
        </div>
      </div>

      {/* Decline Reason Modal */}
      {showDeclineModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-dispatch-900 border border-dispatch-700 rounded-xl p-5 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-2 text-emergency-500 font-bold font-mono text-sm">
              <AlertTriangle className="w-5 h-5" />
              <span>MOTIVO DE NO DISPONIBILIDAD</span>
            </div>
            <p className="text-xs text-slate-400">
              Indique la razón para informar inmediatamente a la Central de Despacho:
            </p>

            <div className="space-y-2">
              {[
                'Fuera de radio urbano / Cobertura',
                'En otra emergencia activa',
                'Problema mecánico de unidad',
                'Licencia / Descanso reglamentario',
              ].map((reason) => (
                <button
                  key={reason}
                  onClick={() => setDeclineReason(reason)}
                  className={`w-full p-2.5 rounded-lg border text-left text-xs font-semibold transition-colors ${
                    declineReason === reason
                      ? 'bg-emergency-950 text-emergency-300 border-emergency-600'
                      : 'bg-dispatch-800 border-dispatch-700 text-slate-300'
                  }`}
                >
                  {reason}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowDeclineModal(false)}
                className="px-3 py-1.5 rounded text-xs text-slate-400 hover:text-slate-200"
              >
                Cancelar
              </button>
              <button
                onClick={handleDecline}
                className="px-4 py-1.5 rounded bg-emergency-600 hover:bg-emergency-500 text-white font-bold text-xs font-mono uppercase"
              >
                Confirmar Rechazo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

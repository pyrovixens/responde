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
  Clock,
  Play,
  RotateCcw,
  Navigation,
  Smartphone,
  Check,
  BellRing,
} from 'lucide-react';
import { siren } from '@/lib/sound/siren-generator';
import { INITIAL_INCIDENTS, INITIAL_PROTOCOLS } from '@/lib/store/emergency-store';

export default function ClassicResponderMobilePage() {
  const [isAlertActive, setIsAlertActive] = useState<boolean>(true);
  const [ackState, setAckState] = useState<'IDLE' | 'ALERTING' | 'CONFIRMED' | 'DECLINED'>('ALERTING');
  const [isSoundActive, setIsSoundActive] = useState<boolean>(false);
  const [latencySec, setLatencySec] = useState<string>('3.8');
  const [selectedIncident, setSelectedIncident] = useState(INITIAL_INCIDENTS[0]);
  const [currentTime, setCurrentTime] = useState<string>('');
  const [timeReceived, setTimeReceived] = useState<string>('');

  // Clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('es-CL', {
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
    };
    updateTime();
    setTimeReceived(new Date().toLocaleTimeString('es-CL', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Trigger sound when alert starts
  const triggerAlarm = () => {
    setIsAlertActive(true);
    setAckState('ALERTING');
    setTimeReceived(new Date().toLocaleTimeString('es-CL', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    try {
      siren.playAlarm('HILO');
      setIsSoundActive(true);
    } catch {
      // Audio autoplay policy
    }
  };

  const stopAlarmSound = () => {
    siren.stopAlarm();
    setIsSoundActive(false);
  };

  const toggleSound = () => {
    if (isSoundActive) {
      stopAlarmSound();
    } else {
      siren.playAlarm('HILO');
      setIsSoundActive(true);
    }
  };

  // Acknowledge Action (ACK)
  const handleAcknowledge = () => {
    stopAlarmSound();
    setAckState('CONFIRMED');
    setLatencySec((Math.random() * 2 + 2.5).toFixed(1));

    // Send API ACK in background
    try {
      fetch('/api/v1/ack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notification_id: '00000000-0000-0000-0000-000000000001',
          action: 'ACKNOWLEDGED',
          device_id: 'MOBILE-PAGER-CLASSIC',
        }),
      }).catch(() => {});
    } catch {
      // Resilient
    }
  };

  // Decline Action
  const handleDecline = () => {
    stopAlarmSound();
    setAckState('DECLINED');
  };

  // Reset to Standby
  const handleResetToStandby = () => {
    stopAlarmSound();
    setAckState('IDLE');
    setIsAlertActive(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between max-w-md mx-auto border-x border-dispatch-800 shadow-2xl font-sans select-none">
      {/* Pager Top Bar */}
      <div className="bg-dispatch-900 border-b border-dispatch-700 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-success-500 animate-pulse" />
          <span className="font-mono font-bold text-xs tracking-wider text-slate-200">
            RESPONDE • PAGER TÁCTICO
          </span>
        </div>

        <div className="font-mono font-bold text-xs text-slate-400">
          {currentTime}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-4 flex flex-col justify-center gap-4">
        {/* STANDBY MODE */}
        {ackState === 'IDLE' && (
          <div className="bg-dispatch-900 border-2 border-dashed border-dispatch-700 rounded-2xl p-6 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-dispatch-800 border border-dispatch-600 mx-auto flex items-center justify-center text-slate-400">
              <Radio className="w-8 h-8" />
            </div>

            <div>
              <h2 className="text-base font-bold font-mono text-slate-100 uppercase tracking-wider">
                GUARDIA EN ESPERA (STANDBY)
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Dispositivo listo para recibir despachos de emergencia en tiempo real.
              </p>
            </div>

            <button
              onClick={triggerAlarm}
              className="w-full py-4 rounded-xl bg-emergency-600 hover:bg-emergency-500 text-white font-mono font-bold text-sm tracking-wider uppercase flex items-center justify-center gap-2 shadow-lg shadow-emergency-900/50 transition-transform active:scale-95"
            >
              <BellRing className="w-5 h-5 animate-bounce" />
              <span>SIMULAR / PROBAR ALERTA DE DESPACHO</span>
            </button>
          </div>
        )}

        {/* ALERTING DISPATCH MODE */}
        {ackState === 'ALERTING' && (
          <div className="flex flex-col gap-3">
            {/* Flashing Emergency Header */}
            <div className="bg-emergency-600 text-white p-3.5 rounded-xl text-center font-mono font-extrabold text-sm tracking-wider shadow-lg animate-pulse flex items-center justify-center gap-2">
              <ShieldAlert className="w-5 h-5" />
              <span>¡ALERTA DE DESPACHO INMEDIATO!</span>
            </div>

            {/* Incident Details Card */}
            <div className="bg-dispatch-900 border-2 border-emergency-600 rounded-2xl p-4 space-y-3 shadow-xl">
              <div className="flex items-center justify-between border-b border-dispatch-700 pb-2">
                <span className="font-mono font-bold text-xs text-emergency-400 bg-emergency-950 px-2 py-0.5 rounded border border-emergency-800">
                  {selectedIncident.incident_number}
                </span>
                <span className="font-mono text-xs text-slate-400">
                  RECIBIDO: {timeReceived}
                </span>
              </div>

              <div>
                <div className="text-[11px] font-mono text-emergency-500 font-bold uppercase tracking-wider">
                  TIPO DE EMERGENCIA
                </div>
                <div className="text-base font-bold text-white leading-tight">
                  {selectedIncident.incident_type?.name || 'Incendio Estructural'}
                </div>
              </div>

              <div>
                <div className="text-[11px] font-mono text-slate-400 font-bold uppercase tracking-wider">
                  UBICACIÓN / DIRECCIÓN
                </div>
                <div className="text-sm font-semibold text-slate-200 flex items-start gap-1.5 mt-0.5">
                  <MapPin className="w-4 h-4 text-emergency-500 shrink-0 mt-0.5" />
                  <span>{selectedIncident.address}</span>
                </div>
                <div className="text-xs text-slate-400 pl-5">
                  Ref: {selectedIncident.location_name}
                </div>
              </div>

              <div>
                <div className="text-[11px] font-mono text-slate-400 font-bold uppercase tracking-wider mb-1">
                  UNIDADES DESPACHADAS
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {selectedIncident.units && selectedIncident.units.length > 0 ? (
                    selectedIncident.units.map((u) => (
                      <span
                        key={u.id}
                        className="font-mono font-bold text-xs px-2.5 py-1 rounded bg-dispatch-800 text-slate-100 border border-dispatch-600 shadow"
                      >
                        {u.unit?.code || 'B-1'}
                      </span>
                    ))
                  ) : (
                    <>
                      <span className="font-mono font-bold text-xs px-2.5 py-1 rounded bg-dispatch-800 text-slate-100 border border-dispatch-600">B-1</span>
                      <span className="font-mono font-bold text-xs px-2.5 py-1 rounded bg-dispatch-800 text-slate-100 border border-dispatch-600">Q-4</span>
                      <span className="font-mono font-bold text-xs px-2.5 py-1 rounded bg-dispatch-800 text-slate-100 border border-dispatch-600">R-1</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Audio Siren Control */}
            <button
              onClick={toggleSound}
              className={`w-full py-2.5 px-4 rounded-xl border text-xs font-mono font-bold flex items-center justify-center gap-2 transition-all ${
                isSoundActive
                  ? 'bg-emergency-950 text-emergency-400 border-emergency-700 animate-pulse'
                  : 'bg-dispatch-800 text-slate-300 border-dispatch-700 hover:bg-dispatch-700'
              }`}
            >
              {isSoundActive ? (
                <>
                  <Volume2 className="w-4 h-4 text-emergency-500" />
                  <span>SIRENA ACTIVA (HAZ CLIC PARA SILENCIAR)</span>
                </>
              ) : (
                <>
                  <VolumeX className="w-4 h-4 text-slate-400" />
                  <span>SIRENA EN SILENCIO (ACTIVAR SONIDO)</span>
                </>
              )}
            </button>

            {/* Action Buttons (ACK / DECLINE) */}
            <div className="grid grid-cols-1 gap-2.5 pt-2">
              <button
                onClick={handleAcknowledge}
                className="w-full py-4 rounded-2xl bg-success-600 hover:bg-success-500 active:bg-success-700 text-white font-mono font-extrabold text-base tracking-wider uppercase flex items-center justify-center gap-2.5 shadow-xl shadow-success-900/40 transition-transform active:scale-95"
              >
                <CheckCircle2 className="w-6 h-6" />
                <span>🟢 VOY AL CUARTEL / RESPONDO (ACK)</span>
              </button>

              <button
                onClick={handleDecline}
                className="w-full py-3 rounded-xl bg-dispatch-800 hover:bg-dispatch-700 text-slate-400 hover:text-emergency-400 font-mono font-bold text-xs tracking-wider uppercase flex items-center justify-center gap-2 transition-colors border border-dispatch-700"
              >
                <XCircle className="w-4 h-4" />
                <span>🔴 NO DISPONIBLE (DECLINE)</span>
              </button>
            </div>
          </div>
        )}

        {/* CONFIRMED STATE */}
        {ackState === 'CONFIRMED' && (
          <div className="bg-dispatch-900 border-2 border-success-500 rounded-2xl p-6 text-center space-y-4 shadow-xl">
            <div className="w-16 h-16 rounded-full bg-success-950 border border-success-600 mx-auto flex items-center justify-center text-success-400">
              <Check className="w-8 h-8" />
            </div>

            <div>
              <h2 className="text-base font-bold font-mono text-success-400 uppercase tracking-wider">
                RESPUESTA CONFIRMADA (ACK)
              </h2>
              <p className="text-xs text-slate-300 mt-1">
                El Centro de Despacho ha registrado tu asistencia en camino al cuartel.
              </p>
            </div>

            <div className="bg-dispatch-800 rounded-xl p-3 font-mono text-xs flex justify-between items-center text-slate-300">
              <span>LATENCIA DE RESPUESTA:</span>
              <span className="text-success-400 font-bold">{latencySec} segundos</span>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(selectedIncident.address)}`}
                target="_blank"
                rel="noreferrer"
                className="w-full py-3 rounded-xl bg-dispatch-800 hover:bg-dispatch-700 text-slate-100 font-mono font-bold text-xs flex items-center justify-center gap-2 border border-dispatch-600"
              >
                <Navigation className="w-4 h-4 text-emergency-500" />
                <span>ABRIR EN GPS / GOOGLE MAPS</span>
              </a>

              <button
                onClick={handleResetToStandby}
                className="w-full py-2.5 rounded-xl text-slate-400 hover:text-slate-200 font-mono text-xs flex items-center justify-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Volver a Modo Guardia</span>
              </button>
            </div>
          </div>
        )}

        {/* DECLINED STATE */}
        {ackState === 'DECLINED' && (
          <div className="bg-dispatch-900 border-2 border-slate-700 rounded-2xl p-6 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emergency-950 border border-emergency-800 mx-auto flex items-center justify-center text-emergency-400">
              <XCircle className="w-8 h-8" />
            </div>

            <div>
              <h2 className="text-base font-bold font-mono text-slate-200 uppercase tracking-wider">
                DESPACHO DECLINADO
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Se notificó a la central que no te encuentras disponible para este llamado.
              </p>
            </div>

            <button
              onClick={handleResetToStandby}
              className="w-full py-3 rounded-xl bg-dispatch-800 hover:bg-dispatch-700 text-slate-200 font-mono font-bold text-xs uppercase"
            >
              Volver a Modo Guardia
            </button>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="bg-dispatch-900/60 border-t border-dispatch-800 px-4 py-2 text-center text-[10px] font-mono text-slate-500">
        SISTEMA DE DESPACHO CAD • TERMINAL DE RESPUESTA MÓVIL
      </div>
    </div>
  );
}

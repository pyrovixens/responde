'use client';

import React, { useState } from 'react';
import {
  Smartphone,
  SmartphoneNfc,
  ShieldCheck,
  ShieldX,
  AlertTriangle,
  Clock,
  User,
  Plus,
  RefreshCw,
  Search,
  CheckCircle2,
} from 'lucide-react';
import { INITIAL_DEVICES } from '@/lib/store/emergency-store';
import { Device } from '@/types/database';

export default function DevicesPage() {
  const [devices, setDevices] = useState<Device[]>(INITIAL_DEVICES);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedDeviceToRevoke, setSelectedDeviceToRevoke] = useState<Device | null>(null);
  const [revocationReason, setRevocationReason] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const handleRevokeDevice = async () => {
    if (!selectedDeviceToRevoke) return;
    setIsProcessing(true);

    const now = new Date().toISOString();
    setDevices((prev) =>
      prev.map((d) =>
        d.id === selectedDeviceToRevoke.id
          ? {
              ...d,
              is_active: false,
              revoked_at: now,
              revoked_by: 'usr-admin',
              revocation_reason: revocationReason || 'Revocación manual por administrador',
              updated_at: now,
            }
          : d
      )
    );

    setIsProcessing(false);
    setSelectedDeviceToRevoke(null);
    setRevocationReason('');
  };

  const filteredDevices = devices.filter(
    (d) =>
      d.device_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.user_id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex-1 p-3 sm:p-6 max-w-7xl mx-auto w-full flex flex-col gap-4">
      {/* Header */}
      <div className="bg-dispatch-900 border border-dispatch-700 p-4 rounded-xl flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-dispatch-800 border border-dispatch-700 flex items-center justify-center text-emergency-500">
            <SmartphoneNfc className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-100 font-mono tracking-wider">
              GESTIÓN & REVOCACIÓN REMOTA DE DISPOSITIVOS
            </h1>
            <p className="text-xs text-slate-400">
              Control de hardware autorizado para recepción de alertas de despacho y tokens push
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por ID o respondedor..."
              className="bg-dispatch-800 border border-dispatch-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-emergency-500"
            />
          </div>
        </div>
      </div>

      {/* Devices Roster */}
      <div className="bg-dispatch-900 border border-dispatch-700 rounded-xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-dispatch-850 text-slate-300 font-mono text-[11px] uppercase border-b border-dispatch-700">
              <tr>
                <th className="p-3.5">Identificador de Dispositivo</th>
                <th className="p-3.5">Plataforma</th>
                <th className="p-3.5">Versión App</th>
                <th className="p-3.5">Último Heartbeat</th>
                <th className="p-3.5">Estado Operacional</th>
                <th className="p-3.5 text-right">Acción de Seguridad</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dispatch-800 bg-dispatch-900/60">
              {filteredDevices.map((device) => (
                <tr key={device.id} className="hover:bg-dispatch-850/50 transition-colors">
                  <td className="p-3.5 font-mono">
                    <div className="font-bold text-slate-100">{device.device_id}</div>
                    <div className="text-[10px] text-slate-400">Usuario ID: {device.user_id}</div>
                  </td>
                  <td className="p-3.5 font-mono font-semibold text-slate-300">
                    {device.platform}
                  </td>
                  <td className="p-3.5 font-mono text-slate-400">
                    {device.app_version || '1.0.0'}
                  </td>
                  <td className="p-3.5 font-mono text-slate-400">
                    {new Date(device.last_seen_at).toLocaleString('es-CL')}
                  </td>
                  <td className="p-3.5">
                    {device.is_active ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-success-950 text-success-400 border border-success-700 inline-flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-success-500" />
                        ACTIVO Y VINCULADO
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emergency-950 text-emergency-400 border border-emergency-700 inline-flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emergency-500" />
                        REVOCADO / BLOQUEADO
                      </span>
                    )}
                  </td>
                  <td className="p-3.5 text-right font-mono">
                    {device.is_active ? (
                      <button
                        onClick={() => setSelectedDeviceToRevoke(device)}
                        className="px-3 py-1 rounded bg-emergency-950 hover:bg-emergency-900 text-emergency-400 border border-emergency-800 font-bold text-xs transition-colors"
                      >
                        REVOCAR ACCESO
                      </button>
                    ) : (
                      <span className="text-slate-500 text-[11px]">
                        {device.revocation_reason || 'Bloqueado'}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Revocation Modal */}
      {selectedDeviceToRevoke && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-dispatch-900 border border-emergency-700 rounded-xl p-5 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-2.5 text-emergency-500 font-bold font-mono">
              <AlertTriangle className="w-6 h-6" />
              <span>REVOCACIÓN REMOTA DE DISPOSITIVO</span>
            </div>

            <p className="text-xs text-slate-300">
              ¿Está seguro de que desea revocar el dispositivo{' '}
              <strong className="font-mono text-white">{selectedDeviceToRevoke.device_id}</strong>?
              El teléfono no podrá recibir nuevas alertas de despacho ni conectarse al canal Realtime.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                Motivo de la revocación (Registrado en auditoría) *
              </label>
              <textarea
                value={revocationReason}
                onChange={(e) => setRevocationReason(e.target.value)}
                rows={2}
                placeholder="Ej. Teléfono extraviado en acto de servicio / Respondedor dado de baja"
                className="w-full bg-dispatch-800 border border-dispatch-600 rounded-lg p-2 text-xs text-slate-100 focus:outline-none focus:border-emergency-500"
                required
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setSelectedDeviceToRevoke(null)}
                className="px-3.5 py-1.5 rounded-lg text-xs text-slate-400 hover:text-slate-200"
              >
                Cancelar
              </button>
              <button
                onClick={handleRevokeDevice}
                disabled={isProcessing}
                className="px-4 py-1.5 rounded-lg bg-emergency-600 hover:bg-emergency-500 text-white font-bold text-xs font-mono uppercase"
              >
                {isProcessing ? 'Revocando...' : 'Confirmar Revocación'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
